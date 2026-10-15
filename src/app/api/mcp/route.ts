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
  const resolution = await resolveToken(request.headers.get('authorization'));
  if (resolution.kind === 'unavailable') return NextResponse.json({ error: 'auth_unavailable' }, { status: 503 });
  if (resolution.kind !== 'ok') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const principal = resolution.principal;

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

// Les clients MCP (CLI, desktop) n'envoient jamais d'en-tête Origin : sa présence signale un
// navigateur (DNS rebinding, CSRF). Refus avant toute résolution de jeton, sans en-têtes CORS.
export async function POST(request: Request): Promise<Response> {
  if (request.headers.has('origin')) return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  return handle(request);
}

// Serveur stateless : pas de flux GET (SSE) ni de DELETE de session.
function methodNotAllowed(request: Request): Response {
  if (request.headers.has('origin')) return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } });
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
