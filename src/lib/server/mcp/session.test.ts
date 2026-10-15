import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserById = vi.fn();
const generateLink = vi.fn();
const verifyOtp = vi.fn();
const createClient = vi.fn();
const maybeSingle = vi.fn();

vi.mock('@supabase/supabase-js', () => ({ createClient: (...a: unknown[]) => createClient(...a) }));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    auth: { admin: { getUserById, generateLink } },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));
vi.mock('@/lib/supabase/env', () => ({
  getSupabaseUrl: () => 'https://x.supabase.co',
  getSupabasePublicKey: () => 'pub',
}));

import { __resetSessionCache, buildAdminContext } from './session';

const user = { id: 'uid', email: 'a@b.fr' };

beforeEach(() => {
  vi.clearAllMocks();
  __resetSessionCache();
  maybeSingle.mockResolvedValue({ data: { user_id: 'uid' } });
  getUserById.mockResolvedValue({ data: { user }, error: null });
  generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'h' } }, error: null });
  verifyOtp.mockResolvedValue({ data: { session: { access_token: 'jwt', user: { id: 'uid' } } }, error: null });
  createClient.mockImplementation((_u: string, _k: string, opts: { global?: unknown }) =>
    opts.global ? { marker: 'rls' } : { auth: { verifyOtp } },
  );
});

describe('buildAdminContext', () => {
  it('exchanges a magic link for an RLS session of the admin', async () => {
    const ctx = await buildAdminContext('uid');
    expect(getUserById).toHaveBeenCalledWith('uid');
    expect(generateLink).toHaveBeenCalledWith({ type: 'magiclink', email: 'a@b.fr' });
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'h', type: 'magiclink' });
    expect(ctx.user).toBe(user);
    expect(ctx.supabase).toEqual({ marker: 'rls' });
    expect(createClient).toHaveBeenLastCalledWith(
      'https://x.supabase.co',
      'pub',
      expect.objectContaining({ global: { headers: { Authorization: 'Bearer jwt' } } }),
    );
  });
  it('fails when the user has no email', async () => {
    getUserById.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null });
    await expect(buildAdminContext('uid')).rejects.toThrow('mcp_session_failed');
  });
  it('fails when verifyOtp errors', async () => {
    verifyOtp.mockResolvedValue({ data: { session: null }, error: new Error('x') });
    await expect(buildAdminContext('uid')).rejects.toThrow('mcp_session_failed');
  });
  it('fails when the session belongs to another user', async () => {
    verifyOtp.mockResolvedValue({ data: { session: { access_token: 'jwt', user: { id: 'other' } } }, error: null });
    await expect(buildAdminContext('uid')).rejects.toThrow('mcp_session_failed');
  });
  it('fails when the user is no longer an admin', async () => {
    maybeSingle.mockResolvedValue({ data: null });
    await expect(buildAdminContext('uid')).rejects.toThrow('mcp_session_failed');
    expect(generateLink).not.toHaveBeenCalled();
  });
  it('dedupes concurrent calls and caches the context for 10 minutes', async () => {
    vi.useFakeTimers();
    try {
      const [a, b] = await Promise.all([buildAdminContext('uid'), buildAdminContext('uid')]);
      expect(a).toBe(b);
      expect(generateLink).toHaveBeenCalledTimes(1);
      await buildAdminContext('uid');
      expect(generateLink).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(10 * 60_000 + 1);
      await buildAdminContext('uid');
      expect(generateLink).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
  it('does not cache failures', async () => {
    verifyOtp.mockResolvedValueOnce({ data: { session: null }, error: new Error('x') });
    await expect(buildAdminContext('uid')).rejects.toThrow('mcp_session_failed');
    await expect(buildAdminContext('uid')).resolves.toBeDefined();
  });
});
