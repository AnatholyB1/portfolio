import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createToken, formatStatus, hashTokenValue, listTokens, parseArgs, revokeToken, supabaseHost } from '../../scripts/sv-mcp-token.mjs';
import { generateToken, hashToken } from '@/lib/server/mcp/token';

type Opts = { admin?: { user_id: string } | null; insertError?: boolean; revokeRow?: { id: string } | null };

function makeSvc(o: Opts = {}) {
  const insert = vi.fn<(row: Record<string, unknown>) => unknown>(() => ({
    select: () => ({
      single: async () => (o.insertError ? { data: null, error: { message: 'x' } } : { data: { id: 'tok-id' }, error: null }),
    }),
  }));
  const update = vi.fn<(patch: Record<string, unknown>) => unknown>(() => ({
    eq: () => ({ is: () => ({ select: () => ({ maybeSingle: async () => ({ data: o.revokeRow ?? null, error: null }) }) }) }),
  }));
  const from = vi.fn((table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: table === 'sv_admins' ? (o.admin === undefined ? { user_id: 'u1' } : o.admin) : o.revokeRow ?? null,
          error: null,
        }),
      }),
    }),
    insert,
    update,
  }));
  return { svc: { from } as unknown as SupabaseClient, from, insert, update };
}

const base = { email: 'admin@sevalys.com', label: 'Claude Code PC', days: 90 };

describe('parseArgs', () => {
  it('defaults to dry run, 90 days', () => {
    expect(parseArgs(['--email', ' Admin@Sevalys.com ', '--label', 'PC'])).toMatchObject({
      email: 'admin@sevalys.com',
      label: 'PC',
      days: 90,
      yes: false,
      revoke: null,
    });
  });
  it('parses --days, --yes and --revoke', () => {
    expect(parseArgs(['--days', '30', '--yes'])).toMatchObject({ days: 30, yes: true });
    expect(parseArgs(['--revoke', 'abc', '--yes'])).toMatchObject({ revoke: 'abc', yes: true });
    expect(parseArgs(['--list', '--email', 'a@b.fr'])).toMatchObject({ list: true, email: 'a@b.fr' });
    expect(parseArgs([]).list).toBe(false);
  });
  it('flags invalid --days (non integer, <1, >365) as null', () => {
    for (const d of ['0', '366', 'x', '1.5', '-3']) expect(parseArgs(['--days', d]).days).toBeNull();
  });
});

describe('hash parity with the server', () => {
  it('uses the same sha256 hex as hashToken', () => {
    const t = generateToken();
    expect(hashTokenValue(t)).toBe(hashToken(t));
  });
});

describe('createToken', () => {
  it('refuses an email that is not in sv_admins, writes nothing', async () => {
    const m = makeSvc({ admin: null });
    expect(await createToken({ svc: m.svc, ...base, write: true })).toEqual({ status: 'not_admin', wouldWrite: false });
    expect(m.insert).not.toHaveBeenCalled();
  });

  it('dry run writes nothing and returns no token', async () => {
    const m = makeSvc();
    const r = await createToken({ svc: m.svc, ...base, write: false });
    expect(r).toEqual({ status: 'created', wouldWrite: true });
    expect(m.insert).not.toHaveBeenCalled();
  });

  it('inserts the hash (never the token) and returns the token once', async () => {
    const m = makeSvc();
    const now = new Date('2026-10-15T10:00:00Z');
    const r = await createToken({ svc: m.svc, ...base, write: true, now });
    expect(r.status).toBe('created');
    expect(r.token).toMatch(/^svmcp_[A-Za-z0-9_-]{43}$/);
    const row = m.insert.mock.calls[0][0];
    expect(row).toEqual({
      user_id: 'u1',
      token_hash: hashToken(r.token as string),
      label: 'Claude Code PC',
      expires_at: '2027-01-13T10:00:00.000Z',
    });
    expect(JSON.stringify(row)).not.toContain(r.token as string);
  });

  it('rejects invalid label and days without any call', async () => {
    const m = makeSvc();
    expect(await createToken({ svc: m.svc, ...base, label: '', write: true })).toMatchObject({ status: 'invalid' });
    expect(await createToken({ svc: m.svc, ...base, label: 'x'.repeat(81), write: true })).toMatchObject({ status: 'invalid' });
    expect(await createToken({ svc: m.svc, ...base, days: 400, write: true })).toMatchObject({ status: 'invalid' });
    expect(m.from).not.toHaveBeenCalled();
  });

  it('reports error on insert failure without a token', async () => {
    const m = makeSvc({ insertError: true });
    const r = await createToken({ svc: m.svc, ...base, write: true });
    expect(r).toMatchObject({ status: 'error' });
    expect(r.token).toBeUndefined();
  });
});

