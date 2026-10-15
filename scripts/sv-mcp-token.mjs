// Jetons d'accès MCP admin Sèvalys
//
// Prérequis : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY (ou
// SUPABASE_SERVICE_ROLE_KEY) dans le shell ou dans .env.local. À exécuter en
// local par le propriétaire uniquement, jamais déployé.
//
// Commandes :
//   npm run sv:mcp-token -- --email x@y.fr --label "Claude Code PC" [--days 90]        (simulation)
//   npm run sv:mcp-token -- --email x@y.fr --label "Claude Code PC" --days 90 --yes    (crée, affiche le jeton UNE fois)
//   npm run sv:mcp-token -- --revoke <tokenId>                                         (simulation)
//   npm run sv:mcp-token -- --revoke <tokenId> --yes                                   (révoque)
//   npm run sv:mcp-token -- --list --email x@y.fr                                      (liste, jamais les hash)
//
// La base Supabase ciblée (hostname uniquement) est affichée avant toute action.
//
// Seul le hash sha256 est stocké : le jeton n'est jamais récupérable ensuite.
// Refus : un e-mail qui n'est pas dans sv_admins. Durée : 1 à 365 jours (défaut 90).

import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEFAULT_DAYS = 90;
const MAX_DAYS = 365;

// Même formule que src/lib/server/mcp/token.ts (parité vérifiée par svMcpToken.test.ts).
export function hashTokenValue(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function generateTokenValue() {
  return `svmcp_${randomBytes(32).toString('base64url')}`;
}

export function parseArgs(argv) {
  let email = null;
  let label = null;
  let days = DEFAULT_DAYS;
  let revoke = null;
  let yes = false;
  let list = false;
  const value = (i) => {
    const v = argv[i + 1];
    return v !== undefined && !v.startsWith('--') ? v : undefined;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email') {
      const v = value(i);
      if (v !== undefined) {
        email = v.trim().toLowerCase() || null;
        i++;
      }
    } else if (a === '--label') {
      const v = value(i);
      if (v !== undefined) {
        label = v.trim() || null;
        i++;
      }
    } else if (a === '--days') {
      const v = value(i);
      if (v !== undefined) {
        days = /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= MAX_DAYS ? Number(v) : null;
        i++;
      } else days = null;
    } else if (a === '--revoke') {
      const v = value(i);
      if (v !== undefined) {
        revoke = v.trim() || null;
        i++;
      }
    } else if (a === '--yes') yes = true;
    else if (a === '--list') list = true;
  }
  return { email, label, days, revoke, yes, list, dryRun: !yes };
}

export async function createToken({ svc, email, label, days, write, now = new Date() }) {
  const addr = String(email ?? '').trim().toLowerCase();
  const name = String(label ?? '').trim();
  if (!addr || addr.length > 254 || !EMAIL_RE.test(addr)) return { status: 'invalid', wouldWrite: false };
  if (name.length < 1 || name.length > 80) return { status: 'invalid', wouldWrite: false };
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) return { status: 'invalid', wouldWrite: false };

  const admin = await svc.from('sv_admins').select('user_id').eq('email', addr).maybeSingle();
  if (admin.error) return { status: 'error', wouldWrite: false };
  if (!admin.data) return { status: 'not_admin', wouldWrite: false };

  if (!write) return { status: 'created', wouldWrite: true };

  const token = generateTokenValue();
  const expiresAt = new Date(now.getTime() + days * 86_400_000).toISOString();
  const ins = await svc
    .from('sv_mcp_tokens')
    .insert({ user_id: admin.data.user_id, token_hash: hashTokenValue(token), label: name, expires_at: expiresAt })
    .select('id')
    .single();
  if (ins.error || !ins.data) return { status: 'error', wouldWrite: true };
  return { status: 'created', wouldWrite: true, token, id: ins.data.id, expiresAt };
}

