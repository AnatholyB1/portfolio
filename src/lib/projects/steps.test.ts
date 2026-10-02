import { describe, expect, it } from 'vitest';
import {
  ADMIN_POSTABLE_FACTS,
  DONE_COPY,
  STEPS,
  deriveProjectState,
  effectiveFacts,
  isFactAhead,
  type Fact,
  type FactType,
} from './steps';

const START = '2026-01-01T00:00:00.000Z';
let seq = 0;
function f(type: FactType, day: number, target: number | null = null, id?: number): Fact {
  seq += 1;
  return {
    id: id ?? seq,
    type,
    targetFactId: target,
    actorKind: type === 'onboarding_completed' ? 'system' : 'admin',
    createdAt: `2026-01-${String(day).padStart(2, '0')}T10:00:00.000Z`,
  };
}

describe('STEPS', () => {
  it('has 6 steps with exact names and waiting sides', () => {
    expect(STEPS).toHaveLength(6);
    expect(STEPS.map((s) => s.name)).toEqual([
      'Onboarding',
      'Cadrage et devis',
      'Contrat et acompte',
      'Production',
      'Recette',
      'Livraison et solde',
    ]);
    expect(STEPS.map((s) => s.waitingOn)).toEqual(['client', 'admin', 'admin', 'admin', 'client', 'client']);
  });

  it('admin-postable facts exclude system and revoke types', () => {
    expect(ADMIN_POSTABLE_FACTS).toHaveLength(6);
    expect(ADMIN_POSTABLE_FACTS).not.toContain('onboarding_completed');
    expect(ADMIN_POSTABLE_FACTS).not.toContain('fact_revoked');
  });
});

describe('deriveProjectState', () => {
  it('empty facts -> step 1, client waits, since startedAt', () => {
    const s = deriveProjectState([], START);
    expect(s.currentStep).toBe(1);
    expect(s.done).toBe(false);
    expect(s.waitingOn).toBe('client');
    expect(s.sinceAt).toBe(START);
    expect(s.steps[0].state).toBe('current');
    expect(s.steps.slice(1).every((x) => x.state === 'upcoming')).toBe(true);
  });

  it('onboarding done -> step 2, admin waits, completedBy system', () => {
    const o = f('onboarding_completed', 3);
    const s = deriveProjectState([o], START);
    expect(s.currentStep).toBe(2);
    expect(s.waitingOn).toBe('admin');
    expect(s.steps[0].state).toBe('done');
    expect(s.steps[0].completedAt).toBe(o.createdAt);
    expect(s.steps[0].completedBy).toBe('system');
    expect(s.sinceAt).toBe(o.createdAt);
  });

  it('step 3 needs both contract and deposit', () => {
    const base = [f('onboarding_completed', 2), f('quote_accepted', 3), f('contract_signed', 4)];
    expect(deriveProjectState(base, START).currentStep).toBe(3);
    const dep = f('deposit_received', 6);
    const s = deriveProjectState([...base, dep], START);
    expect(s.currentStep).toBe(4);
    expect(s.steps[2].completedAt).toBe(dep.createdAt);
  });

  it('completedAt of step 3 is max of both facts regardless of order', () => {
    const c = f('contract_signed', 9);
    const d = f('deposit_received', 5);
    const s = deriveProjectState([f('onboarding_completed', 2), f('quote_accepted', 3), c, d], START);
    expect(s.steps[2].completedAt).toBe(c.createdAt);
  });

  it('ahead fact does not skip a step', () => {
    const dep = f('deposit_received', 2);
    expect(deriveProjectState([dep], START).currentStep).toBe(1);
    const s = deriveProjectState(
      [dep, f('onboarding_completed', 3), f('quote_accepted', 4), f('contract_signed', 5)],
      START,
    );
    expect(s.currentStep).toBe(4);
  });

  it('all gate facts -> done', () => {
    const facts = [
      f('onboarding_completed', 2),
      f('quote_accepted', 3),
      f('contract_signed', 4),
      f('deposit_received', 5),
      f('production_completed', 6),
      f('acceptance_signed', 7),
      f('balance_received', 8),
    ];
    const s = deriveProjectState(facts, START);
    expect(s.done).toBe(true);
    expect(s.currentStep).toBeNull();
    expect(s.waitingOn).toBe('none');
    expect(s.expectedAction).toBe(DONE_COPY.waitingLine);
    expect(s.steps.every((x) => x.state === 'done')).toBe(true);
    expect(s.sinceAt).toBe(facts[6].createdAt);
  });

  it('revoked fact is cancelled and step recomputed backwards', () => {
    const facts = [
      f('onboarding_completed', 2, null, 1),
      f('quote_accepted', 3, null, 2),
      f('fact_revoked', 5, 2, 3),
    ];
    expect(effectiveFacts(facts).map((x) => x.id)).toEqual([1]);
    const s = deriveProjectState(facts, START);
    expect(s.currentStep).toBe(2);
    expect(s.sinceAt).toBe(facts[2].createdAt);
  });

  it('revoking onboarding with quote present returns to step 1', () => {
    const facts = [
      f('onboarding_completed', 2, null, 11),
      f('quote_accepted', 3, null, 12),
      f('fact_revoked', 4, 11, 13),
    ];
    expect(deriveProjectState(facts, START).currentStep).toBe(1);
  });

  it('sinceAt never earlier than startedAt', () => {
    const early = { ...f('onboarding_completed', 1), createdAt: '2025-12-01T00:00:00.000Z' };
    expect(deriveProjectState([early], START).sinceAt).toBe(START);
  });
});

describe('isFactAhead', () => {
  it('detects ahead facts', () => {
    const o = f('onboarding_completed', 2);
    const q = f('quote_accepted', 3);
    expect(isFactAhead([], 'quote_accepted')).toBe(true);
    expect(isFactAhead([o], 'quote_accepted')).toBe(false);
    expect(isFactAhead([o, q], 'deposit_received')).toBe(false);
    expect(isFactAhead([o, q], 'production_completed')).toBe(true);
  });
});
