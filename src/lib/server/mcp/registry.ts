import 'server-only';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getSupabaseSecretKey } from '@/lib/supabase/env';
import type { AdminCtx } from './session';
import type { McpPrincipal } from './token';

export type AuditEntry = {
  tokenId: string;
  userId: string;
  tool: string;
  destructive: boolean;
  argsDigest: string | null;
  outcome: 'attempt' | 'ok' | 'error' | 'needs_confirmation';
  /** Ligne « attempt » seulement : jti du previewToken consommé (index unique partiel côté base) et digest de l'aperçu. */
  previewJti?: string;
  previewDigest?: string;
};

/** Résultat typé d'une écriture d'audit : `conflict` = le jti a déjà été consommé (violation d'unicité). */
export type AuditResult = void | { conflict: true };

export type ToolDef<S extends z.ZodObject = z.ZodObject> = {
  name: string;
  description: string;
  /** Noms des server actions que cet outil remplace (lu par coverage.test.ts). */
  covers: string[];
  destructive?: boolean;
  input: S;
  /** Obligatoire pour un outil destructif : l'aperçu est recalculé à la confirmation et lié au previewToken. */
  preview?: (ctx: AdminCtx, input: z.infer<S>) => Promise<unknown>;
  /**
   * Sous-ensemble stable de l'aperçu qui est digéré et comparé à la confirmation (défaut : l'aperçu entier).
   * À fournir si l'aperçu contient des champs volatils (horodatages, valeurs aléatoires).
   */
  pin?: (preview: unknown) => unknown;
  run: (ctx: AdminCtx, input: z.infer<S>) => Promise<unknown>;
};

export function defineTool<S extends z.ZodObject>(def: ToolDef<S>): ToolDef<S> {
  if (def.destructive && 'confirm' in def.input.shape) {
    throw new Error(`defineTool(${def.name}): "confirm" est réservé aux outils destructifs`);
  }
  if (def.destructive && 'previewToken' in def.input.shape) {
    throw new Error(`defineTool(${def.name}): "previewToken" est réservé aux outils destructifs`);
  }
  if (def.destructive && !def.preview) {
    throw new Error(`defineTool(${def.name}): un outil destructif doit fournir un preview`);
  }
  return def;
}

// confirm:false équivaut à l'absence de confirm (aperçu) ; seul `true` accompagné d'un previewToken exécute.
const CONFIRM_FIELDS = { confirm: z.boolean().optional(), previewToken: z.string().max(4096).optional() };

/** Schéma d'entrée exposé au client : les outils destructifs reçoivent confirm et previewToken. */
export function inputSchemaFor<S extends z.ZodObject>(tool: ToolDef<S>): z.ZodObject {
  return tool.destructive ? tool.input.extend(CONFIRM_FIELDS) : tool.input;
}

const CONFIRM_HELP =
  " [Outil destructif en deux temps : l'appel sans confirm ne fait rien et renvoie preview et previewToken ; pour exécuter, rappeler avec exactement les mêmes arguments, confirm: true et previewToken inchangé (valable 10 minutes, à usage unique). Si l'état a changé entre-temps, la confirmation est refusée (preview_stale) : relancer l'aperçu. Le jeton est consommé dès que l'exécution démarre : si l'appel échoue ensuite, ou en cas de rejeu (preview_already_used), il faut un nouvel aperçu et un nouveau previewToken.]";

/** Description exposée au client : celle de l'outil, plus le mode d'emploi de la confirmation pour les destructifs. */
export function describeTool(tool: ToolDef): string {
  return tool.destructive ? tool.description + CONFIRM_HELP : tool.description;
}

// JSON canonique (clés triées) pour un digest stable. Strict : un digest ne doit jamais masquer une différence.
// Refuse les objets non simples (Date, Map, Set, instances de classe : JSON.stringify les aplatit ou les vide),
// les éléments undefined d'un tableau ([undefined] ne vaut pas [null]), les fonctions, symboles et nombres non finis.
function canonical(v: unknown): string {
  if (Array.isArray(v)) {
    return `[${v
      .map((item) => {
        if (item === undefined) throw new Error('canonical_undefined_item');
        return canonical(item);
      })
      .join(',')}]`;
  }
  if (v && typeof v === 'object') {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) throw new Error('canonical_non_plain_object');
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
  }
  if (typeof v === 'function' || typeof v === 'symbol' || (typeof v === 'number' && !Number.isFinite(v))) {
    throw new Error('canonical_unsupported_value');
  }
  return JSON.stringify(v) ?? 'null';
}

