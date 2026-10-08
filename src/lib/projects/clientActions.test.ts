import { describe, expect, it } from 'vitest';
import { buildClientActions } from './clientActions';
import { deriveProjectState, STEPS, type Fact } from './steps';

const START = '2026-01-01T00:00:00.000Z';
const fact = (id: number, type: Fact['type']): Fact => ({
  id,
  type,
  targetFactId: null,
  actorKind: 'admin',
  createdAt: `2026-01-0${id + 1}T10:00:00.000Z`,
});

const step1 = deriveProjectState([], START);
const step2 = deriveProjectState([fact(1, 'onboarding_completed')], START);
const step3 = deriveProjectState([fact(1, 'onboarding_completed'), fact(2, 'quote_accepted')], START);
const step4 = deriveProjectState(
  [fact(1, 'onboarding_completed'), fact(2, 'quote_accepted'), fact(3, 'contract_signed'), fact(4, 'deposit_received')],
  START,
);

describe('step wording: the client signs and pays in steps 2 and 3', () => {
  it('puts the client on the hook for the quote, the contract and the deposit', () => {
    expect(STEPS[1].waitingOn).toBe('client');
    expect(STEPS[2].waitingOn).toBe('client');
    expect(STEPS[1].expectedAction).toMatch(/Signez votre devis/);
    expect(STEPS[2].expectedAction).toMatch(/Signez votre contrat/);
    expect(STEPS[2].expectedAction).toMatch(/acompte/);
    for (const s of [STEPS[1], STEPS[2]]) expect(s.expectedAction).not.toMatch(/Nous préparons/);
  });
});

describe('buildClientActions', () => {
  it('offers the onboarding anchor at step 1 until it is complete', () => {
    const a = buildClientActions({ state: step1, onboardingComplete: false, toSignDocs: [], toPayInvoices: [] });
    expect(a).toEqual([{ kind: 'anchor', href: '#onboarding', label: 'Compléter mes informations' }]);
    expect(buildClientActions({ state: step1, onboardingComplete: true, toSignDocs: [], toPayInvoices: [] })).toEqual([]);
  });

  it('links a single quote straight to its signing page', () => {
    const a = buildClientActions({
      state: step2,
      onboardingComplete: true,
      toSignDocs: [{ id: 'doc-1', docType: 'quote' }],
      toPayInvoices: [],
    });
    expect(a).toEqual([{ kind: 'link', href: '/espace-client/documents/doc-1/signer', label: 'Signer le devis' }]);
  });

  it('sends several documents to the documents list', () => {
    const a = buildClientActions({
      state: step3,
      onboardingComplete: true,
      toSignDocs: [
        { id: 'a', docType: 'contract' },
        { id: 'b', docType: 'quote' },
      ],
      toPayInvoices: [],
    });
    expect(a).toEqual([{ kind: 'link', href: '/espace-client/documents', label: 'Voir mes documents' }]);
  });

  it('adds the deposit payment action next to the signature', () => {
    const a = buildClientActions({
      state: step3,
      onboardingComplete: true,
      toSignDocs: [{ id: 'c1', docType: 'contract' }],
      toPayInvoices: [{ kind: 'deposit' }],
    });
    expect(a.map((x) => x.label)).toEqual(['Signer le contrat', "Payer l'acompte"]);
    expect(a[1].href).toBe('/espace-client/paiements');
  });

  it('shows nothing when Sèvalys is the one working or the project is done', () => {
    const docs = [{ id: 'x', docType: 'quote' }];
    expect(buildClientActions({ state: step4, onboardingComplete: true, toSignDocs: docs, toPayInvoices: [{ kind: 'final' }] })).toEqual([]);
  });
});
