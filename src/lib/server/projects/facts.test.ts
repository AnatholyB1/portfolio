/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  rpc: { ok: true, data: { fact_id: 10, changed: true } } as any,
  project: { data: { client_id: 'c1', started_at: '2026-01-01T00:00:00Z' }, error: null } as any,
  facts: { data: [] as any[], error: null } as any,
  members: { data: [{ invited_email: 'A@x.fr' }, { invited_email: 'a@x.fr' }, { invited_email: 'b@x.fr' }], error: null } as any,
}));
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), send: vi.fn() }));

function builder(table: string) {
  const b: any = {};
  for (const m of ['select', 'eq', 'order']) b[m] = () => b;
  b.maybeSingle = async () => state.project;
  b.then = (res: any, rej: any) =>
    Promise.resolve(table === 'sv_client_members' ? state.members : state.facts).then(res, rej);
  return b;
}

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ from: (t: string) => builder(t) }),
}));
vi.mock('@/lib/server/rpc', () => ({
  callRpc: async (...args: any[]) => {
    mocks.rpc(...args);
    return state.rpc;
  },
}));
vi.mock('@/lib/server/mail/outbox', () => ({ enqueueAndSend: (i: any) => mocks.send(i) }));

import { afterFactPosted, postProjectFact, revokeProjectFact } from './facts';

const f = (id: number, type: string, target: number | null = null, at = `2026-02-0${id % 9 || 1}T00:00:00Z`) => ({
  id,
  type,
  target_fact_id: target,
  actor_kind: type === 'onboarding_completed' ? 'system' : 'admin',
  created_at: at,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.send.mockResolvedValue('sent');
  state.rpc = { ok: true, data: { fact_id: 10, changed: true } };
});

describe('postProjectFact', () => {
  it('no mail when the RPC reports no change', async () => {
    state.rpc = { ok: true, data: { fact_id: null, changed: false } };
    const r = await postProjectFact({ projectId: 'p', type: 'quote_accepted', actorKind: 'admin', actorId: 'u' });
    expect(r).toMatchObject({ ok: true, changed: false, mail: 'none' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('step 2 -> 3 sends one mail per distinct member', async () => {
    state.facts = { data: [f(1, 'onboarding_completed'), f(10, 'quote_accepted')], error: null };
    const r = await postProjectFact({ projectId: 'p', type: 'quote_accepted', actorKind: 'admin', actorId: 'u' });
    expect(r).toMatchObject({ ok: true, stepBefore: 2, stepAfter: 3, mail: 'sent' });
    expect(mocks.send).toHaveBeenCalledTimes(2);
    const call = mocks.send.mock.calls[0][0];
    expect(call.event).toBe('step_changed');
    expect(call.dedupeKey).toBe('step_changed:10:a@x.fr');
    expect(call.payload.stepName).toBe('Contrat et acompte');
    expect(call.payload.expectedAction).toContain('contrat');
  });

  it('fact ahead of the current step sends no mail', async () => {
    state.facts = { data: [f(1, 'onboarding_completed'), f(10, 'deposit_received')], error: null };
    const r = await postProjectFact({ projectId: 'p', type: 'deposit_received', actorKind: 'admin', actorId: 'u' });
    expect(r).toMatchObject({ ok: true, stepBefore: 2, stepAfter: 2, mail: 'none' });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('closing all gates is done and uses DONE_COPY', async () => {
    state.facts = {
      data: [
        f(1, 'onboarding_completed'),
        f(2, 'quote_accepted'),
        f(3, 'contract_signed'),
        f(4, 'deposit_received'),
        f(5, 'production_completed'),
        f(6, 'acceptance_signed'),
        f(10, 'balance_received'),
      ],
      error: null,
    };
    const r = await postProjectFact({ projectId: 'p', type: 'balance_received', actorKind: 'admin', actorId: 'u' });
    expect(r).toMatchObject({ ok: true, done: true, stepAfter: null, stepBefore: 6 });
    expect(mocks.send.mock.calls[0][0].payload.stepName).toBe('Terminé');
  });

  it('maps RPC errors to a code', async () => {
    state.rpc = { ok: false, code: 'sv_reason_required' };
    const r = await postProjectFact({ projectId: 'p', type: 'quote_accepted', actorKind: 'admin', actorId: 'u' });
    expect(r).toEqual({ ok: false, code: 'sv_reason_required' });
  });

  it('mail failure keeps the post ok', async () => {
    mocks.send.mockRejectedValue(new Error('boom'));
    state.facts = { data: [f(1, 'onboarding_completed'), f(10, 'quote_accepted')], error: null };
    const r = await postProjectFact({ projectId: 'p', type: 'quote_accepted', actorKind: 'admin', actorId: 'u' });
    expect(r).toMatchObject({ ok: true, changed: true, mail: 'failed' });
  });
});

describe('revokeProjectFact', () => {
  it('passes fact_revoked, target and reason; step moves back and mails', async () => {
    state.facts = {
      data: [f(1, 'onboarding_completed'), f(2, 'quote_accepted'), f(10, 'fact_revoked', 2)],
      error: null,
    };
    const r = await revokeProjectFact({ projectId: 'p', factId: 2, actorId: 'u', reason: 'Erreur de saisie du devis' });
    expect(mocks.rpc).toHaveBeenCalledWith(
      expect.any(String),
      'sv_post_project_fact',
      expect.objectContaining({
        p_type: 'fact_revoked',
        p_target_fact_id: 2,
        p_reason: 'Erreur de saisie du devis',
      }),
    );
    expect(r).toMatchObject({ ok: true, stepBefore: 3, stepAfter: 2 });
    expect(mocks.send.mock.calls[0][0].payload.stepName).toBe('Cadrage et devis');
  });
});

describe('afterFactPosted', () => {
  it('notifies only when the step changed', async () => {
    state.facts = { data: [f(1, 'onboarding_completed'), f(10, 'quote_accepted')], error: null };
    const r = await afterFactPosted('p', 10);
    expect(r).toMatchObject({ stepBefore: 2, stepAfter: 3, mail: 'sent' });
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });

  it('no mail when the step is unchanged', async () => {
    state.facts = { data: [f(1, 'onboarding_completed'), f(10, 'deposit_received')], error: null };
    const r = await afterFactPosted('p', 10);
    expect(r).toMatchObject({ stepBefore: 2, stepAfter: 2, mail: 'none' });
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
