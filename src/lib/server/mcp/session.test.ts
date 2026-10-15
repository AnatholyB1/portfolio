import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserById = vi.fn();
const generateLink = vi.fn();
const verifyOtp = vi.fn();
const createClient = vi.fn();

vi.mock('@supabase/supabase-js', () => ({ createClient: (...a: unknown[]) => createClient(...a) }));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ auth: { admin: { getUserById, generateLink } } }),
}));
vi.mock('@/lib/supabase/env', () => ({
  getSupabaseUrl: () => 'https://x.supabase.co',
  getSupabasePublicKey: () => 'pub',
}));

import { buildAdminContext } from './session';

const user = { id: 'uid', email: 'a@b.fr' };

beforeEach(() => {
  vi.clearAllMocks();
  getUserById.mockResolvedValue({ data: { user }, error: null });
  generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'h' } }, error: null });
  verifyOtp.mockResolvedValue({ data: { session: { access_token: 'jwt' } }, error: null });
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
});