// HMAC-SHA256 : un digest nu d'arguments peu variés (ids, statuts) se retrouve par dictionnaire.
// Clé : MCP_AUDIT_SECRET, sinon dérivée de la clé service (jamais journalisée).
function auditKey(): string | Buffer {
  const explicit = process.env.MCP_AUDIT_SECRET;
  if (explicit) return explicit;
  return createHash('sha256').update(`mcp-audit:${getSupabaseSecretKey()}`).digest();
}

function digest(input: unknown): string {
  return createHmac('sha256', auditKey()).update(canonical(input)).digest('hex');
}

const PREVIEW_TTL_MS = 10 * 60_000;

function b64url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

// Jeton d'aperçu : base64url(JSON{tool, inputDigest, previewDigest, exp}) + '.' + HMAC (même clé que l'audit,
// domaine séparé). Il ne contient que des digests HMAC : ni argument ni secret.
function signToken(payload: string): string {
  return createHmac('sha256', auditKey()).update('preview-token:' + payload).digest('hex');
}

function issuePreviewToken(tool: string, sub: string, inputDigest: string, previewDigest: string, now: number): string {
  // jti : identifiant à usage unique (consommé via la ligne d'audit « attempt ») ; sub : jeton MCP émetteur.
  const payload = b64url(JSON.stringify({ tool, sub, jti: randomUUID(), inputDigest, previewDigest, exp: now + PREVIEW_TTL_MS }));
  return payload + '.' + signToken(payload);
}

type PreviewClaims = { digest: string; jti: string };

function verifyPreviewToken(token: string, tool: string, sub: string, inputDigest: string, now: number): PreviewClaims | null {
  const dot = token.indexOf('.');
  if (dot < 1 || dot === token.length - 1) return null;
  const payload = token.slice(0, dot);
  const mac = Buffer.from(token.slice(dot + 1), 'utf8');
  const expected = Buffer.from(signToken(payload), 'utf8');
  if (mac.length !== expected.length || !timingSafeEqual(mac, expected)) return null;
  try {
    const c = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (c.tool !== tool || c.sub !== sub || c.inputDigest !== inputDigest) return null;
    if (typeof c.exp !== 'number' || c.exp < now) return null;
    if (typeof c.previewDigest !== 'string' || typeof c.jti !== 'string') return null;
    return { digest: c.previewDigest, jti: c.jti };
  } catch {
    return null;
  }
}

function isCoreRefusal(v: unknown): v is { ok: false; message: string } {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return o.ok === false && typeof o.message === 'string';
}

// Journal : jamais le message d'une erreur (les détails Postgres peuvent contenir des données personnelles, p. ex.
// « Key (email)=(…) »). Nom de l'erreur, plus un code court sans donnée (ex. 23505) quand il y en a un.
function errorTag(err: unknown): string {
  const name = err instanceof Error ? err.name : 'unknown';
  const code = typeof err === 'object' && err !== null ? (err as { code?: unknown }).code : undefined;
  return typeof code === 'string' && /^[A-Za-z0-9_]{1,40}$/.test(code) ? `${name} ${code}` : name;
}

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: true; needsConfirmation: true; preview: unknown; previewToken: string }
  | { ok: false; error: string; message?: string; fieldErrors?: Record<string, string> };

const PREVIEW_AGAIN = "Relancez l'appel sans confirm pour obtenir un nouvel aperçu et un nouveau previewToken.";

