import { describe, expect, it } from 'vitest';
import type { OnboardingRow } from '@/lib/projects/onboardingSchema';
import { sampleQuoteSnapshot, sampleSpecSnapshot, sampleSeller } from './fixtures';
import type { DocumentInput } from './schemas';
import { buildSnapshot, clientPartyFrom, type SnapshotContext } from './snapshot';
import { buildReference } from './types';
import type { AcceptanceSnapshot, ContractSnapshot, InvoiceSnapshot, QuoteSnapshot } from './types';

const PID = '0a1b2c3d-4e5f-4789-abcd-ef0123456789';
const DID = '11111111-1111-4111-8111-111111111111';

const onboarding: OnboardingRow = {
  companyConfirmedAt: null,
  signatoryName: 'Claire Lambert',
  signatoryRole: 'Gérante',
  projectContactName: null,
  projectContactEmail: null,
  projectContactPhone: null,
  billingSameAsCompany: true,
  billingAddress: null,
  vatStatus: 'not_subject',
  vatNumber: 'FR123',
  existingSiteUrl: null,
  socialLinks: [],
  projectGoal: 'Objectif',
};

function ctx(over: Partial<SnapshotContext> = {}): SnapshotContext {
  return {
    project: { id: PID, title: 'Refonte', offer: 'site-vitrine' },
    client: {
      name: 'Nom client',
      siret: '35600000000048',
      company: { nom: 'Atelier SARL', adresse: '8 avenue', code_postal: '37100', commune: 'Tours' },
    },
    onboarding,
    seller: { ...sampleSeller },
    issuedOn: '2026-10-12',
    revision: 1,
    ...over,
  };
}

const quoteInput = {
  projectId: PID,
  documentId: DID,
  docType: 'quote' as const,
  lines: [
    { designation: 'A', quantity: 2, unitPriceCents: 10050 },
    { designation: 'B', quantity: 1, unitPriceCents: 3333 },
  ],
  depositPercent: 30,
  validityDays: 30,
  leadTime: '6 semaines',
};

function quote(): QuoteSnapshot {
  return buildSnapshot(quoteInput, ctx(), {}) as QuoteSnapshot;
}

describe('clientPartyFrom', () => {
  it('maps company, siren and signatory', () => {
    const c = clientPartyFrom(ctx().client, onboarding);
    expect(c.name).toBe('Atelier SARL');
    expect(c.siren).toBe('356000000');
    expect(c.address).toEqual({ line: '8 avenue', postalCode: '37100', city: 'Tours' });
    expect(c.billingDiffers).toBe(false);
    expect(c.vatNumber).toBeNull();
    expect(c.signatoryName).toBe('Claire Lambert');
  });
  it('falls back to client name and null address', () => {
    const c = clientPartyFrom({ name: 'Fallback', siret: null, company: { nom: ' ' } }, null);
    expect(c.name).toBe('Fallback');
    expect(c.address).toBeNull();
    expect(c.vatStatus).toBeNull();
  });
  it('maps a different billing address and vat number', () => {
    const c = clientPartyFrom(ctx().client, {
      ...onboarding,
      billingSameAsCompany: false,
      billingAddress: { adresse: '3 place', code_postal: '37200', commune: 'Chambray' },
      vatStatus: 'number',
      vatNumber: 'FR40356000000',
    });
    expect(c.billingDiffers).toBe(true);
    expect(c.billingAddress).toEqual({ line: '3 place', postalCode: '37200', city: 'Chambray' });
    expect(c.vatNumber).toBe('FR40356000000');
  });
});

describe('buildSnapshot quote', () => {
  it('recomputes totals and metadata', () => {
    const q = quote();
    expect(q.lines.map((l) => l.totalCents)).toEqual([20100, 3333]);
    expect(q.totalCents).toBe(23433);
    expect(q.depositCents).toBe(7030);
    expect(q.balanceCents).toBe(23433 - 7030);
    expect(q.validUntil).toBe('2026-11-11');
    expect(q.reference).toBe(buildReference('quote', PID, '2026-10-12', 1));
    expect(q.templateVersion).toBe('v1');
    expect(q.schemaVersion).toBe(1);
    expect(q.project.offerLabel).toBe('Site Vitrine');
  });
  it('deep-copies the seller', () => {
    const c = ctx();
    const q = buildSnapshot(quoteInput, c, {});
    c.seller.address.city = 'Autre';
    expect(q.seller.address.city).not.toBe('Autre');
  });
});

