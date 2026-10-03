/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  row: null as any,
  upserts: [] as any[],
}));
const mocks = vi.hoisted(() => ({ post: vi.fn(), send: vi.fn() }));

function builder(table: string) {
  const b: any = {};
  for (const m of ['select', 'eq']) b[m] = () => b;
  b.upsert = (row: any) => {
    state.upserts.push(row);
    state.row = { ...(state.row ?? {}), ...row };
    return Promise.resolve({ error: null });
  };
  b.maybeSingle = async () => {
    if (table === 'sv_clients') return { data: { name: 'Acme' }, error: null };
    return { data: state.row, error: null };
  };
  b.then = (res: any, rej: any) =>
    Promise.resolve({ data: [{ id: 'p1', title: 'Site' }], error: null }).then(res, rej);
  return b;
}

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ from: (t: string) => builder(t) }),
}));
vi.mock('@/lib/server/mail/outbox', () => ({ enqueueAndSend: (i: any) => mocks.send(i) }));
vi.mock('./facts', () => ({ postProjectFact: (a: any) => mocks.post(a) }));

import { confirmCompany, saveOnboardingBlock, syncOnboardingFacts } from './onboarding';

const complete = {
  company_confirmed_at: '2026-01-01T00:00:00Z',
  signatory_name: 'A',
  signatory_role: 'CEO',
  billing_same_as_company: true,
  vat_status: 'not_subject',
};

beforeEach(() => {
  vi.clearAllMocks();
  state.row = null;
  state.upserts = [];
  mocks.post.mockResolvedValue({ ok: true, changed: true, factId: 5 });
  mocks.send.mockResolvedValue('sent');
});

describe('saveOnboardingBlock', () => {
  it('rejects an invalid payload without upsert', async () => {
    const r = await saveOnboardingBlock('c1', 'u1', { block: 'signataire', data: { signatoryName: '', signatoryRole: 'x' } });
    expect(r).toMatchObject({ ok: false, code: 'invalid' });
    expect((r as any).fieldErrors.signatoryName).toBeTruthy();
    expect(state.upserts).toHaveLength(0);
  });

  it('upserts only whitelisted columns for the supplied clientId', async () => {
    await saveOnboardingBlock('c1', 'u1', {
      block: 'signataire',
      client_id: 'evil',
      data: { signatoryName: 'Ada', signatoryRole: 'CEO', client_id: 'evil', vat_number: 'x' },
    });
    expect(state.upserts).toHaveLength(1);
    const up = state.upserts[0];
    expect(Object.keys(up).sort()).toEqual(
      ['client_id', 'signatory_name', 'signatory_role', 'updated_at', 'updated_by'].sort(),
    );
    expect(up.client_id).toBe('c1');
    expect(up.updated_by).toBe('u1');
  });

  it('completing the onboarding posts a system fact and mails the admin', async () => {
    state.row = { ...complete, signatory_name: null };
    const r = await saveOnboardingBlock('c1', 'u1', {
      block: 'signataire',
      data: { signatoryName: 'Ada', signatoryRole: 'CEO' },
    });
    expect(r).toMatchObject({ ok: true, complete: true });
    expect(mocks.post).toHaveBeenCalledWith({
      projectId: 'p1',
      type: 'onboarding_completed',
      actorKind: 'system',
      actorId: null,
    });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    const m = mocks.send.mock.calls[0][0];
    expect(m.event).toBe('onboarding_completed');
    expect(m.recipientEmail).toBe('contact@sevalys.com');
    expect(m.dedupeKey).toBe('onboarding_completed:p1:contact@sevalys.com');
    expect(m.payload).toEqual({ companyName: 'Acme', projectTitle: 'Site' });
  });

  it('a repeated complete save sends no second admin mail', async () => {
    state.row = { ...complete };
    mocks.post.mockResolvedValue({ ok: true, changed: false, factId: null });
    await saveOnboardingBlock('c1', 'u1', {
      block: 'signataire',
      data: { signatoryName: 'Ada', signatoryRole: 'CEO' },
    });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('an incomplete edit after completion never revokes', async () => {
    state.row = { ...complete };
    const r = await saveOnboardingBlock('c1', 'u1', {
      block: 'contact',
      data: { projectContactName: '' },
    });
    expect(r).toMatchObject({ ok: true });
    expect(mocks.post).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'fact_revoked' }));
  });

  it('mail failure does not fail the save', async () => {
    state.row = { ...complete, signatory_name: null };
    mocks.send.mockRejectedValue(new Error('x'));
    const r = await saveOnboardingBlock('c1', 'u1', {
      block: 'signataire',
      data: { signatoryName: 'Ada', signatoryRole: 'CEO' },
    });
    expect(r).toMatchObject({ ok: true, complete: true });
  });
});

describe('confirmCompany', () => {
  it('sets company_confirmed_at when null', async () => {
    state.row = {};
    await confirmCompany('c1', 'u1');
    expect(state.upserts[0].company_confirmed_at).toBeTruthy();
  });

  it('does not overwrite an existing confirmation', async () => {
    state.row = { company_confirmed_at: '2026-01-01T00:00:00Z' };
    await confirmCompany('c1', 'u1');
    expect(state.upserts).toHaveLength(0);
  });
});

describe('syncOnboardingFacts', () => {
  it('does nothing while incomplete', async () => {
    state.row = { company_confirmed_at: null };
    await syncOnboardingFacts('c1');
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