// Garde-fous (à lire avant de modifier) :
// - Confirmation liée à un aperçu : un outil destructif appelé sans confirm renvoie { preview, previewToken } ;
//   l'exécution exige confirm: true ET ce previewToken (10 min, HMAC, lié à l'outil, aux arguments et au
//   digest de l'aperçu). À la confirmation l'aperçu est recalculé : s'il diffère (état modifié entre-temps),
//   on répond preview_stale sans exécuter. Cela empêche un confirm: true « à l'aveugle » ou rejoué sur un état
//   changé ; ce n'est toujours PAS l'authentification d'un humain : un client qui détient un jeton MCP valide
//   peut enchaîner les deux appels. La frontière reste le jeton MCP + la RLS de la session admin.
// - Seul l'audit « attempt » d'un outil destructif est bloquant. Pour les outils non destructifs,
//   un échec d'écriture d'audit n'empêche ni l'exécution ni le résultat.
export async function runTool<S extends z.ZodObject>(
  tool: ToolDef<S>,
  raw: unknown,
  ctx: AdminCtx,
  principal: McpPrincipal,
  audit: (e: AuditEntry) => Promise<AuditResult> | AuditResult,
): Promise<ToolResult> {
  const base = { tokenId: principal.tokenId, userId: principal.userId, tool: tool.name, destructive: Boolean(tool.destructive) };
  // L'audit ne doit jamais changer le résultat renvoyé (sauf l'« attempt » destructif, bloquant).
  const safeAudit = async (e: AuditEntry) => {
    try {
      await audit(e);
    } catch {
      console.error(`[mcp] ${tool.name} audit failed`);
    }
  };
  let argsDigest: string | null = null;
  try {
    // `confirm` et `previewToken` sont ajoutés aux outils destructifs, jamais aux autres.
    const schema = inputSchemaFor(tool);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      await safeAudit({ ...base, argsDigest, outcome: 'error' });
      return { ok: false, error: 'invalid_input' };
    }
    const { confirm, previewToken, ...input } = parsed.data as Record<string, unknown> & {
      confirm?: boolean;
      previewToken?: string;
    };
    argsDigest = digest(input);
    const pinned = (preview: unknown) => digest(tool.pin ? tool.pin(preview) : preview);
    if (tool.destructive && confirm !== true) {
      const preview = await tool.preview!(ctx, input as z.infer<S>);
      await safeAudit({ ...base, argsDigest, outcome: 'needs_confirmation' });
      const token = issuePreviewToken(tool.name, principal.tokenId, argsDigest, pinned(preview), Date.now());
      return { ok: true, needsConfirmation: true, preview, previewToken: token };
    }
    if (tool.destructive) {
      // confirm sans aperçu préalable : refusé (jamais d'exécution à l'aveugle).
      if (!previewToken) {
        await safeAudit({ ...base, argsDigest, outcome: 'error' });
        return { ok: false, error: 'invalid_input' };
      }
      const claims = verifyPreviewToken(previewToken, tool.name, principal.tokenId, argsDigest, Date.now());
      // L'aperçu est recalculé : l'état a pu changer depuis l'aperçu confirmé par le modèle.
      const fresh = claims === null ? null : pinned(await tool.preview!(ctx, input as z.infer<S>));
      if (claims === null || fresh !== claims.digest) {
        await safeAudit({ ...base, argsDigest, outcome: 'error' });
        return {
          ok: false,
          error: 'preview_stale',
          message: `L'aperçu n'est plus valable (jeton invalide, expiré ou état modifié depuis). ${PREVIEW_AGAIN}`,
        };
      }
      // Consommation du jeton, de façon atomique : la ligne « attempt » porte le jti, que l'index unique partiel de
      // sv_mcp_audit n'accepte qu'une fois. Deux confirmations concurrentes : une seule passe.
      try {
        const claimed = await audit({ ...base, argsDigest, outcome: 'attempt', previewJti: claims.jti, previewDigest: claims.digest });
        if (claimed && claimed.conflict) {
          await safeAudit({ ...base, argsDigest, outcome: 'error' });
          return {
            ok: false,
            error: 'preview_already_used',
            message: `Cet aperçu a déjà été utilisé (usage unique). ${PREVIEW_AGAIN}`,
          };
        }
      } catch {
        console.error(`[mcp] ${tool.name} audit failed`);
        return { ok: false, error: 'audit_unavailable' };
      }
    }
    const data = await tool.run(ctx, input as z.infer<S>);
    // Refus métier d'un core ({ ok:false, message }) : ce n'est pas un succès, même sans exception.
    if (isCoreRefusal(data)) {
      await safeAudit({ ...base, argsDigest, outcome: 'error' });
      const fieldErrors = (data as { fieldErrors?: unknown }).fieldErrors;
      const valid = fieldErrors && typeof fieldErrors === 'object' && !Array.isArray(fieldErrors) && Object.values(fieldErrors).every((x) => typeof x === 'string');
      return { ok: false, error: data.message, ...(valid ? { fieldErrors: fieldErrors as Record<string, string> } : {}) };
    }
    await safeAudit({ ...base, argsDigest, outcome: 'ok' });
    return { ok: true, data };
  } catch (err) {
    console.error(`[mcp] ${tool.name} failed`, errorTag(err));
    await safeAudit({ ...base, argsDigest, outcome: 'error' });
    return { ok: false, error: 'tool_failed' };
  }
}
