/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  admins: [] as unknown[],
  members: [] as unknown[],
  authUsers: [] as unknown[],
  existingClient: null as { id: string } | null,
  createUserResult: { data: { user: { id: 'new-user' } }, error: null } as any,
  clientInsert: { data: { id: 'new-client' }, error: null } as any,
  memberInsert: { error: null } as any,
  sendResult: { error: null } as any,
  sendThrows: false,
  loginEnabled: true,
}));

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  rpc: vi.fn(),
  clientInsert: vi.fn(),
  memberInsert: vi.fn(),
  clientDelete: vi.fn(),
  send: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/env', () => ({
  isLoginEnabled: () => state.loginEnabled,
  getSiteUrl: () => 'https://sevalys.com',
}));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
    auth: { admin: { createUser: mocks.createUser, deleteUser: mocks.deleteUser } },
  }),
}));

import { inviteClient, resendInvitation } from './invite';

const valid = {
  name: 'Acme',
  email: 'Client@Example.com',
  siret: '55210055400025',
  company: { nom: 'ACME SAS' },
  companySource: 'api',
};
const actor = { userId: 'admin-1' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Object.assign(state, {
    admins: [],
    members: [],
    authUsers: [],
    existingClient: null,
    createUserResult: { data: { user: { id: 'new-user' } }, error: null },
    clientInsert: { data: { id: 'new-client' }, error: null },
    memberInsert: { error: null },
    sendResult: { error: null },
    sendThrows: false,
    loginEnabled: true,
  });
  mocks.createUser.mockImplementation(async () => state.createUserResult);
  mocks.deleteUser.mockResolvedValue({ error: null });
  mocks.rpc.mockImplementation(async () => ({ data: state.authUsers, error: null }));
  mocks.clientInsert.mockImplementation(() => ({
    select: () => ({ single: async () => state.clientInsert }),
  }));
  mocks.memberInsert.mockImplementation(async () => state.memberInsert);
  mocks.clientDelete.mockReturnValue({ eq: async () => ({ error: null }) });
  mocks.send.mockImplementation(async () => {
    if (state.sendThrows) throw new Error('boom');
    return state.sendResult;
  });
  mocks.from.mockImplementation((table: string) => {
    if (table === 'sv_admins') {
      return { select: () => ({ eq: () => ({ limit: async () => ({ data: state.admins, error: null }) }) }) };
    }
    if (table === 'sv_client_members') {
      return {
        select: () => ({ eq: () => ({ limit: async () => ({ data: state.members, error: null }) }) }),
        insert: mocks.memberInsert,
      };
    }
    if (table === 'sv_clients') {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.existingClient, error: null }) }) }),
        insert: mocks.clientInsert,
        delete: mocks.clientDelete,
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
});

