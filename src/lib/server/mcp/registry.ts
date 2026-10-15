import 'server-only';
import { z } from 'zod';
import type { AdminCtx } from './session';
import type { McpPrincipal } from './token';

export type AuditEntry = { tokenId: string; userId: string; tool: string; destructive: boolean; outcome: 'ok' | 'error' | 'needs_confirmation' };

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
  return def;
}

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: true; needsConfirmation: true; preview: unknown }
  | { ok: false; error: string };

export async function runTool<S extends z.ZodObject>(
  tool: ToolDef<S>,
  raw: unknown,
  ctx: AdminCtx,
  principal: McpPrincipal,
  audit: (e: AuditEntry) => Promise<void> | void,
): Promise<ToolResult> {
  const base = { tokenId: principal.tokenId, userId: principal.userId, tool: tool.name, destructive: Boolean(tool.destructive) };
  // `confirm` est ajouté aux outils destructifs, jamais aux autres.
  const schema = tool.destructive ? tool.input.extend({ confirm: z.literal(true).optional() }) : tool.input;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    await audit({ ...base, outcome: 'error' });
    return { ok: false, error: 'invalid_input' };
  }
  const { confirm, ...input } = parsed.data as Record<string, unknown> & { confirm?: true };
  try {
    if (tool.destructive && confirm !== true) {
      const preview = tool.preview ? await tool.preview(ctx, input as z.infer<S>) : { input };
      await audit({ ...base, outcome: 'needs_confirmation' });
      return { ok: true, needsConfirmation: true, preview };
    }
    const data = await tool.run(ctx, input as z.infer<S>);
    await audit({ ...base, outcome: 'ok' });
    return { ok: true, data };
  } catch {
    console.error(`[mcp] ${tool.name} failed`);
    await audit({ ...base, outcome: 'error' });
    return { ok: false, error: 'tool_failed' };
  }
}