export async function revokeToken({ svc, id, write }) {
  const tokenId = String(id ?? '').trim();
  if (!tokenId) return { status: 'invalid', wouldWrite: false };
  if (!write) {
    const found = await svc.from('sv_mcp_tokens').select('id').eq('id', tokenId).maybeSingle();
    if (found.error) return { status: 'error', wouldWrite: false };
    return found.data ? { status: 'revoked', wouldWrite: true } : { status: 'not_found', wouldWrite: false };
  }
  // Ne touche que les jetons encore actifs (revoked_at déjà posé = not_found).
  const upd = await svc
    .from('sv_mcp_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();
  if (upd.error) return { status: 'error', wouldWrite: true };
  return upd.data ? { status: 'revoked', wouldWrite: true } : { status: 'not_found', wouldWrite: false };
}

// Hostname seul : ni clé, ni chemin, ni paramètres.
export function supabaseHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '(url invalide)';
  }
}

// « would create » en simulation, « created » après écriture ; les refus gardent leur code.
export function formatStatus(action, status, write) {
  const success = action === 'create' ? 'created' : 'revoked';
  if (status !== success) return status;
  return write ? success : `would ${action}`;
}

export async function listTokens({ svc, email }) {
  const addr = String(email ?? '').trim().toLowerCase();
  if (!addr || addr.length > 254 || !EMAIL_RE.test(addr)) return { status: 'invalid', tokens: [] };
  const admin = await svc.from('sv_admins').select('user_id').eq('email', addr).maybeSingle();
  if (admin.error) return { status: 'error', tokens: [] };
  if (!admin.data) return { status: 'not_admin', tokens: [] };
  // Colonnes explicites : token_hash n'est jamais lu.
  const res = await svc
    .from('sv_mcp_tokens')
    .select('id, label, expires_at, revoked_at')
    .eq('user_id', admin.data.user_id)
    .order('created_at', { ascending: false });
  if (res.error) return { status: 'error', tokens: [] };
  return { status: 'listed', tokens: res.data ?? [] };
}

function loadDotEnvLocal() {
  let text;
  try {
    text = readFileSync('.env.local', 'utf8');
  } catch {
    return {};
  }
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

const USAGE =
  'Usage : npm run sv:mcp-token -- --email <adresse> --label <nom> [--days 1-365] [--yes]\n' +
  '        npm run sv:mcp-token -- --list --email <adresse>\n' +
  '        npm run sv:mcp-token -- --revoke <tokenId> [--yes]\n' +
  '  sans --yes : simulation (aucune écriture).';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.days === null || (args.list && !args.email) || (!args.list && !args.revoke && (!args.email || !args.label))) {
    console.error(USAGE);
    return 1;
  }

  const file = loadDotEnvLocal();
  const pick = (k) => process.env[k] || file[k];
  const url = pick('NEXT_PUBLIC_SUPABASE_URL');
  const key = pick('SUPABASE_SECRET_KEY') || pick('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    console.error('[sv-mcp-token] variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY');
    return 1;
  }
  const svc = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const mode = args.yes ? 'écrit' : 'dry run';
  console.log(`[sv-mcp-token] base : ${supabaseHost(url)}`);

  if (args.list) {
    const l = await listTokens({ svc, email: args.email });
    console.log(`[sv-mcp-token] ${l.status}`);
    for (const t of l.tokens) {
      console.log(`${t.id}  ${t.label}  expire ${t.expires_at}  ${t.revoked_at ? `révoqué ${t.revoked_at}` : 'actif'}`);
    }
    return l.status === 'listed' ? 0 : 1;
  }

  if (args.revoke) {
    const { status } = await revokeToken({ svc, id: args.revoke, write: args.yes });
    console.log(`[sv-mcp-token] ${formatStatus('revoke', status, args.yes)} (${mode})`);
    return status === 'revoked' ? 0 : 1;
  }

  const r = await createToken({ svc, email: args.email, label: args.label, days: args.days, write: args.yes });
  console.log(`[sv-mcp-token] ${formatStatus('create', r.status, args.yes)} (${mode})`);
  if (r.token) {
    console.log(`id         : ${r.id}`);
    console.log(`expire le  : ${r.expiresAt}`);
    console.log('Jeton (affiché UNE seule fois, non récupérable) :');
    console.log(r.token);
  }
  return r.status === 'created' ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    () => {
      console.error('[sv-mcp-token] erreur inattendue');
      process.exit(1);
    },
  );
}
