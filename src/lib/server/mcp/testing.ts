import type { z } from 'zod';
import type { AdminCtx } from './session';
import type { McpPrincipal } from './token';
import { runTool, type AuditEntry, type ToolDef, type ToolResult } from './registry';

/**
 * Parcours de confirmation en deux temps d'un outil destructif (tests uniquement) : un premier appel sans
 * confirm obtient l'aperçu et son previewToken, le second rappelle avec confirm: true et ce jeton inchangé.
 */
export async function confirmTwoStep<S extends z.ZodObject>(
  tool: ToolDef<S>,
  input: unknown,
  ctx: AdminCtx,
  principal: McpPrincipal,
  audit: (e: AuditEntry) => Promise<void> | void,
): Promise<ToolResult> {
  const first = await runTool(tool, input, ctx, principal, audit);
  if (!('needsConfirmation' in first)) return first;
  return runTool(tool, { ...(input as object), confirm: true, previewToken: first.previewToken }, ctx, principal, audit);
}
