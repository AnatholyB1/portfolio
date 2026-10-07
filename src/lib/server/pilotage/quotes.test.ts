import { describe, expect, it } from 'vitest';
import {
  buildQuoteStates,
  effectiveSignedAt,
  pipeline,
  quoteTotalCents,
  signedAsOf,
  signedInRange,
  signedNow,
  type FactRow,
  type QuoteDocRow,
  type SnapshotRow,
} from './quotes';

const P = 'p1';
const doc = (id: string, revision: number, issuedAt: string, replaces: string | null = null, projectId = P): QuoteDocRow => ({
  id,
  projectId,
  revision,
  reference: `DEV-${id}`,
  replacesDocumentId: replaces,
  issuedAt,
});
const snap = (documentId: string, totalCents: unknown): SnapshotRow => ({
  documentId,
  data: { docType: 'quote', totalCents },
});
const fact = (id: number, type: string, occurredAt: string, targetFactId: number | null = null, projectId = P): FactRow => ({
  id,
  projectId,
  type,
  targetFactId,
  occurredAt,
});

describe('quoteTotalCents', () => {
  it('lit un total valide', () => {
    expect(quoteTotalCents({ docType: 'quote', totalCents: 120000 })).toBe(120000);
  });
  it('refuse les données invalides', () => {
    expect(quoteTotalCents({ docType: 'contract', totalCents: 1 })).toBeNull();
    expect(quoteTotalCents({ docType: 'quote' })).toBeNull();
    expect(quoteTotalCents({ docType: 'quote', totalCents: 12.5 })).toBeNull();
    expect(quoteTotalCents({ docType: 'quote', totalCents: -1 })).toBeNull();
    expect(quoteTotalCents({ docType: 'quote', totalCents: '120000' })).toBeNull();
    expect(quoteTotalCents(null)).toBeNull();
  });
});

describe('effectiveSignedAt', () => {
  it('contrat révoqué : null', () => {
    const facts = [fact(10, 'contract_signed', '2026-10-05T10:00:00Z'), fact(11, 'fact_revoked', '2026-10-06T10:00:00Z', 10)];
    expect(effectiveSignedAt(facts)).toBeNull();
  });
  it('une nouvelle signature après révocation compte', () => {
    const facts = [
      fact(10, 'contract_signed', '2026-10-05T10:00:00Z'),
      fact(11, 'fact_revoked', '2026-10-06T10:00:00Z', 10),
      fact(12, 'contract_signed', '2026-10-08T10:00:00Z'),
    ];
    expect(effectiveSignedAt(facts)).toBe('2026-10-08T10:00:00Z');
  });
});

