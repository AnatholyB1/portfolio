import { describe, expect, it } from 'vitest';
import { classifyProject, filterProjects, type AdminProjectRow } from './blocking';
import { buildClientActions } from './clientActions';
import { deriveProjectState, resolveWaiting, type Fact, type FactType } from './steps';

const NOW = new Date('2026-02-01T12:00:00.000Z');
const START = '2026-01-01T00:00:00.000Z';
let n = 0;
const fact = (type: FactType): Fact => ({
  id: ++n,
  type,
  targetFactId: null,
  actorKind: 'system',
  createdAt: `2026-01-0${Math.min(n, 9)}T00:00:00.000Z`,
});

const BY_STEP: Record<1 | 2 | 3 | 4 | 5 | 6, FactType[]> = {
  1: [],
  2: ['onboarding_completed'],
  3: ['onboarding_completed', 'quote_accepted'],
  4: ['onboarding_completed', 'quote_accepted', 'contract_signed', 'deposit_received'],
  5: ['onboarding_completed', 'quote_accepted', 'contract_signed', 'deposit_received', 'production_completed'],
  6: [
    'onboarding_completed',
    'quote_accepted',
    'contract_signed',
    'deposit_received',
    'production_completed',
    'acceptance_signed',
  ],
};

function stateAt(step: 1 | 2 | 3 | 4 | 5 | 6) {
  n = 0;
  return deriveProjectState(BY_STEP[step].map(fact), START);
}

function asRow(state: ReturnType<typeof stateAt>): AdminProjectRow {
  const { blockers } = classifyProject(state, START, NOW);
  return {
    projectId: 'p',
    clientName: 'C',
    title: 'T',
    offer: 'vitrine',
    state,
    lastActivityAt: START,
    daysWaiting: 0,
    isDormant: false,
    blockers,
  };
}

describe('F-D1 caractérisation : valeur statique (sans résolution)', () => {
  for (const step of [2, 3, 5, 6] as const) {
    it(`étape ${step} : classée « client » alors qu'aucun document n'est à signer`, () => {
      const state = stateAt(step);
      expect(state.currentStep).toBe(step);
      expect(state.waitingOn).toBe('client');
      expect(buildClientActions({ state, onboardingComplete: true, toSignDocs: [], toPayInvoices: [] })).toEqual([]);
      expect(asRow(state).blockers).not.toContain('admin');
    });
  }
});

describe('F-D1 resolveWaiting', () => {
  for (const step of [2, 3, 5, 6] as const) {
    it(`étape ${step} sans document à signer ni facture à payer : Sèvalys attend`, () => {
      const resolved = resolveWaiting(stateAt(step), { toSign: 0, toPay: 0 });
      expect(resolved.waitingOn).toBe('admin');
      expect(resolved.expectedAction).toMatch(/^Nous préparons/);
      const row = asRow(resolved);
      expect(row.blockers).toContain('admin');
      expect(filterProjects([row], { blocage: 'admin' })).toHaveLength(1);
      expect(filterProjects([row], { blocage: 'client' })).toHaveLength(0);
      expect(
        buildClientActions({ state: resolved, onboardingComplete: true, toSignDocs: [], toPayInvoices: [] }),
      ).toEqual([]);
    });

    it(`étape ${step} avec un document à signer : le client attend`, () => {
      const resolved = resolveWaiting(stateAt(step), { toSign: 1, toPay: 0 });
      expect(resolved.waitingOn).toBe('client');
      expect(resolved.expectedAction).toBe(stateAt(step).expectedAction);
      expect(asRow(resolved).blockers).toContain('client');
    });

    it(`étape ${step} avec une facture à payer : le client attend`, () => {
      expect(resolveWaiting(stateAt(step), { toSign: 0, toPay: 2 }).waitingOn).toBe('client');
    });
  }

  it('étapes 1 et 4 : inchangées quel que soit le travail en attente', () => {
    for (const step of [1, 4] as const) {
      const s = stateAt(step);
      expect(resolveWaiting(s, { toSign: 0, toPay: 0 })).toBe(s);
      expect(resolveWaiting(s, { toSign: 3, toPay: 3 })).toBe(s);
    }
    expect(stateAt(1).waitingOn).toBe('client');
    expect(stateAt(4).waitingOn).toBe('admin');
  });

  it('projet terminé : inchangé', () => {
    n = 0;
    const done = deriveProjectState(
      [...BY_STEP[6], 'balance_received'].map((t) => fact(t as FactType)),
      START,
    );
    expect(done.done).toBe(true);
    expect(resolveWaiting(done, { toSign: 0, toPay: 0 })).toBe(done);
  });

  it('ne mute pas l\'état d\'origine', () => {
    const s = stateAt(2);
    resolveWaiting(s, { toSign: 0, toPay: 0 });
    expect(s.waitingOn).toBe('client');
  });
});
