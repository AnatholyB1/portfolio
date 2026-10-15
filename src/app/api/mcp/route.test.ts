import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveMock = vi.hoisted(() => vi.fn());
const ctxMock = vi.hoisted(() => vi.fn());
const insertMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/mcp/token', () => ({ resolveToken: resolveMock }));
vi.mock('@/lib/server/mcp/session', () => ({ buildAdminContext: ctxMock }));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ from: () => ({ insert: insertMock }) }),
}));

import { DELETE, GET, POST } from './route';

const HEADERS = {
  'content-type': 'application/json',
  accept: 'application/json, text/event-stream',
  authorization: 'Bearer svmcp_x',
};

const rpc = (body: unknown, headers: Record<string, string> = HEADERS) =>
  new Request('https://sevalys.com/api/mcp', { method: 'POST', headers, body: JSON.stringify(body) });

const INIT = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } },
};

describe('/api/mcp auth', () => {
  beforeEach(() => {
    resolveMock.mockReset();
    ctxMock.mockReset();
    insertMock.mockReset();
    resolveMock.mockResolvedValue({ kind: 'invalid' });
  });

  it('401 without header, never builds a session', async () => {
    const res = await POST(rpc(INIT, { 'content-type': 'application/json' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
    expect(ctxMock).not.toHaveBeenCalled();
  });

  it('401 with a wrong token on POST, never builds a session', async () => {
    const res = await POST(rpc(INIT));
    expect(res.status).toBe(401);
    expect(resolveMock).toHaveBeenCalledWith('Bearer svmcp_x');
    expect(ctxMock).not.toHaveBeenCalled();
  });

  it('503 auth_unavailable when token resolution cannot reach the database', async () => {
    resolveMock.mockResolvedValue({ kind: 'unavailable' });
    const res = await POST(rpc(INIT));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'auth_unavailable' });
    expect(ctxMock).not.toHaveBeenCalled();
  });

  it('405 Allow: POST on GET and DELETE, with and without a token, without resolving', async () => {
    for (const handler of [GET, DELETE]) {
      for (const headers of [HEADERS, { accept: 'text/event-stream' }]) {
        const res = await handler(new Request('https://sevalys.com/api/mcp', { method: 'GET', headers }));
        expect(res.status).toBe(405);
        expect(res.headers.get('allow')).toBe('POST');
      }
    }
    expect(resolveMock).not.toHaveBeenCalled();
    expect(ctxMock).not.toHaveBeenCalled();
  });

  it('403 on any Origin header (browser), before token resolution, without CORS headers', async () => {
    resolveMock.mockResolvedValue({ kind: 'ok', principal: { tokenId: 't', userId: 'u' } });
    for (const handler of [POST, GET, DELETE]) {
      const res = await handler(rpc(INIT, { ...HEADERS, origin: 'https://evil.example' }));
      expect(res.status).toBe(403);
      expect([...res.headers.keys()].some((k) => k.startsWith('access-control-'))).toBe(false);
    }
    expect(resolveMock).not.toHaveBeenCalled();
    expect(ctxMock).not.toHaveBeenCalled();
  });

  it('503 session_unavailable (no stack) when the admin context cannot be built', async () => {
    resolveMock.mockResolvedValue({ kind: 'ok', principal: { tokenId: 't', userId: 'u' } });
    ctxMock.mockRejectedValue(new Error('mcp_session_failed at secret/path.ts'));
    const res = await POST(rpc(INIT));
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'session_unavailable' });
    expect(text).not.toContain('secret/path');
  });
});

describe('/api/mcp round trip', () => {
  const supabase = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { contact_email: 'jean@exemple.fr' }, error: null }) }) }),
    }),
  };
  beforeEach(() => {
    resolveMock.mockReset();
    ctxMock.mockReset();
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
    resolveMock.mockResolvedValue({ kind: 'ok', principal: { tokenId: 'tok', userId: 'usr' } });
    ctxMock.mockResolvedValue({ supabase, user: { id: 'usr' } });
  });

  it('initialize then tools/list exposes the lead tools', async () => {
    const init = await POST(rpc(INIT));
    expect(init.status).toBe(200);
    expect((await init.json()).result.serverInfo.name).toBe('sevalys-admin');

    const list = await POST(rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    expect(list.status).toBe(200);
    const names = (await list.json()).result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual(expect.arrayContaining(['set_lead_status', 'erase_lead']));
  });

  it('tools/call erase_lead without confirm returns needsConfirmation and audits it', async () => {
    const res = await POST(
      rpc({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'erase_lead',
          arguments: { leadId: '3f2b8c1e-5a4d-4e6f-8a9b-1c2d3e4f5a6b', reason: 'doublon', confirmEmail: 'jean@exemple.fr' },
        },
      }),
    );
    expect(res.status).toBe(200);
    const payload = JSON.parse((await res.json()).result.content[0].text);
    expect(payload.needsConfirmation).toBe(true);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        token_id: 'tok',
        user_id: 'usr',
        tool: 'erase_lead',
        destructive: true,
        outcome: 'needs_confirmation',
        args_digest: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
  });
});