describe('buildSnapshot spec', () => {
  it('copies sections and criteria list', () => {
    const s = buildSnapshot(
      {
        projectId: PID,
        documentId: DID,
        docType: 'spec',
        context: 'ctx',
        scope: 'sc',
        deliverables: 'dl',
        outOfScope: '',
        planning: '',
        acceptanceCriteria: '- a\n- b',
        acceptanceCriteriaList: ['a', 'b'],
      } as DocumentInput,
      ctx(),
      {},
    );
    expect(s.docType === 'spec' && s.acceptanceCriteria).toEqual(['a', 'b']);
    expect(s.docType === 'spec' && s.sections.context).toBe('ctx');
  });
});

describe('buildSnapshot contract', () => {
  const input = { projectId: PID, documentId: DID, docType: 'contract' as const };
  it('throws without quote', () => {
    expect(() => buildSnapshot(input, ctx(), {})).toThrow('missing_prerequisite');
  });
  it('copies the quote block', () => {
    const q = sampleQuoteSnapshot();
    const c = buildSnapshot(input, ctx(), { quote: q }) as ContractSnapshot;
    expect(c.quote).toEqual({
      reference: q.reference,
      revision: q.revision,
      issuedOn: q.issuedOn,
      lines: q.lines,
      totalCents: q.totalCents,
      depositPercent: q.depositPercent,
      depositCents: q.depositCents,
      balanceCents: q.balanceCents,
      leadTime: q.leadTime,
    });
    expect(c.startDate).toBeNull();
  });
});

describe('buildSnapshot acceptance', () => {
  const input = {
    projectId: PID,
    documentId: DID,
    docType: 'acceptance' as const,
    deliveryDate: '2026-12-01',
    reservations: '',
  };
  it('throws without spec', () => {
    expect(() => buildSnapshot(input, ctx(), {})).toThrow('missing_prerequisite');
  });
  it('copies criteria verbatim and nulls empty reservations', () => {
    const spec = sampleSpecSnapshot();
    const a = buildSnapshot(input, ctx(), { spec }) as AcceptanceSnapshot;
    expect(a.acceptanceCriteria).toEqual(spec.acceptanceCriteria);
    expect(a.spec).toEqual({ reference: spec.reference, revision: spec.revision, issuedOn: spec.issuedOn });
    expect(a.reservations).toBeNull();
  });
});

describe('buildSnapshot invoice', () => {
  const base = { projectId: PID, documentId: DID, docType: 'invoice' as const, serviceDate: '2026-12-01' };
  const q = sampleQuoteSnapshot();
  it('deposit', () => {
    const i = buildSnapshot({ ...base, kind: 'deposit' }, ctx(), { quote: q }) as InvoiceSnapshot;
    expect(i.lines).toHaveLength(1);
    expect(i.lines[0].designation).toBe(`Acompte de ${q.depositPercent} % sur le devis ${q.reference}`);
    expect(i.lines[0].quantity).toBe(1);
    expect(i.lines[0].unitPriceCents).toBe(q.depositCents);
    expect(i.alreadyPaidCents).toBe(0);
    expect(i.netToPayCents).toBe(q.depositCents);
    expect(i.number).toBe('PROFORMA');
    expect(i.dueDate).toBe('2026-11-11');
    expect(i.deliveryAddress).toBeNull();
    expect(i.operationNature).toBe('Prestation de services');
  });
  it('balance', () => {
    const i = buildSnapshot({ ...base, kind: 'balance' }, ctx(), { quote: q }) as InvoiceSnapshot;
    expect(i.lines).toEqual(q.lines);
    expect(i.totalCents).toBe(q.totalCents);
    expect(i.alreadyPaidCents).toBe(q.depositCents);
    expect(i.netToPayCents).toBe(q.balanceCents);
  });
  it('delivery address only when billing differs', () => {
    const o = {
      ...onboarding,
      billingSameAsCompany: false,
      billingAddress: { adresse: '3 place', code_postal: '37200', commune: 'Chambray' },
    };
    const i = buildSnapshot({ ...base, kind: 'deposit' }, ctx({ onboarding: o }), { quote: q }) as InvoiceSnapshot;
    expect(i.deliveryAddress).toEqual({ line: '8 avenue', postalCode: '37100', city: 'Tours' });
  });
  it('throws without quote', () => {
    expect(() => buildSnapshot({ ...base, kind: 'deposit' }, ctx(), {})).toThrow('missing_prerequisite');
  });
});
