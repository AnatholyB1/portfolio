import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestLoginCode = vi.fn();
const checkVerifyThrottle = vi.fn();
const getRoleDestination = vi.fn();
const verifyOtp = vi.fn();
const signOut = vi.fn();
const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const afterMock = vi.fn();

vi.mock('@/lib/server/auth/login', () => ({
  LOGIN_VERIFY_TYPES: { code: 'email', link: 'email' },
  requestLoginCode: (...a: unknown[]) => requestLoginCode(...a),
  checkVerifyThrottle: (...a: unknown[]) => checkVerifyThrottle(...a),
}));
vi.mock('@/lib/server/auth/dal', () => ({
  getRoleDestination: (...a: unknown[]) => getRoleDestination(...a),
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({ auth: { verifyOtp, signOut } }),
}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }),
}));
vi.mock('next/server', () => ({ after: (fn: unknown) => afterMock(fn) }));
vi.mock('next/navigation', () => ({ redirect: (u: string) => redirectMock(u) }));

import { LOGIN_COPY } from '@/lib/auth/schemas';
import { confirmLinkAction } from '@/app/auth/confirm/actions';
import { requestCodeAction, verifyCodeAction } from './actions';

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const prev = { step: 'email' as const };
const CODE = '12345678';

beforeEach(() => {
  vi.clearAllMocks();
  checkVerifyThrottle.mockResolvedValue(true);
  verifyOtp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  getRoleDestination.mockResolvedValue('/espace-client');
  signOut.mockResolvedValue({});
});

describe('requestCodeAction', () => {
  it('sent: advances to the code step with the identical message and a resend time', async () => {
    requestLoginCode.mockResolvedValue({ status: 'sent' });
    const s = await requestCodeAction(prev, fd({ email: 'a@b.co' }));
    expect(s.step).toBe('code');
    expect(s.email).toBe('a@b.co');
    expect(s.message).toBe(LOGIN_COPY.identical);
    expect(s.resendAt).toBeGreaterThan(Date.now());
  });
  it('passes the first forwarded IP and the after scheduler', async () => {
    requestLoginCode.mockResolvedValue({ status: 'sent' });
    await requestCodeAction(prev, fd({ email: 'a@b.co' }));
    const [input, schedule] = requestLoginCode.mock.calls[0];
    expect(input.ip).toBe('203.0.113.7');
    schedule(async () => {});
    expect(afterMock).toHaveBeenCalled();
  });
  it('invalid and rate_limited map to the UI-SPEC errors', async () => {
    requestLoginCode.mockResolvedValue({ status: 'invalid' });
    expect(await requestCodeAction(prev, fd({ email: 'x' }))).toEqual({
      step: 'email',
      error: LOGIN_COPY.invalidEmail,
    });
    requestLoginCode.mockResolvedValue({ status: 'rate_limited' });
    expect((await requestCodeAction(prev, fd({ email: 'a@b.co' }))).error).toBe(LOGIN_COPY.rateLimited);
  });
  it('invited and unknown addresses give deep-equal states', async () => {
    requestLoginCode.mockResolvedValue({ status: 'sent' });
    const a = await requestCodeAction(prev, fd({ email: 'a@b.co' }));
    const b = await requestCodeAction(prev, fd({ email: 'a@b.co' }));
    expect({ ...a, resendAt: 0 }).toEqual({ ...b, resendAt: 0 });
  });
});

