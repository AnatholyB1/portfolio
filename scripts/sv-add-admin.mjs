// Récupération / ajout d'un admin Sèvalys
//
// Quand l'utiliser : perte d'accès de l'unique admin, ou ajout d'un second admin.
// Cette voie est volontairement hors application : l'app ne peut jamais
// promouvoir un compte en admin (D-05).
//
// Prérequis : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY (ou
// SUPABASE_SERVICE_ROLE_KEY) dans le shell ou dans .env.local. À exécuter en
// local par le propriétaire uniquement, jamais déployé.
//
// Commandes :
//   npm run sv:add-admin -- --email x@y.fr              (simulation, rien n'est écrit)
//   npm run sv:add-admin -- --email x@y.fr --yes        (écrit pour de vrai)
//   npm run sv:add-admin -- --email x@y.fr --create --yes
//       (--create uniquement si l'adresse n'a pas encore de compte auth)
//
// Refus : une adresse déjà membre client est rejetée (D-04, exclusivité des rôles).
// Idempotent : relancer donne `already_admin`. Un compte auth existant n'est
// jamais supprimé ni modifié ; seul un compte créé par ce script peut être
// retiré en cas d'échec de l'insertion.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function parseArgs(argv) {
  let email = null;
  let create = false;
  let yes = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email') {
      const v = argv[i + 1];
      if (v !== undefined && !v.startsWith('--')) {
        email = v.trim().toLowerCase() || null;
        i++;
      }
    } else if (a === '--create') create = true;
    else if (a === '--yes') yes = true;
  }
  return { email, create, yes, dryRun: !yes };
}

export async function addAdmin({ svc, email, create, write }) {
  const addr = String(email ?? '').trim().toLowerCase();
  if (!addr || addr.length > 254 || !EMAIL_RE.test(addr)) {
    return { status: 'invalid', wouldWrite: false };
  }

  const found = await svc.rpc('sv_find_auth_user', { p_email: addr });
  if (found.error) return { status: 'error', wouldWrite: false };
  const row = Array.isArray(found.data) ? found.data[0] : found.data;

  if (!row) {
    if (!create) return { status: 'no_auth_user', wouldWrite: false };
    if (!write) return { status: 'created_and_added', wouldWrite: true };

    // Compte passwordless, e-mail confirmé.
    const created = await svc.auth.admin.createUser({ email: addr, email_confirm: true });
    const newId = created.data?.user?.id;
    if (created.error || !newId) return { status: 'error', wouldWrite: true };

    const ins = await svc.from('sv_admins').insert({ user_id: newId, email: addr });
    if (ins.error) {
      // Seul un compte créé ici est retiré.
      await svc.auth.admin.deleteUser(newId);
      return {
        status: String(ins.error.message ?? '').includes('sv_role_conflict') ? 'role_conflict' : 'error',
        wouldWrite: true,
      };
    }
    return { status: 'created_and_added', wouldWrite: true };
  }

  const userId = row.id;
  const admin = await svc.from('sv_admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (admin.error) return { status: 'error', wouldWrite: false };
  if (admin.data) return { status: 'already_admin', wouldWrite: false };

  const member = await svc
    .from('sv_client_members')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (member.error) return { status: 'error', wouldWrite: false };
  if (member.data) return { status: 'role_conflict', wouldWrite: false };

  if (!write) return { status: 'added', wouldWrite: true };

  const ins = await svc.from('sv_admins').insert({ user_id: userId, email: addr });
  if (ins.error) {
    return {
      status: String(ins.error.message ?? '').includes('sv_role_conflict') ? 'role_conflict' : 'error',
      wouldWrite: true,
    };
  }
  return { status: 'added', wouldWrite: true };
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
  'Usage : npm run sv:add-admin -- --email <adresse> [--create] [--yes]\n' +
  '  sans --yes : simulation (aucune écriture).';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.email) {
    console.error(USAGE);
    return 1;
  }

  const file = loadDotEnvLocal();
  const pick = (k) => process.env[k] || file[k];
  const url = pick('NEXT_PUBLIC_SUPABASE_URL');
  const key = pick('SUPABASE_SECRET_KEY') || pick('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    console.error('[sv-add-admin] variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY');
    return 1;
  }

  const svc = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { status } = await addAdmin({
    svc,
    email: args.email,
    create: args.create,
    write: args.yes,
  });
  console.log(`[sv-add-admin] ${status} (${args.yes ? 'écrit' : 'dry run'})`);

  const ok = ['added', 'created_and_added', 'already_admin'];
  return ok.includes(status) ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    () => {
      console.error('[sv-add-admin] erreur inattendue');
      process.exit(1);
    },
  );
}
