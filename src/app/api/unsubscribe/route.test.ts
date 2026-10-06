import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ callRpc: vi.fn(), send: vi.fn() }));

vi.mock('@/lib/server/rpc', () => ({ callRpc: (...a: unknown[]) => h.callRpc(...a) }));
vi.mock('@/lib/server/mail/outbox', () => ({ sendOutboxRow: (...a: unknown[]) => h.send(...a) }));

import { signUnsubscribeToken } from '@/lib/server/mail/unsubscribeToken';
import { GET, POST } from './route';

const SECRET = 'x'.repeat(40);
const token = signUnsubscribeToken('alice@example.com', SECRET);

function req(t: string | null, body?: string): Request {
  const url = `https://site.test/api/unsubscribe${t === null ? '' : `?t=${encodeURIComponent(t)}`}`;
  return new Request(url, {
    method: 'POST',
    body,
    headers: body === undefined ? {} : { 'content-type': 'application/x-www-form-urlencoded' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('UNSUBSCRIBE_SECRET', SECRET);
  h.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'recorded', outbox_ids: [] } });
  h.send.mockResolvedValue('sent');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('/api/unsubscribe', () => {
  it('secret unset -> 500 not_configured', async () => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', '');
    const r = await POST(req(token, 'List-Unsubscribe=One-Click'));
    expect(r.status).toBe(500);
    expect(await r.text()).toBe('not_configured');
    expect(h.callRpc).not.toHaveBeenCalled();
  });

  it('GET -> 405 Allow POST, never writes', async () => {
    const r = await GET();
    expect(r.status).toBe(405);
    expect(r.headers.get('allow')).toBe('POST');
    expect(h.callRpc).not.toHaveBeenCalled();
  });

  it('missing, tampered or oversized token -> 400', async () => {
    for (const t of [null, token.slice(0, -2) + 'AA', 'a'.repeat(601)]) {
      const r = await POST(req(t, 'List-Unsubscribe=One-Click'));
      expect(r.status).toBe(400);
      expect(await r.text()).toBe('invalid');
    }
    expect(h.callRpc).not.toHaveBeenCalled();
  });

  it('one-click body -> one_click, 200', async () => {
    const r = await POST(req(token, 'List-Unsubscribe=One-Click'));
    expect(r.status).toBe(200);
    expect(h.callRpc).toHaveBeenCalledWith('mail/unsubscribe', 'sv_record_unsubscribe', {
      p_email: 'alice@example.com',
      p_source: 'one_click',
      p_admin_email: 'contact@sevalys.com',
    });
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('form source=link -> link, 303 redirect without token', async () => {
    const r = await POST(req(token, 'source=link'));
    expect(r.status).toBe(303);
    const loc = r.headers.get('location') ?? '';
    expect(loc).toBe('https://site.test/desinscription?ok=1');
    expect(loc).not.toContain(token);
    expect(h.callRpc.mock.calls[0][2].p_source).toBe('link');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('empty body -> one_click, 200', async () => {
    const r = await POST(req(token));
    expect(r.status).toBe(200);
    expect(h.callRpc.mock.calls[0][2].p_source).toBe('one_click');
  });

  it('already -> same response as recorded', async () => {
    h.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'already' } });
    const r = await POST(req(token, 'List-Unsubscribe=One-Click'));
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('ok');
  });

  it('RPC failure -> 500 retry', async () => {
    h.callRpc.mockResolvedValue({ ok: false, code: 'rpc_error' });
    const r = await POST(req(token, 'List-Unsubscribe=One-Click'));
    expect(r.status).toBe(500);
    expect(await r.text()).toBe('retry');
  });

  it('sends outbox rows; failure swallowed, logs fixed', async () => {
    h.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'recorded', outbox_ids: ['o1'] } });
    h.send.mockRejectedValue(new Error('alice@example.com'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await POST(req(token, 'List-Unsubscribe=One-Click'));
    expect(r.status).toBe(200);
    expect(h.send).toHaveBeenCalledWith('o1');
    const logged = JSON.stringify(err.mock.calls);
    expect(logged).not.toContain('alice');
    expect(logged).not.toContain(token);
  });
});
