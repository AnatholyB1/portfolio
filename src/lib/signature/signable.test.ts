import { describe, expect, it } from 'vitest';
import type { ChainDoc } from '@/lib/documents/steps';
import type { Fact, FactType } from '@/lib/projects/steps';
import { checkSignable, maskEmail, signerMatches } from './signable';

const STARTED = '2026-10-01T08:00:00Z';
let n = 0;
const fact = (type: FactType, targetFactId: number | null = null): Fact => ({
  id: ++n,
  type,
  targetFactId,
  actorKind: type === 'onboarding_completed' ? 'system' : 'admin',
  createdAt: '2026-10-02T08:00:00Z',
});
const doc = (id: string, docType: ChainDoc['docType'], revision = 1, replaces: string | null = null): ChainDoc => ({
  id,
  docType,
  revision,
  replacesDocumentId: replaces,
  issuedAt: '2026-10-03T08:00:00Z',
});

// Étape 2 : onboarding terminé, devis pas encore accepté.
const step2Facts = [fact('onboarding_completed')];

describe('checkSignable', () => {
  it('devis en tête, étape 2, non signé -> ok', () => {
    const d = doc('q1', 'quote');
    expect(checkSignable({ doc: d, docs: [d], facts: step2Facts, startedAt: STARTED, hasSignature: false })).toEqual({
      ok: true,
    });
  });

  it('cahier des charges ou facture -> not_signable_type', () => {
    for (const t of ['spec', 'invoice'] as const) {
      const d = doc('x', t);
      expect(checkSignable({ doc: d, docs: [d], facts: step2Facts, startedAt: STARTED, hasSignature: false })).toEqual({
        ok: false,
        code: 'not_signable_type',
      });
    }
  });

  it('document remplacé -> replaced', () => {
    const d1 = doc('q1', 'quote');
    const d2 = doc('q2', 'quote', 2, 'q1');
    expect(checkSignable({ doc: d1, docs: [d1, d2], facts: step2Facts, startedAt: STARTED, hasSignature: false })).toEqual({
      ok: false,
      code: 'replaced',
    });
  });

  it('déjà signé (signature ou fait effectif) -> already_signed', () => {
    const d = doc('q1', 'quote');
    expect(checkSignable({ doc: d, docs: [d], facts: step2Facts, startedAt: STARTED, hasSignature: true })).toEqual({
      ok: false,
      code: 'already_signed',
    });
    const accepted = fact('quote_accepted');
    expect(
      checkSignable({ doc: d, docs: [d], facts: [...step2Facts, accepted], startedAt: STARTED, hasSignature: false }),
    ).toEqual({ ok: false, code: 'already_signed' });
  });

  it('un fait révoqué ne compte pas', () => {
    const d = doc('q1', 'quote');
    const accepted = fact('quote_accepted');
    const revoke = fact('fact_revoked', accepted.id);
    expect(
      checkSignable({
        doc: d,
        docs: [d],
        facts: [...step2Facts, accepted, revoke],
        startedAt: STARTED,
        hasSignature: false,
      }),
    ).toEqual({ ok: true });
  });

  it('contrat alors que l étape courante est 2 -> wrong_step', () => {
    const d = doc('c1', 'contract');
    expect(checkSignable({ doc: d, docs: [d], facts: step2Facts, startedAt: STARTED, hasSignature: false })).toEqual({
      ok: false,
      code: 'wrong_step',
    });
  });
});

describe('signerMatches', () => {
  it('membre + nom + fonction', () => {
    expect(signerMatches({ isMember: true, signatoryName: 'A', signatoryRole: 'B' })).toBe(true);
  });
  it('refuse si incomplet ou non membre', () => {
    expect(signerMatches({ isMember: true, signatoryName: null, signatoryRole: 'B' })).toBe(false);
    expect(signerMatches({ isMember: true, signatoryName: 'A', signatoryRole: '  ' })).toBe(false);
    expect(signerMatches({ isMember: false, signatoryName: 'A', signatoryRole: 'B' })).toBe(false);
  });
});

describe('maskEmail', () => {
  it('masque la partie locale', () => {
    expect(maskEmail('anatholyb+sv-test@gmail.com')).toBe('a***@gmail.com');
    expect(maskEmail('x@y.fr')).toBe('x***@y.fr');
  });
});
