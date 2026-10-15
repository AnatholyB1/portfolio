import 'server-only';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { describeTool, inputSchemaFor, runTool, type AuditEntry, type ToolDef } from './registry';
import type { AdminCtx } from './session';
import type { McpPrincipal } from './token';
import { clientTools } from './tools/clients';
import { emailTools } from './tools/emails';
import { costTools } from './tools/costs';
import { reviewTools } from './tools/reviews';
import { projectTools } from './tools/projects';
import { documentTools } from './tools/documents';
import { billingTools } from './tools/billing';
import { leadTools } from './tools/leads';

// SDK : @modelcontextprotocol/sdk 1.32.1. Transport Web Standard sans session
// (WebStandardStreamableHTTPServerTransport, sessionIdGenerator: undefined) : un McpServer
// et un transport par requête, jamais réutilisés (voir src/app/api/mcp/route.ts).
// registerTool(name, { description, inputSchema }, cb) accepte une forme brute zod.

export const ALL_TOOLS: ToolDef[] = [...leadTools, ...clientTools, ...emailTools, ...costTools, ...reviewTools, ...projectTools, ...documentTools, ...billingTools];

// Doit lever en cas d'échec : runTool bloque les outils destructifs si l'« attempt » n'est pas écrit.
// La confirmation est liée à un aperçu (previewToken) mais n'authentifie pas un humain ; un échec d'audit
// ne bloque pas les outils non destructifs (voir registry.ts).
async function audit(e: AuditEntry): Promise<void> {
  const { error } = await createSupabaseAdminClient().from('sv_mcp_audit').insert({
    token_id: e.tokenId,
    user_id: e.userId,
    tool: e.tool,
    destructive: e.destructive,
    args_digest: e.argsDigest,
    outcome: e.outcome,
  });
  if (error) throw new Error('mcp_audit_insert_failed');
}

export function buildServer(ctx: AdminCtx, principal: McpPrincipal): McpServer {
  const server = new McpServer({ name: 'sevalys-admin', version: '1.0.0' });
  for (const tool of ALL_TOOLS) {
    server.registerTool(tool.name, { description: describeTool(tool), inputSchema: inputSchemaFor(tool).shape }, async (args: unknown) => {
      const result = await runTool(tool, args, ctx, principal, audit);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], isError: !result.ok };
    });
  }
  return server;
}
