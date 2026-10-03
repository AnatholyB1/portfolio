/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const loadProjectDocuments = vi.fn();
const loadActiveSnapshot = vi.fn();
vi.mock('./read', () => ({
  loadProjectDocuments: (...a: unknown[]) => loadProjectDocuments(...a),
  loadActiveSnapshot: (...a: unknown[]) => loadActiveSnapshot(...a),
}));

import { deriveProjectState, type Fact, type FactType } from '@/lib/projects/steps';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { loadAdminDocumentsView } from './adminView';

const COPY = PROJECT_COPY.documents.admin;
let n = 0;
const fact = (type: FactType, extra: Partial<Fact> = {}): Fact => ({
  id: ++n,
  type,
  targetFactId: null,
  actorKind: 'admin',
  createdAt: `2026-01-0${n % 9 + 1}T00:00:00Z`,
  ...extra,
});
const doc = (docType: string, revision = 1, extra: Record<string, unknown> = {}) => ({
  id: `${docType}-${revision}`,
  docType,
  revision,
  replacesDocumentId: null,
  issuedAt: '2026-01-01T00:00:00Z',
  projectId: 'p1',
  templateVersion: 'v1',
  reference: 'R',
  filename: 'f.pdf',
  sha256: 'abc',
  sizeBytes: 1,
  issuedBy: null,
  ...extra,
});

function bundle(facts: Fact[], onboarding: any = null): any {
  const startedAt = '2026-01-01T00:00:00Z';
  return {
    project: { id: 'p1', clientId: 'c1', title: 'Site', offer: 'vitrine', startedAt },
    client: { id: 'c1', name: 'Jeanne', siret: null, company: { nom: 'Acme' } },
    facts,
    notes: {},
    onboarding,
    files: [],
    links: [],
    consents: [],
    state: deriveProjectState(facts, startedAt),
    lastActivityAt: startedAt,
  };
}

const quoteSnap = {
  doc: doc('quote'),
  snapshot: {
    docType: 'quote',
    reference: 'DEV-1',
    revision: 1,
    lines: [{ designation: 'x', quantity: 1, unitPriceCents: 100, totalCents: 100 }],
    totalCents: 100,
    depositPercent: 30,
    depositCents: 30,
    balanceCents: 70,
    leadTime: '4 semaines',
  },
};

const step2 = () => [fact('onboarding_completed')];
const step3 = () => [...step2(), fact('quote_accepted')];

beforeEach(() => {
  loadProjectDocuments.mockReset().mockResolvedValue([]);
  loadActiveSnapshot.mockReset().mockResolvedValue(null);
});

describe('loadAdminDocumentsView', () => {
  it('step 2 without docs: quote and spec issuable', async () => {
    const v = await loadAdminDocumentsView({} as any, bundle(step2()));
    expect(v.expected).toEqual([
      { docType: 'quote', activeRevision: null, canIssue: true, previewOnly: false, blockedReason: null },
      { docType: 'spec', activeRevision: null, canIssue: true, previewOnly: false, blockedReason: null },
    ]);
  });

  it('step 3 without quote blocks the contract; with quote it is issuable', async () => {
    let v = await loadAdminDocumentsView({} as any, bundle(step3()));
    expect(v.expected).toHaveLength(1);
    expect(v.expected[0]).toMatchObject({ docType: 'contract', canIssue: false, blockedReason: COPY.needQuote });

    loadProjectDocuments.mockResolvedValue([doc('quote')]);
    v = await loadAdminDocumentsView({} as any, bundle(step3()));
    expect(v.expected[0]).toMatchObject({ docType: 'contract', canIssue: true, blockedReason: null });
  });

  it('signed contract cannot be replaced', async () => {
    loadProjectDocuments.mockResolvedValue([doc('quote'), doc('contract')]);
    const facts = [...step3(), fact('contract_signed')];
    const v = await loadAdminDocumentsView({} as any, bundle(facts));
    expect(v.expected[0]).toMatchObject({
      docType: 'contract',
      canIssue: false,
      activeRevision: 1,
      blockedReason: COPY.signedNoReplace,
    });
  });

  it('step 6 invoice is preview-only', async () => {
    const facts = [
      ...step3(),
      fact('contract_signed'),
      fact('deposit_received'),
      fact('production_completed'),
      fact('acceptance_signed'),
    ];
    let v = await loadAdminDocumentsView({} as any, bundle(facts));
    expect(v.expected).toEqual([
      { docType: 'invoice', activeRevision: null, canIssue: false, previewOnly: true, blockedReason: COPY.needQuote },
    ]);
    loadProjectDocuments.mockResolvedValue([doc('quote')]);
    v = await loadAdminDocumentsView({} as any, bundle(facts));
    expect(v.expected[0]).toMatchObject({ previewOnly: true, canIssue: false, blockedReason: null });
  });

  it('step 4 and done expect nothing', async () => {
    const s4 = [...step3(), fact('contract_signed'), fact('deposit_received')];
    expect((await loadAdminDocumentsView({} as any, bundle(s4))).expected).toEqual([]);
    const done = [...s4, fact('production_completed'), fact('acceptance_signed'), fact('balance_received')];
    expect((await loadAdminDocumentsView({} as any, bundle(done))).expected).toEqual([]);
  });

  it('issued list is sorted with statuses and replacedBy', async () => {
    loadProjectDocuments.mockResolvedValue([
      doc('contract', 1, { issuedAt: '2026-01-02T00:00:00Z' }),
      doc('quote', 1),
      doc('contract', 2, { replacesDocumentId: 'contract-1', issuedAt: '2026-01-03T00:00:00Z' }),
    ]);
    const v = await loadAdminDocumentsView({} as any, bundle(step3()));
    expect(v.issued.map((d) => `${d.docType}${d.revision}:${d.status}`)).toEqual([
      'quote1:signed',
      'contract2:to_sign',
      'contract1:replaced',
    ]);
    expect(v.issued[2].replacedBy).toEqual({ revision: 2, issuedAt: '2026-01-03T00:00:00Z' });
  });

  it('active quote/spec recaps and signatory', async () => {
    loadActiveSnapshot.mockImplementation(async (_r: unknown, _p: string, t: string) =>
      t === 'quote'
        ? quoteSnap
        : { doc: doc('spec'), snapshot: { docType: 'spec', reference: 'CDC-1', revision: 2, acceptanceCriteria: ['a'] } },
    );
    const v = await loadAdminDocumentsView(
      {} as any,
      bundle(step3(), { signatoryName: 'Jeanne Martin', signatoryRole: 'Gérante' }),
    );
    expect(v.activeQuote).toMatchObject({ reference: 'DEV-1', totalCents: 100, leadTime: '4 semaines' });
    expect(v.activeSpec).toEqual({ reference: 'CDC-1', revision: 2, acceptanceCriteria: ['a'] });
    expect(v.parties.signatory).toBe('Jeanne Martin, Gérante');
    expect(v.parties.clientName).toBe('Acme');

    const none = await loadAdminDocumentsView({} as any, bundle(step3()));
    expect(none.parties.signatory).toBeNull();
  });

  it('snapshots are null when absent', async () => {
    const v = await loadAdminDocumentsView({} as any, bundle(step2()));
    expect(v.activeQuote).toBeNull();
    expect(v.activeSpec).toBeNull();
  });
});
