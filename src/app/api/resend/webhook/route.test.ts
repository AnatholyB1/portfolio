import { createHmac, randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ callRpc: vi.fn(), send: vi.fn() }));

vi.mock('@/lib/server/rpc', () => ({ callRpc: (...a: unknown[]) => h.callRpc(...a) }));
vi.mock('@/lib/server/mail/outbox', () => ({ sendOutboxRow: (...a: unknown[]) => h.send(...a) }));

import { POST } from './route';

const secret = `whsec_${randomBytes(32).toString('base64')}`;
const ID = 'msg_svix_secret_id';

function sign(id: string, ts: string, payload: string): string {
  const key = Buffer.from(secret.slice('whsec_'.length), 'base64');
  return `v1,${createHmac('sha256', key).update(`${id}.${ts}.${payload}`).digest('base64')}`;
}

function req(event: unknown, opts: { omit?: string; badSig?: boolean } = {}): Request {
  const body = JSON.stringify(event);
  const ts = String(Math.floor(Date.now() / 1000));
  const headers: Record<string, string> = {
    'svix-id': ID,
    'svix-timestamp': ts,
    'svix-signature': opts.badSig ? sign(ID, ts, body + 'x') : sign(ID, ts, body),
  };
  if (opts.omit) delete headers[opts.omit];
  return new Request('https://site.test/api/resend/webhook', { method: 'POST', body, headers });
}

const bounce = { type: 'email.bounced', data: { from: 'Sèvalys <contact@sevalys.com>', to: ['Alice@Example.com'], bounce: { type: 'Permanent' } } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('RESEND_WEBHOOK_SECRET', secret);
  h.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'applied', outbox_ids: [] } });
  h.send.mockResolvedValue('sent');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('POST /api/resend/webhook', () => {
  it('secret unset -> 500 not_configured, no RPC', async () => {
    vi.stubEnv('RESEND_WEBHOOK_SECRET', '');
    const r = await POST(req(bounce));
    expect(r.status).toBe(500);
    expect(await r.text()).toBe('not_configured');
    expect(h.callRpc).not.toHaveBeenCalled();
  });

  it.each(['svix-id', 'svix-timestamp', 'svix-signature'])('missing %s -> 400', async (omit) => {
    const r = await POST(req(bounce, { omit }));
    expect(r.status).toBe(400);
    expect(await r.text()).toBe('missing signature');
    expect(h.callRpc).not.toHaveBeenCalled();
  });

  it('bad signature -> 400', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await POST(req(bounce, { badSig: true }));
    expect(r.status).toBe(400);
    expect(await r.text()).toBe('invalid signature');
    expect(h.callRpc).not.toHaveBeenCalled();
  });

  it('email.delivered -> 200 ignored, no RPC', async () => {
    const r = await POST(req({ type: 'email.delivered', data: { to: ['a@b.fr'] } }));
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('ignored');
    expect(h.callRpc).not.toHaveBeenCalled();
  });

  it('permanent bounce -> RPC with svix-id and normalised emails', async () => {
    const r = await POST(req(bounce));
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('ok');
    expect(h.callRpc).toHaveBeenCalledTimes(1);
    expect(h.callRpc).toHaveBeenCalledWith('resend/webhook', 'sv_apply_resend_event', {
      p_event_id: ID,
      p_event_type: 'email.bounced',
      p_emails: ['alice@example.com'],
      p_bounce_type: 'Permanent',
      p_admin_email: 'contact@sevalys.com',
    });
  });

  it('sends returned outbox rows; a send failure still answers 200', async () => {
    h.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'applied', outbox_ids: ['a', 'b'] } });
    h.send.mockRejectedValue(new Error('boom alice@example.com'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await POST(req(bounce));
    expect(r.status).toBe(200);
    expect(h.send).toHaveBeenCalledWith('a');
    expect(h.send).toHaveBeenCalledWith('b');
    const logged = JSON.stringify(err.mock.calls);
    expect(logged).not.toContain('alice');
    expect(logged).not.toContain(ID);
  });

  it('RPC failure -> 500 retry', async () => {
    h.callRpc.mockResolvedValue({ ok: false, code: 'rpc_error' });
    const r = await POST(req(bounce));
    expect(r.status).toBe(500);
    expect(await r.text()).toBe('retry');
  });

  it('duplicate outcome -> 200 ok', async () => {
    h.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'duplicate' } });
    const r = await POST(req(bounce));
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('ok');
    expect(h.send).not.toHaveBeenCalled();
  });
});