describe('inviteClient', () => {
  it('rejects invalid input with no DB call', async () => {
    expect(await inviteClient({ email: 'x' }, actor)).toEqual({ ok: false, code: 'invalid' });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('returns mail_disabled when login is not enabled, with no DB call', async () => {
    state.loginEnabled = false;
    expect(await inviteClient(valid, actor)).toEqual({ ok: false, code: 'mail_disabled' });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('rejects an admin email as role_conflict', async () => {
    state.admins = [{ user_id: 'a' }];
    expect(await inviteClient(valid, actor)).toEqual({ ok: false, code: 'role_conflict' });
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it('rejects an existing member as already_member', async () => {
    state.members = [{ user_id: 'm' }];
    expect(await inviteClient(valid, actor)).toEqual({ ok: false, code: 'already_member' });
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it('blocks a pre-existing shared auth account, never creating or deleting', async () => {
    state.authUsers = [{ id: 'u', last_sign_in_at: null }];
    expect(await inviteClient(valid, actor)).toEqual({ ok: false, code: 'existing_account' });
    expect(mocks.rpc).toHaveBeenCalledWith('sv_find_auth_user', { p_email: 'client@example.com' });
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('creates a passwordless user, client, member and sends the email', async () => {
    const r = await inviteClient(valid, actor);
    expect(r).toEqual({ ok: true, clientId: 'new-client', email: 'client@example.com', mailSent: true });
    expect(mocks.createUser).toHaveBeenCalledWith({ email: 'client@example.com', email_confirm: true });
    expect(Object.keys(mocks.createUser.mock.calls[0][0])).not.toContain('password');
    expect(mocks.clientInsert).toHaveBeenCalledWith({
      name: 'Acme',
      siret: '55210055400025',
      company: { nom: 'ACME SAS' },
      company_source: 'api',
      created_by: 'admin-1',
    });
    expect(mocks.memberInsert).toHaveBeenCalledWith({
      client_id: 'new-client',
      user_id: 'new-user',
      invited_email: 'client@example.com',
    });
    const mail = mocks.send.mock.calls[0][0];
    expect(mail.from).toBe('"Sèvalys" <connexion@sevalys.com>');
    expect(mail.to).toBe('client@example.com');
    expect(mail.html).toContain('https://sevalys.com/connexion?email=client%40example.com');
  });

  it('reuses an existing client for the same SIRET (D-03)', async () => {
    state.existingClient = { id: 'old-client' };
    const r = await inviteClient(valid, actor);
    expect(r).toMatchObject({ ok: true, clientId: 'old-client' });
    expect(mocks.clientInsert).not.toHaveBeenCalled();
    expect(mocks.memberInsert).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'old-client' }));
  });

  it('rolls back on sv_role_conflict from the member insert', async () => {
    state.memberInsert = { error: { message: 'sv_role_conflict' } };
    expect(await inviteClient(valid, actor)).toEqual({ ok: false, code: 'role_conflict' });
    expect(mocks.deleteUser).toHaveBeenCalledWith('new-user');
    expect(mocks.clientDelete).toHaveBeenCalled();
  });

  it('keeps an existing client on rollback', async () => {
    state.existingClient = { id: 'old-client' };
    state.memberInsert = { error: { message: 'other' } };
    expect(await inviteClient(valid, actor)).toEqual({ ok: false, code: 'error' });
    expect(mocks.deleteUser).toHaveBeenCalledWith('new-user');
    expect(mocks.clientDelete).not.toHaveBeenCalled();
  });

  it('rolls back on other member insert failures', async () => {
    state.memberInsert = { error: { message: 'db down' } };
    expect(await inviteClient(valid, actor)).toEqual({ ok: false, code: 'error' });
    expect(mocks.deleteUser).toHaveBeenCalledWith('new-user');
    expect(mocks.clientDelete).toHaveBeenCalled();
  });

  it('rolls back the user when the client insert fails', async () => {
    state.clientInsert = { data: null, error: { message: 'x' } };
    expect(await inviteClient(valid, actor)).toEqual({ ok: false, code: 'error' });
    expect(mocks.deleteUser).toHaveBeenCalledWith('new-user');
    expect(mocks.memberInsert).not.toHaveBeenCalled();
  });

  it('keeps rows when Resend fails and logs without the email', async () => {
    state.sendResult = { error: { message: 'bad' } };
    const r = await inviteClient(valid, actor);
    expect(r).toMatchObject({ ok: true, mailSent: false });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    const logged = JSON.stringify((console.error as any).mock.calls);
    expect(logged).toContain('[admin/invite]');
    expect(logged).not.toContain('client@example.com');
  });

  it('keeps rows when Resend throws', async () => {
    state.sendThrows = true;
    expect(await inviteClient(valid, actor)).toMatchObject({ ok: true, mailSent: false });
  });
});

describe('resendInvitation', () => {
  const CID = '11111111-1111-1111-1111-111111111111';
  let memberData: unknown[];
  let clientData: unknown;

  beforeEach(() => {
    memberData = [{ invited_email: 'client@example.com' }];
    clientData = { name: 'Acme' };
    mocks.from.mockImplementation((table: string) => {
      if (table === 'sv_client_members') {
        return {
          select: () => ({
            eq: () => ({ order: () => ({ limit: async () => ({ data: memberData, error: null }) }) }),
          }),
        };
      }
      if (table === 'sv_clients') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: clientData, error: null }) }) }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
  });

  it('rejects a malformed id with no DB call', async () => {
    expect(await resendInvitation('x')).toEqual({ ok: false, code: 'invalid' });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('returns mail_disabled when login is off', async () => {
    state.loginEnabled = false;
    expect(await resendInvitation(CID)).toEqual({ ok: false, code: 'mail_disabled' });
  });

  it('re-sends the email with the prefilled login link and creates nothing', async () => {
    expect(await resendInvitation(CID)).toEqual({ ok: true, email: 'client@example.com' });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send.mock.calls[0][0].to).toBe('client@example.com');
    expect(mocks.send.mock.calls[0][0].html).toContain('connexion?email=client%40example.com');
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.clientInsert).not.toHaveBeenCalled();
    expect(mocks.memberInsert).not.toHaveBeenCalled();
  });

  it('returns not_found when no member exists', async () => {
    memberData = [];
    expect(await resendInvitation(CID)).toEqual({ ok: false, code: 'not_found' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('returns mail_failed when Resend errors', async () => {
    state.sendResult = { error: { message: 'bad' } };
    expect(await resendInvitation(CID)).toEqual({ ok: false, code: 'mail_failed' });
  });
});