describe('revokeToken', () => {
  it('dry run does not update', async () => {
    const m = makeSvc({ revokeRow: { id: 'tok-id' } });
    expect(await revokeToken({ svc: m.svc, id: 'tok-id', write: false })).toEqual({ status: 'revoked', wouldWrite: true });
    expect(m.update).not.toHaveBeenCalled();
  });
  it('sets revoked_at with --yes', async () => {
    const m = makeSvc({ revokeRow: { id: 'tok-id' } });
    expect(await revokeToken({ svc: m.svc, id: 'tok-id', write: true })).toEqual({ status: 'revoked', wouldWrite: true });
    expect(m.update).toHaveBeenCalledWith({ revoked_at: expect.any(String) });
  });
  it('reports not_found for an unknown or already revoked id', async () => {
    const m = makeSvc({ revokeRow: null });
    expect(await revokeToken({ svc: m.svc, id: 'nope', write: true })).toMatchObject({ status: 'not_found' });
  });
});

describe('supabaseHost and formatStatus', () => {
  it('returns only the hostname, never credentials or path', () => {
    expect(supabaseHost('https://abc.supabase.co/rest/v1?apikey=secret')).toBe('abc.supabase.co');
    expect(supabaseHost('not a url')).toBe('(url invalide)');
  });
  it('uses conditional wording on a dry run and past tense after a write', () => {
    expect(formatStatus('create', 'created', false)).toBe('would create');
    expect(formatStatus('create', 'created', true)).toBe('created');
    expect(formatStatus('revoke', 'revoked', false)).toBe('would revoke');
    expect(formatStatus('revoke', 'revoked', true)).toBe('revoked');
    expect(formatStatus('create', 'not_admin', false)).toBe('not_admin');
  });
});

describe('listTokens', () => {
  function listSvc(rows: unknown[], admin: { user_id: string } | null = { user_id: 'u1' }) {
    const select = vi.fn<(cols: string) => unknown>(() => ({ eq: () => ({ order: async () => ({ data: rows, error: null }) }) }));
    const from = vi.fn((table: string) =>
      table === 'sv_admins'
        ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: admin, error: null }) }) }) }
        : { select },
    );
    return { svc: { from } as unknown as SupabaseClient, select };
  }
  it('lists id, label, expiry and revocation, never hashes', async () => {
    const m = listSvc([{ id: 't1', label: 'PC', expires_at: 'e', revoked_at: null }]);
    const r = await listTokens({ svc: m.svc, email: 'a@b.fr' });
    expect(r).toEqual({ status: 'listed', tokens: [{ id: 't1', label: 'PC', expires_at: 'e', revoked_at: null }] });
    expect(m.select.mock.calls[0][0]).not.toContain('token_hash');
    expect(m.select.mock.calls[0][0]).toBe('id, label, expires_at, revoked_at');
  });
  it('refuses a non admin email', async () => {
    const m = listSvc([], null);
    expect(await listTokens({ svc: m.svc, email: 'a@b.fr' })).toEqual({ status: 'not_admin', tokens: [] });
  });
});