describe('buildQuoteStates', () => {
  it('devis simple signé', () => {
    const s = buildQuoteStates([P], [doc('a', 1, '2026-10-01T08:00:00Z')], [snap('a', 100000)], [fact(1, 'contract_signed', '2026-10-05T10:00:00Z')]).get(P)!;
    expect(s.activeQuote?.documentId).toBe('a');
    expect(s.signedOn).toBe('2026-10-05');
    expect(s.baseSignedCents).toBe(100000);
    expect(signedNow(s)).toBe(100000);
  });

  it('devis remplacé avant signature : seule la révision finale compte', () => {
    const s = buildQuoteStates(
      [P],
      [doc('a', 1, '2026-10-01T08:00:00Z'), doc('b', 2, '2026-10-02T08:00:00Z', 'a')],
      [snap('a', 100000), snap('b', 120000)],
      [fact(1, 'contract_signed', '2026-10-05T10:00:00Z')],
    ).get(P)!;
    expect(s.baseSignedCents).toBe(120000);
    expect(s.amendments).toEqual([]);
  });

  const amended = () =>
    buildQuoteStates(
      [P],
      [doc('a', 1, '2026-10-01T08:00:00Z'), doc('b', 2, '2026-11-10T08:00:00Z', 'a')],
      [snap('a', 100000), snap('b', 130000)],
      [fact(1, 'contract_signed', '2026-10-05T10:00:00Z')],
    ).get(P)!;

  it('avenant après signature : delta daté', () => {
    const s = amended();
    expect(s.amendments).toMatchObject([{ date: '2026-11-10', deltaCents: 30000 }]);
    expect(signedAsOf(s, '2026-10-31')).toBe(100000);
    expect(signedAsOf(s, '2026-11-30')).toBe(130000);
    expect(signedAsOf(s, '2026-10-01')).toBe(0);
    expect(signedNow(s)).toBe(s.activeQuote!.totalCents);
  });

  it('signedInRange est additif sur les périodes (avenant)', () => {
    const s = amended();
    const oct = signedInRange([s], { from: '2026-10-01', to: '2026-10-31' });
    const nov = signedInRange([s], { from: '2026-11-01', to: '2026-11-30' });
    const all = signedInRange([s], { from: '2026-10-01', to: '2026-11-30' });
    expect(oct.totalCents).toBe(100000);
    expect(oct.items.map((i) => i.kind)).toEqual(['signature']);
    expect(nov.totalCents).toBe(30000);
    expect(nov.items.map((i) => i.kind)).toEqual(['avenant']);
    expect(oct.totalCents + nov.totalCents).toBe(all.totalCents);
  });

  it('avenant négatif', () => {
    const s = buildQuoteStates(
      [P],
      [doc('a', 1, '2026-10-01T08:00:00Z'), doc('b', 2, '2026-11-10T08:00:00Z', 'a'), doc('c', 3, '2026-11-20T08:00:00Z', 'b')],
      [snap('a', 100000), snap('b', 130000), snap('c', 110000)],
      [fact(1, 'contract_signed', '2026-10-05T10:00:00Z')],
    ).get(P)!;
    const nov = signedInRange([s], { from: '2026-11-01', to: '2026-11-30' });
    expect(nov.items.map((i) => i.amountCents)).toEqual([30000, -20000]);
    expect(signedNow(s)).toBe(110000);
  });

  it('contrat sans devis : anomalie visible', () => {
    const s = buildQuoteStates([P], [doc('a', 1, '2026-10-10T08:00:00Z')], [snap('a', 100000)], [fact(1, 'contract_signed', '2026-10-05T10:00:00Z')]).get(P)!;
    expect(s.baseSignedCents).toBe(0);
    expect(s.amendments).toEqual([]);
    expect(s.anomalies).toEqual([{ kind: 'contract_without_quote', ref: P }]);
  });

  it('total invalide : anomalie, aucun zéro silencieux', () => {
    const s = buildQuoteStates([P], [doc('a', 1, '2026-10-01T08:00:00Z')], [snap('a', 12.5)], []).get(P)!;
    expect(s.activeQuote).toBeNull();
    expect(s.anomalies).toEqual([{ kind: 'quote_invalid_amount', ref: 'DEV-a' }]);
    expect(pipeline([s]).totalCents).toBe(0);
  });

  it('contrat révoqué : retour au pipeline', () => {
    const s = buildQuoteStates(
      [P],
      [doc('a', 1, '2026-10-01T08:00:00Z')],
      [snap('a', 100000)],
      [fact(1, 'contract_signed', '2026-10-05T10:00:00Z'), fact(2, 'fact_revoked', '2026-10-06T10:00:00Z', 1)],
    ).get(P)!;
    expect(s.signedOn).toBeNull();
    expect(pipeline([s]).totalCents).toBe(100000);
    expect(signedInRange([s], { from: '2026-10-01', to: '2026-10-31' }).totalCents).toBe(0);
  });
});

describe('pipeline', () => {
  it('seuls les projets avec devis actif et sans signature', () => {
    const states = buildQuoteStates(
      ['p1', 'p2', 'p3'],
      [doc('a', 1, '2026-10-01T08:00:00Z', null, 'p1'), doc('b', 1, '2026-10-02T08:00:00Z', null, 'p2')],
      [snap('a', 100000), snap('b', 50000)],
      [fact(1, 'contract_signed', '2026-10-05T10:00:00Z', null, 'p2')],
    );
    const res = pipeline(states.values());
    expect(res.totalCents).toBe(100000);
    expect(res.items).toMatchObject([{ projectId: 'p1', kind: 'devis', date: '2026-10-01', amountCents: 100000 }]);
  });
});
