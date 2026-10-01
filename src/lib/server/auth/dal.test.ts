import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpcMock = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ rpc: rpcMock }),
}));

const getUser = vi.fn();
const getClaims = vi.fn();
const signOut = vi.fn();
const tables: Record<string, { data: unknown }> = {};

const fakeSupabase = {
  auth: { getUser, getClaims, signOut },
  from: (table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => tables[table] ?? { data: null },
    };
    return chain;
  },
};
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => fakeSupabase,
}));

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const notFoundMock = vi.fn(() => {
  throw new Error('NOT_FOUND');
});
vi.mock('next/navigation', () => ({ redirect: redirectMock, notFound: notFoundMock }));

const { isSessionFresh } = await import('./session-age');
const { getVerifiedSession, probeSession, requireAdmin, requireClient, getRoleDestination } =
  await import('./dal');

const user = { id: 'u1', email: 'a@b.fr' };

function sessionIs(opts: { user: unknown; fresh?: boolean }) {
  getUser.mockResolvedValue({ data: { user: opts.user } });
  getClaims.mockResolvedValue({ data: { claims: { session_id: 's1' } } });
  rpcMock.mockResolvedValue({ data: opts.fresh ?? true, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(tables)) delete tables[k];
});

describe('isSessionFresh', () => {
  it('returns false without calling the RPC when there is no session id', async () => {
    expect(await isSessionFresh(undefined)).toBe(false);
    expect(rpcMock).not.toHaveBeenCalled();
  });
  it('returns true when the RPC says true', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    expect(await isSessionFresh('s1')).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('sv_session_age_ok', { p_session_id: 's1', p_max_days: 30 });
  });
  it('fails closed on RPC error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await isSessionFresh('s1')).toBe(false);
  });
});

describe('getVerifiedSession', () => {
  it('returns null without a user', async () => {
    sessionIs({ user: null });
    expect(await getVerifiedSession()).toBeNull();
  });
  it('returns the context for a fresh session', async () => {
    sessionIs({ user });
    const res = await getVerifiedSession();
    expect(res?.user).toBe(user);
  });
  it('signs out and redirects a stale session', async () => {
    sessionIs({ user, fresh: false });
    await expect(getVerifiedSession()).rejects.toThrow('REDIRECT:/connexion?expired=1');
    expect(signOut).toHaveBeenCalled();
  });
});

describe('probeSession (loop guard)', () => {
  it('returns null without a user', async () => {
    sessionIs({ user: null });
    expect(await probeSession()).toBeNull();
  });
  it('reports fresh without redirect or signOut', async () => {
    sessionIs({ user });
    expect((await probeSession())?.fresh).toBe(true);
    expect(redirectMock).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
  it('reports stale without redirect or signOut', async () => {
    sessionIs({ user, fresh: false });
    expect((await probeSession())?.fresh).toBe(false);
    expect(redirectMock).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  it('redirects anonymous users to /connexion', async () => {
    sessionIs({ user: null });
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/connexion?next=/admin');
  });
  it('404s a session without admin row', async () => {
    sessionIs({ user });
    await expect(requireAdmin()).rejects.toThrow('NOT_FOUND');
  });
  it('returns the context for an admin', async () => {
    sessionIs({ user });
    tables.sv_admins = { data: { user_id: 'u1' } };
    expect((await requireAdmin()).user).toBe(user);
  });
});

describe('requireClient', () => {
  it('redirects anonymous users to /connexion', async () => {
    sessionIs({ user: null });
    await expect(requireClient()).rejects.toThrow('REDIRECT:/connexion?next=/espace-client');
  });
  it('redirects admins to /admin', async () => {
    sessionIs({ user });
    tables.sv_admins = { data: { user_id: 'u1' } };
    await expect(requireClient()).rejects.toThrow('REDIRECT:/admin');
  });
  it('returns ok with the client for a member', async () => {
    sessionIs({ user });
    tables.sv_client_members = {
      data: { client_id: 'c1', sv_clients: { id: 'c1', name: 'Gecko' } },
    };
    const res = await requireClient();
    expect(res.status).toBe('ok');
    if (res.status === 'ok') expect(res.client).toEqual({ id: 'c1', name: 'Gecko' });
  });
  it('returns no_access without any role', async () => {
    sessionIs({ user });
    const res = await requireClient();
    expect(res.status).toBe('no_access');
  });
});

describe('getRoleDestination', () => {
  it('maps admin, member and none', async () => {
    tables.sv_admins = { data: { user_id: 'u1' } };
    expect(await getRoleDestination(fakeSupabase as never, 'u1')).toBe('/admin');
    delete tables.sv_admins;
    tables.sv_client_members = { data: { client_id: 'c1' } };
    expect(await getRoleDestination(fakeSupabase as never, 'u1')).toBe('/espace-client');
    delete tables.sv_client_members;
    expect(await getRoleDestination(fakeSupabase as never, 'u1')).toBeNull();
  });
});

describe('static guarantees', () => {
  it('never reads metadata or getSession for role decisions', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/server/auth/dal.ts'), 'utf8');
    const code = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(code).not.toMatch(/user_metadata|app_metadata|getSession\(/);
  });
});
