import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';

const callRpc = vi.fn();
const send = vi.fn();
const randomIntMock = vi.fn((min: number, max: number) => {
  void min;
  void max;
  return 12345;
});

vi.mock('@/lib/server/rpc', () => ({ callRpc: (...a: unknown[]) => callRpc(...a) }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: (...a: unknown[]) => send(...a) };
  },
}));
vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
  return { ...actual, randomInt: (min: number, max: number) => randomIntMock(min, max) };
});

import {
  newSignatureCode,
  signatureCodeHmac,
  requestSignatureCode,
  verifySignatureCode,
} from './codes';

const args = {
  documentId: 'doc',
  userId: 'user',
  email: 'client@example.com',
  ip: '203.0.113.7',
  consentVersion: 'v1',
  documentLabel: 'le devis',
};

beforeEach(() => {
  vi.stubEnv('SV_SIGNATURE_CODE_SECRET', 'secret');
  vi.stubEnv('RESEND_API_KEY', 're_test');
  callRpc.mockReset();
  send.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('code generation', () => {
  it('pads to 6 digits and uses randomInt', () => {
    expect(newSignatureCode()).toBe('012345');
    expect(randomIntMock).toHaveBeenCalledWith(0, 1_000_000);
  });
  it('computes the documented HMAC', () => {
    expect(signatureCodeHmac('s', 'doc', 'user', '012345')).toBe(
      createHmac('sha256', 's').update('doc:user:012345').digest('hex'),
    );
  });
});

describe('requestSignatureCode', () => {
  it('fails closed without secret', async () => {
    vi.stubEnv('SV_SIGNATURE_CODE_SECRET', '');
    expect(await requestSignatureCode(args)).toEqual({ ok: false, code: 'not_configured' });
    expect(callRpc).not.toHaveBeenCalled();
  });
  it('fails closed without Resend key', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await requestSignatureCode(args)).toEqual({ ok: false, code: 'not_configured' });
    expect(callRpc).not.toHaveBeenCalled();
  });
  it('maps too_soon and hourly_cap', async () => {
    callRpc.mockResolvedValueOnce({ ok: true, data: { ok: false, reason: 'too_soon', retry_after_s: 30 } });
    expect(await requestSignatureCode(args)).toEqual({ ok: false, code: 'too_soon', retryAfterS: 30 });
    callRpc.mockResolvedValueOnce({ ok: true, data: { ok: false, reason: 'hourly_cap' } });
    expect(await requestSignatureCode(args)).toEqual({ ok: false, code: 'hourly_cap' });
  });
  it('maps raised codes', async () => {
    callRpc.mockResolvedValueOnce({ ok: false, code: 'sv_consent_missing' });
    expect(await requestSignatureCode(args)).toEqual({ ok: false, code: 'consent_missing' });
  });
  it('sends the code to the session e-mail and never logs it', async () => {
    const spies = (['log', 'error', 'warn', 'info'] as const).map((k) =>
      vi.spyOn(console, k).mockImplementation(() => {}),
    );
    callRpc.mockResolvedValueOnce({
      ok: true,
      data: { ok: true, code_id: 'cid', expires_at: '2026-01-01T00:00:00Z', sends_left: 4 },
    });
    send.mockResolvedValueOnce({ data: { id: 'x' }, error: null });
    const res = await requestSignatureCode(args);
    expect(res).toEqual({ ok: true, codeId: 'cid', expiresAt: '2026-01-01T00:00:00Z', sendsLeft: 4 });
    const [payload, opts] = send.mock.calls[0];
    expect(payload.to).toBe('client@example.com');
    expect(payload.text).toContain('012345');
    expect(opts).toEqual({ idempotencyKey: 'cid' });
    for (const s of spies) expect(JSON.stringify(s.mock.calls)).not.toContain('012345');
  });
  it('logs a failed send via sv_log_code_send_failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    callRpc.mockResolvedValueOnce({
      ok: true,
      data: { ok: true, code_id: 'cid', expires_at: 'e', sends_left: 4 },
    });
    callRpc.mockResolvedValueOnce({ ok: true, data: null });
    send.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    expect(await requestSignatureCode(args)).toEqual({ ok: false, code: 'send_failed' });
    expect(callRpc.mock.calls[1][1]).toBe('sv_log_code_send_failed');
    expect(callRpc.mock.calls[1][2]).toMatchObject({ p_code_id: 'cid' });
  });
  it('handles a thrown send', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    callRpc.mockResolvedValueOnce({
      ok: true,
      data: { ok: true, code_id: 'cid', expires_at: 'e', sends_left: 4 },
    });
    callRpc.mockResolvedValueOnce({ ok: true, data: null });
    send.mockRejectedValueOnce(new Error('net'));
    expect(await requestSignatureCode(args)).toEqual({ ok: false, code: 'send_failed' });
    expect(callRpc.mock.calls[1][1]).toBe('sv_log_code_send_failed');
  });
});

describe('verifySignatureCode', () => {
  const v = { documentId: 'doc', userId: 'user', ip: null, code: '012345' };
  it('rejects bad format without RPC', async () => {
    expect(await verifySignatureCode({ ...v, code: '12ab' })).toEqual({ ok: false, code: 'invalid_format' });
    expect(callRpc).not.toHaveBeenCalled();
  });
  it('unwraps invalid with remaining', async () => {
    callRpc.mockResolvedValueOnce({ ok: true, data: { ok: false, reason: 'invalid', remaining: 3 } });
    expect(await verifySignatureCode(v)).toEqual({ ok: false, code: 'invalid', remaining: 3 });
  });
  it('unwraps success', async () => {
    callRpc.mockResolvedValueOnce({ ok: true, data: { ok: true, already_signed: false } });
    expect(await verifySignatureCode(v)).toMatchObject({ ok: true, alreadySigned: false });
    expect(callRpc.mock.calls[0][2].p_code_hmac).toBe(signatureCodeHmac('secret', 'doc', 'user', '012345'));
  });
});
