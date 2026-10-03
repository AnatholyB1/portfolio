/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ loginEnabled: true }));
const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  check: vi.fn(),
  callRpc: vi.fn(),
  send: vi.fn(),
  sync: vi.fn(),
}));

vi.mock('@/lib/supabase/env', () => ({ isLoginEnabled: () => state.loginEnabled }));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    auth: { admin: { createUser: mocks.createUser, deleteUser: mocks.deleteUser } },
  }),
}));
vi.mock('@/lib/server/clients/invite', () => ({ checkInviteeEmail: mocks.check }));
vi.mock('@/lib/server/rpc', () => ({ callRpc: mocks.callRpc }));
vi.mock('@/lib/server/mail/outbox', () => ({ sendOutboxRow: mocks.send }));
vi.mock('@/lib/server/projects/onboarding', () => ({ syncOnboardingFacts: mocks.sync }));

import { convertLead } from './convert';

const valid = {
  leadId: '11111111-1111-4111-8111-111111111111',
  name: 'Acme',
  email: 'Client@Example.com',
  siret: '55210055400025',
  company: { nom: 'ACME SAS' },
  companySource: 'api',
  offer: 'site-vitrine',
  projectTitle: 'Site Acme',
};
const actor = { userId: 'admin-1' };
const rpcOk = (over: Record<string, unknown> = {}) => ({
  ok: true,
  data: { client_id: 'c1', project_id: 'p1', client_reused: false, outbox_id: 'o1', ...over },
});

let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  state.loginEnabled = true;
  mocks.check.mockResolvedValue('ok');
  mocks.createUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  mocks.deleteUser.mockResolvedValue({});
  mocks.callRpc.mockResolvedValue(rpcOk());
  mocks.send.mockResolvedValue('sent');
  mocks.sync.mockResolvedValue(undefined);
});

describe('convertLead', () => {
  it('rejects invalid input without touching the admin client', async () => {
    const res = await convertLead({ ...valid, offer: 'nope' }, actor);
    expect(res).toEqual({ ok: false, code: 'invalid' });
    expect(mocks.check).not.toHaveBeenCalled();
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it('returns mail_disabled when login is off', async () => {
    state.loginEnabled = false;
    expect(await convertLead(valid, actor)).toEqual({ ok: false, code: 'mail_disabled' });
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it.each(['role_conflict', 'already_member', 'existing_account'])(
    'refuses %s before createUser',
    async (code) => {
      mocks.check.mockResolvedValue(code);
      expect(await convertLead(valid, actor)).toEqual({ ok: false, code });
      expect(mocks.createUser).not.toHaveBeenCalled();
      expect(mocks.callRpc).not.toHaveBeenCalled();
    },
  );

  it('maps an e-mail check error', async () => {
    mocks.check.mockResolvedValue('error');
    expect(await convertLead(valid, actor)).toEqual({ ok: false, code: 'error' });
  });

  it('fails when createUser fails', async () => {
    mocks.createUser.mockResolvedValue({ data: null, error: { message: 'x' } });
    expect(await convertLead(valid, actor)).toEqual({ ok: false, code: 'error' });
    expect(mocks.callRpc).not.toHaveBeenCalled();
  });

  it.each([
    ['sv_lead_already_converted', 'already_converted'],
    ['sv_lead_not_convertible', 'not_convertible'],
    ['sv_role_conflict', 'role_conflict'],
    ['sv_lead_not_found', 'not_found'],
    ['sv_lead_erased', 'not_found'],
    ['sv_invalid_siret', 'error'],
    ['unknown', 'error'],
  ])('RPC %s deletes the auth user and returns %s', async (rpcCode, code) => {
    mocks.callRpc.mockResolvedValue({ ok: false, code: rpcCode });
    expect(await convertLead(valid, actor)).toEqual({ ok: false, code });
    expect(mocks.deleteUser).toHaveBeenCalledWith('u1');
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('passes the actor and normalized args to the RPC', async () => {
    await convertLead(valid, actor);
    expect(mocks.callRpc).toHaveBeenCalledWith(
      'admin/convert',
      'sv_convert_lead',
      expect.objectContaining({ p_actor: 'admin-1', p_user_id: 'u1', p_offer: 'site-vitrine' }),
    );
  });

  it('success sends the outbox row once and reports mailSent', async () => {
    const res = await convertLead(valid, actor);
    expect(res).toMatchObject({ ok: true, clientId: 'c1', projectId: 'p1', clientReused: false, mailSent: true });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith('o1');
    expect(mocks.sync).not.toHaveBeenCalled();
  });

  it('mailSent is false when the send fails', async () => {
    mocks.send.mockResolvedValue('failed');
    expect(await convertLead(valid, actor)).toMatchObject({ ok: true, mailSent: false });
  });

  it('null outbox_id still succeeds without sending', async () => {
    mocks.callRpc.mockResolvedValue(rpcOk({ outbox_id: null }));
    expect(await convertLead(valid, actor)).toMatchObject({ ok: true, mailSent: false });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('a rejecting sendOutboxRow does not roll back', async () => {
    mocks.send.mockRejectedValue(new Error('smtp'));
    expect(await convertLead(valid, actor)).toMatchObject({ ok: true, mailSent: false });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('syncs onboarding facts once for a reused client', async () => {
    mocks.callRpc.mockResolvedValue(rpcOk({ client_reused: true }));
    expect(await convertLead(valid, actor)).toMatchObject({ ok: true, clientReused: true });
    expect(mocks.sync).toHaveBeenCalledTimes(1);
    expect(mocks.sync).toHaveBeenCalledWith('c1');
  });

  it('a failing onboarding sync does not break the conversion', async () => {
    mocks.callRpc.mockResolvedValue(rpcOk({ client_reused: true }));
    mocks.sync.mockRejectedValue(new Error('x'));
    expect(await convertLead(valid, actor)).toMatchObject({ ok: true });
  });

  it('never logs the e-mail address', async () => {
    mocks.send.mockRejectedValue(new Error('smtp'));
    mocks.callRpc.mockResolvedValueOnce({ ok: false, code: 'sv_lead_not_found' });
    await convertLead(valid, actor);
    mocks.callRpc.mockResolvedValue(rpcOk({ client_reused: true }));
    mocks.sync.mockRejectedValue(new Error('x'));
    await convertLead(valid, actor);
    const logged = JSON.stringify(errSpy.mock.calls).toLowerCase();
    expect(logged).not.toContain('example.com');
  });
});
