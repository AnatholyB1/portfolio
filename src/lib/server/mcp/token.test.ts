import { describe, expect, it, vi } from 'vitest';
import { generateToken, hashToken, isUsable, resolveToken } from './token';

describe('mcp token', () => {
  it('generates a prefixed high-entropy token and a stable sha256 hash', () => {
    const t = generateToken();
    expect(t).toMatch(/^svmcp_[A-Za-z0-9_-]{43}$/);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(generateToken()).not.toBe(t);
  });
  it('refuses revoked and expired tokens', () => {
    const now = new Date('2026-10-15T10:00:00Z');
    const ok = { revoked_at: null, expires_at: '2026-11-01T00:00:00Z' };
    expect(isUsable(ok, now)).toBe(true);
    expect(isUsable({ ...ok, revoked_at: '2026-10-01T00:00:00Z' }, now)).toBe(false);
    expect(isUsable({ ...ok, expires_at: '2026-10-15T09:59:59Z' }, now)).toBe(false);
  });
});

describe('resolveToken header parsing', () => {
  const svc = vi.hoisted(() => ({ from: vi.fn() }));
  vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => svc }));

  it('rejects a malformed token without touching the database', async () => {
    svc.from.mockClear();
    expect(await resolveToken('Bearer svmcp_short')).toEqual({ kind: 'invalid' });
    expect(await resolveToken('Bearer SVMCP_' + 'a'.repeat(43))).toEqual({ kind: 'invalid' });
    expect(svc.from).not.toHaveBeenCalled();
  });
  it('accepts the Bearer scheme in any case', async () => {
    svc.from.mockClear();
    svc.from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    });
    await resolveToken('bearer ' + generateToken());
    await resolveToken('BEARER ' + generateToken());
    expect(svc.from).toHaveBeenCalledTimes(2);
  });
  it('is unavailable (not invalid) when a query errors', async () => {
    const tok = generateToken();
    svc.from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'down' } }) }) }),
    });
    expect(await resolveToken('Bearer ' + tok)).toEqual({ kind: 'unavailable' });
  });
  it('is unavailable when the sv_admins lookup errors', async () => {
    const tok = generateToken();
    svc.from.mockImplementation((t: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            t === 'sv_mcp_tokens'
              ? { data: { id: 'i', user_id: 'u', revoked_at: null, expires_at: '2999-01-01T00:00:00Z' }, error: null }
              : { data: null, error: { message: 'down' } },
        }),
      }),
    }));
    expect(await resolveToken('Bearer ' + tok)).toEqual({ kind: 'unavailable' });
  });
  it('is ok with the principal for a usable token of a current admin', async () => {
    const tok = generateToken();
    const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
    svc.from.mockImplementation((t: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            t === 'sv_mcp_tokens'
              ? { data: { id: 'i', user_id: 'u', revoked_at: null, expires_at: '2999-01-01T00:00:00Z' }, error: null }
              : { data: { user_id: 'u' }, error: null },
        }),
      }),
      update,
    }));
    expect(await resolveToken('Bearer ' + tok)).toEqual({ kind: 'ok', principal: { tokenId: 'i', userId: 'u' } });
  });
});
