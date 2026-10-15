import 'server-only';
import { createHash, createHmac } from 'node:crypto';
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
  preview?: (ctx: AdminCtx, input: z.infer<S>) => Promise<unknown>;
  run: (ctx: AdminCtx, input: z.infer<S>) => Promise<unknown>;
};

export function defineTool<S extends z.ZodObject>(def: ToolDef<S>): ToolDef<S> {
  if (def.destructive && 'confirm' in def.input.shape) {
    throw new Error(`defineTool(${def.name}): "confirm" est réservé aux outils destructifs`);
  }
  return def;
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

function isCoreRefusal(v: unknown): v is { ok: false; message: string } {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return o.ok === false && typeof o.message === 'string';
}

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: true; needsConfirmation: true; preview: unknown }
  | { ok: false; error: string };

// Garde-fous (à lire avant de modifier) :
// - `confirm: true` est un garde-fou côté modèle (empêche l'exécution par inadvertance), PAS une
//   frontière de sécurité : un client qui détient un jeton valide peut toujours le fournir.
//   La frontière est le jeton + la RLS de la session admin.
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
    // `confirm` est ajouté aux outils destructifs, jamais aux autres.
    const schema = tool.destructive ? tool.input.extend({ confirm: z.literal(true).optional() }) : tool.input;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      await safeAudit({ ...base, argsDigest, outcome: 'error' });
      return { ok: false, error: 'invalid_input' };
    }
    const { confirm, ...input } = parsed.data as Record<string, unknown> & { confirm?: true };
    argsDigest = digest(input);
    if (tool.destructive && confirm !== true) {
      const preview = tool.preview ? await tool.preview(ctx, input as z.infer<S>) : { input };
      await safeAudit({ ...base, argsDigest, outcome: 'needs_confirmation' });
      return { ok: true, needsConfirmation: true, preview };
    }
    if (tool.destructive) {
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
