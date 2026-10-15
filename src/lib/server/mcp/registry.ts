import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getSupabaseSecretKey } from '@/lib/supabase/env';
import type { AdminCtx } from './session';
import type { McpPrincipal } from './token';

export type AuditEntry = { tokenId: string; userId: string; tool: string; destructive: boolean; argsDigest: string | null; outcome: 'attempt' | 'ok' | 'error' | 'needs_confirmation' };

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

const CONFIRM_FIELDS = { confirm: z.literal(true).optional(), previewToken: z.string().max(4096).optional() };

/** Schéma d'entrée exposé au client : les outils destructifs reçoivent confirm et previewToken. */
export function inputSchemaFor<S extends z.ZodObject>(tool: ToolDef<S>): z.ZodObject {
  return tool.destructive ? tool.input.extend(CONFIRM_FIELDS) : tool.input;
}

const CONFIRM_HELP =
  " [Outil destructif en deux temps : l'appel sans confirm ne fait rien et renvoie preview et previewToken ; pour exécuter, rappeler avec exactement les mêmes arguments, confirm: true et previewToken inchangé (valable 10 minutes). Si l'état a changé entre-temps, la confirmation est refusée (preview_stale) : relancer l'aperçu.]";

/** Description exposée au client : celle de l'outil, plus le mode d'emploi de la confirmation pour les destructifs. */
export function describeTool(tool: ToolDef): string {
  return tool.destructive ? tool.description + CONFIRM_HELP : tool.description;
}

// JSON canonique (clés triées) pour un digest stable.
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
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

function issuePreviewToken(tool: string, inputDigest: string, previewDigest: string, now: number): string {
  const payload = b64url(JSON.stringify({ tool, inputDigest, previewDigest, exp: now + PREVIEW_TTL_MS }));
  return payload + '.' + signToken(payload);
}

function verifyPreviewToken(token: string, tool: string, inputDigest: string, now: number): string | null {
  const dot = token.indexOf('.');
  if (dot < 1 || dot === token.length - 1) return null;
  const payload = token.slice(0, dot);
  const mac = Buffer.from(token.slice(dot + 1), 'utf8');
  const expected = Buffer.from(signToken(payload), 'utf8');
  if (mac.length !== expected.length || !timingSafeEqual(mac, expected)) return null;
  try {
    const c = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (c.tool !== tool || c.inputDigest !== inputDigest) return null;
    if (typeof c.exp !== 'number' || c.exp < now) return null;
    return typeof c.previewDigest === 'string' ? c.previewDigest : null;
  } catch {
    return null;
  }
}

function isCoreRefusal(v: unknown): v is { ok: false; message: string } {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return o.ok === false && typeof o.message === 'string';
}

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: true; needsConfirmation: true; preview: unknown; previewToken: string }
  | { ok: false; error: string; message?: string };

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
  audit: (e: AuditEntry) => Promise<void> | void,
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
      confirm?: true;
      previewToken?: string;
    };
    argsDigest = digest(input);
    const pinned = (preview: unknown) => digest(tool.pin ? tool.pin(preview) : preview);
    if (tool.destructive && confirm !== true) {
      const preview = await tool.preview!(ctx, input as z.infer<S>);
      await safeAudit({ ...base, argsDigest, outcome: 'needs_confirmation' });
      const token = issuePreviewToken(tool.name, argsDigest, pinned(preview), Date.now());
      return { ok: true, needsConfirmation: true, preview, previewToken: token };
    }
    if (tool.destructive) {
      // confirm sans aperçu préalable : refusé (jamais d'exécution à l'aveugle).
      if (!previewToken) {
        await safeAudit({ ...base, argsDigest, outcome: 'error' });
        return { ok: false, error: 'invalid_input' };
      }
      const expectedDigest = verifyPreviewToken(previewToken, tool.name, argsDigest, Date.now());
      // L'aperçu est recalculé : l'état a pu changer depuis l'aperçu confirmé par le modèle.
      const fresh = expectedDigest === null ? null : pinned(await tool.preview!(ctx, input as z.infer<S>));
      if (expectedDigest === null || fresh !== expectedDigest) {
        await safeAudit({ ...base, argsDigest, outcome: 'error' });
        return {
          ok: false,
          error: 'preview_stale',
          message: "L'aperçu n'est plus valable (jeton invalide, expiré ou état modifié depuis). Relancez l'appel sans confirm pour obtenir un nouvel aperçu et un nouveau previewToken.",
        };
      }
      // Pas d'action irréversible sans trace : l'échec d'écriture bloque l'exécution.
      try {
        await audit({ ...base, argsDigest, outcome: 'attempt' });
      } catch {
        console.error(`[mcp] ${tool.name} audit failed`);
        return { ok: false, error: 'audit_unavailable' };
      }
    }
    const data = await tool.run(ctx, input as z.infer<S>);
    // Refus métier d'un core ({ ok:false, message }) : ce n'est pas un succès, même sans exception.
    if (isCoreRefusal(data)) {
      await safeAudit({ ...base, argsDigest, outcome: 'error' });
      return { ok: false, error: data.message };
    }
    await safeAudit({ ...base, argsDigest, outcome: 'ok' });
    return { ok: true, data };
  } catch (err) {
    console.error(`[mcp] ${tool.name} failed`, err instanceof Error ? err.message : 'unknown');
    await safeAudit({ ...base, argsDigest, outcome: 'error' });
    return { ok: false, error: 'tool_failed' };
  }
}
