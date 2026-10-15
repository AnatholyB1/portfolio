import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { NextResponse } from 'next/server';
import { buildServer } from '@/lib/server/mcp';
import { buildAdminContext } from '@/lib/server/mcp/session';
import { resolveToken } from '@/lib/server/mcp/token';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Endpoint MCP stateless. Hors matcher du proxy (api exclu) : pas de session cookie,
// l'authentification est uniquement le jeton Bearer (fail-closed avant toute session RLS).
async function handle(request: Request): Promise<Response> {
  const principal = await resolveToken(request.headers.get('authorization'));
  if (!principal) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let ctx;
  try {
    ctx = await buildAdminContext(principal.userId);
  } catch {
    return NextResponse.json({ error: 'session_unavailable' }, { status: 503 });
  }

  const server = buildServer(ctx, principal);
  // enableJsonResponse : réponse JSON unique plutôt qu'un flux SSE. Chaque requête est
  // indépendante (stateless, pas de notification serveur->client), un flux SSE n'apporterait
  // rien et pèserait sur la durée de la fonction serverless.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