describe('verifyCodeAction', () => {
  const state = { step: 'code' as const, email: 'a@b.co' };
  it('rejects a malformed code without calling verifyOtp', async () => {
    const s = await verifyCodeAction(state, fd({ email: 'a@b.co', code: '123' }));
    expect(s.error).toBe(LOGIN_COPY.wrongCode);
    expect(s.step).toBe('code');
    expect(verifyOtp).not.toHaveBeenCalled();
  });
  it('rejects a 6-digit code (length is OTP_LENGTH = 8)', async () => {
    const s = await verifyCodeAction(state, fd({ email: 'a@b.co', code: '123456' }));
    expect(s.error).toBe(LOGIN_COPY.wrongCode);
  });
  it('throttled: rateLimited, no verifyOtp', async () => {
    checkVerifyThrottle.mockResolvedValue(false);
    const s = await verifyCodeAction(state, fd({ email: 'a@b.co', code: CODE }));
    expect(s.error).toBe(LOGIN_COPY.rateLimited);
    expect(verifyOtp).not.toHaveBeenCalled();
  });
  it('verifyOtp error: wrongCode', async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { message: 'bad' } });
    const s = await verifyCodeAction(state, fd({ email: 'a@b.co', code: CODE }));
    expect(s.error).toBe(LOGIN_COPY.wrongCode);
  });
  it('uses the LOGIN_VERIFY_TYPES.code type', async () => {
    await expect(verifyCodeAction(state, fd({ email: 'a@b.co', code: CODE }))).rejects.toThrow();
    expect(verifyOtp).toHaveBeenCalledWith({ email: 'a@b.co', token: CODE, type: 'email' });
  });
  it('client redirects to /espace-client, admin to /admin', async () => {
    await expect(verifyCodeAction(state, fd({ email: 'a@b.co', code: CODE }))).rejects.toThrow(
      'NEXT_REDIRECT:/espace-client',
    );
    getRoleDestination.mockResolvedValue('/admin');
    await expect(verifyCodeAction(state, fd({ email: 'a@b.co', code: CODE }))).rejects.toThrow(
      'NEXT_REDIRECT:/admin',
    );
  });
  it('safeNext refuses an open redirect', async () => {
    getRoleDestination.mockResolvedValue('/admin');
    await expect(
      verifyCodeAction(state, fd({ email: 'a@b.co', code: CODE, next: 'https://evil.example' })),
    ).rejects.toThrow('NEXT_REDIRECT:/admin');
  });
  it('no role: signs out and returns the generic error', async () => {
    getRoleDestination.mockResolvedValue(null);
    const s = await verifyCodeAction(state, fd({ email: 'a@b.co', code: CODE }));
    expect(signOut).toHaveBeenCalled();
    expect(s.error).toBe(LOGIN_COPY.generic);
  });
  it('never echoes the code in the returned state', async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { message: 'bad' } });
    const s = await verifyCodeAction(state, fd({ email: 'a@b.co', code: CODE }));
    expect(JSON.stringify(s)).not.toContain(CODE);
  });
});

describe('confirmLinkAction', () => {
  it('verifies token_hash with LOGIN_VERIFY_TYPES.link and ignores a client type', async () => {
    await expect(
      confirmLinkAction({}, fd({ token_hash: 'abc', type: 'recovery' })),
    ).rejects.toThrow('NEXT_REDIRECT:/espace-client');
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'email' });
  });
  it('failure: wrongCode', async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { message: 'x' } });
    expect(await confirmLinkAction({}, fd({ token_hash: 'abc' }))).toEqual({ error: LOGIN_COPY.wrongCode });
  });
  it('empty or oversized token_hash: wrongCode without verifyOtp', async () => {
    expect((await confirmLinkAction({}, fd({ token_hash: '' }))).error).toBe(LOGIN_COPY.wrongCode);
    expect((await confirmLinkAction({}, fd({ token_hash: 'a'.repeat(201) }))).error).toBe(LOGIN_COPY.wrongCode);
    expect(verifyOtp).not.toHaveBeenCalled();
  });
  it('no role: signs out and returns generic', async () => {
    getRoleDestination.mockResolvedValue(null);
    const s = await confirmLinkAction({}, fd({ token_hash: 'abc' }));
    expect(signOut).toHaveBeenCalled();
    expect(s.error).toBe(LOGIN_COPY.generic);
  });
});
