import { describe, expect, it } from 'vitest';
import type { InvoiceRow } from './billing';
import { buildPilotageView, DETAIL_PAGE_SIZE } from './dashboard';
import type { PilotageRows } from './load';
import type { PilotageParams } from './params';

const NOW = new Date('2026-10-07T10:00:00Z');
const P = (over: Partial<PilotageParams> = {}): PilotageParams => ({
  periode: 'mois',
  base: 'ttc',
  tests: false,
  detail: null,
  projectId: null,
  page: 1,
  ...over,
});

function inv(over: Partial<InvoiceRow> & { id: string }): InvoiceRow {
  return {
    projectId: 'pA',
    clientId: 'cA',
    kind: 'deposit',
    number: `F-${over.id}`,
    isTest: false,
    issuedOn: '2026-10-03',
    dueDate: '2026-10-17',
    totalExclTaxCents: 30000,
    vatTotalCents: 0,
    totalInclTaxCents: 30000,
    prepaidCents: 0,
    netToPayCents: 30000,
    vatRegime: 'franchise',
    creditsInvoiceId: null,
    ...over,
  };
}

function fixture(): PilotageRows {
  return {
    clients: [
      { id: 'cA', name: 'Client A', isTest: false },
      { id: 'cB', name: 'Client B', isTest: false },
      { id: 'cT', name: 'Test E2E', isTest: true },
    ],
    projects: [
      { id: 'pA', clientId: 'cA', leadId: 'l1', title: 'Projet A' },
      { id: 'pB', clientId: 'cB', leadId: null, title: 'Projet B' },
      { id: 'pT', clientId: 'cT', leadId: null, title: 'Projet T' },
    ],
    leads: [{ id: 'l1', sourceKind: 'touch', sourceSource: 'google', sourceMedium: 'cpc', sourceCampaign: 'brand' }],
    quoteDocs: [
      { id: 'dA', projectId: 'pA', revision: 1, reference: 'D-A', replacesDocumentId: null, issuedAt: '2026-09-28T08:00:00Z' },
      { id: 'dB', projectId: 'pB', revision: 1, reference: 'D-B', replacesDocumentId: null, issuedAt: '2026-09-29T08:00:00Z' },
      { id: 'dT', projectId: 'pT', revision: 1, reference: 'D-T', replacesDocumentId: null, issuedAt: '2026-09-28T08:00:00Z' },
    ],
    snapshots: [
      { documentId: 'dA', data: { docType: 'quote', totalCents: 100000 } },
      { documentId: 'dB', data: { docType: 'quote', totalCents: 50000 } },
      { documentId: 'dT', data: { docType: 'quote', totalCents: 80000 } },
    ],
    facts: [
      { id: 1, projectId: 'pA', type: 'contract_signed', targetFactId: null, occurredAt: '2026-10-02T09:00:00Z' },
      { id: 2, projectId: 'pT', type: 'contract_signed', targetFactId: null, occurredAt: '2026-10-02T09:00:00Z' },
    ],
    invoices: [
      inv({ id: 'iA1' }),
      inv({
        id: 'iA2',
        kind: 'final',
        issuedOn: '2026-10-05',
        dueDate: '2026-11-15',
        totalExclTaxCents: 100000,
        totalInclTaxCents: 100000,
        prepaidCents: 30000,
        netToPayCents: 70000,
      }),
      inv({ id: 'iT', projectId: 'pT', clientId: 'cT', isTest: true, number: 'TFA-1', totalExclTaxCents: 80000, totalInclTaxCents: 80000, netToPayCents: 80000 }),
    ],
    paymentEvents: [
      { id: 10, invoiceId: 'iA1', kind: 'paid', amountCents: 30000, method: 'card', occurredAt: '2026-10-03T10:00:00Z' },
      { id: 11, invoiceId: 'iT', kind: 'paid', amountCents: 80000, method: 'bank_transfer', occurredAt: '2026-10-03T11:00:00Z' },
    ],
    projectCosts: [
      { id: 20, projectId: 'pA', incurredOn: '2026-10-04', category: 'sous_traitance', label: 'Freelance', amountCents: 5000, vatCents: null, voidsCostId: null, createdAt: '2026-10-04T08:00:00Z' },
    ],
    recurringCosts: [
      { id: 30, seriesId: 's1', label: 'Outil SaaS', category: 'outils', amountCents: 2000, frequency: 'monthly', startsOn: '2026-01-01', endsOn: null, stopped: false, createdAt: '2026-01-01T00:00:00Z' },
    ],
    cashBalances: [{ id: 40, asOf: '2026-10-01', amountCents: 100000, note: null, createdAt: '2026-10-01T00:00:00Z' }],
  };
}

const tile = (v: ReturnType<typeof buildPilotageView>, key: string) => v.tiles.find((t) => t.key === key)!;

describe('buildPilotageView', () => {
  it('computes the default tiles (tests excluded, TTC, October 2026)', () => {
    const v = buildPilotageView(fixture(), P(), NOW);
    expect(v.today).toBe('2026-10-07');
    expect(tile(v, 'pipeline').cents).toBe(50000);
    expect(tile(v, 'signe').cents).toBe(100000);
    expect(tile(v, 'facture').cents).toBe(100000);
    expect(tile(v, 'encaisse').cents).toBe(30000);
    expect(tile(v, 'marge_projetee').cents).toBe(93000);
    expect(tile(v, 'marge_realisee').cents).toBe(23000);
    expect(tile(v, 'a_facturer').cents).toBe(0);
    expect(v.tiles.map((t) => t.key)).toEqual(['pipeline', 'signe', 'facture', 'encaisse', 'marge_projetee', 'marge_realisee', 'a_facturer']);
    expect(v.projects.map((p) => p.projectId)).toEqual(['pA']);
    expect(v.globalMarginCents).toBe(93000);
    expect(v.recurringPeriodCents).toBe(2000);
  });

  it('counts test-client projects only when tests are included', () => {
    const v = buildPilotageView(fixture(), P({ tests: true }), NOW);
    expect(tile(v, 'signe').cents).toBe(180000);
    expect(tile(v, 'facture').cents).toBe(180000);
    expect(tile(v, 'encaisse').cents).toBe(110000);
    expect(v.projects.some((p) => p.projectId === 'pT')).toBe(true);
  });

  it('splits signed by frozen source and adds the no-lead row', () => {
    const v = buildPilotageView(fixture(), P(), NOW);
    expect(v.sources.rows).toHaveLength(1);
    expect(v.sources.rows[0]).toMatchObject({ source: 'google', campaign: 'brand', signedCents: 100000 });
    expect(v.sources.totalCents).toBe(tile(v, 'signe').cents);
    const r = fixture();
    r.facts.push({ id: 3, projectId: 'pB', type: 'contract_signed', targetFactId: null, occurredAt: '2026-10-06T09:00:00Z' });
    const w = buildPilotageView(r, P(), NOW);
    expect(w.sources.rows.some((s) => s.source === 'Direct / hors lead' && s.signedCents === 50000)).toBe(true);
    expect(w.sources.totalCents).toBe(tile(w, 'signe').cents);
  });

  it('concordance: detail rows across every page sum to the tile', () => {
    const r = fixture();
    // 120 factures supplémentaires pour forcer la pagination.
    for (let i = 0; i < 120; i++) r.invoices.push(inv({ id: `x${String(i).padStart(3, '0')}`, issuedOn: '2026-10-06', totalExclTaxCents: 100, totalInclTaxCents: 100, netToPayCents: 100 }));
    const keys: [string, 'devis' | 'signe' | 'facture' | 'paiement'][] = [
      ['pipeline', 'devis'],
      ['signe', 'signe'],
      ['facture', 'facture'],
      ['encaisse', 'paiement'],
    ];
    for (const tests of [false, true]) {
      for (const [tileKey, detail] of keys) {
        const first = buildPilotageView(r, P({ detail, tests }), NOW);
        const t = tile(first, tileKey);
        expect(first.detail!.totalCents).toBe(t.cents);
        let sum = 0;
        for (let page = 1; page <= first.detail!.pageCount; page++) {
          const v = buildPilotageView(r, P({ detail, tests, page }), NOW);
          sum += v.detail!.rows.reduce((s, row) => s + row.amountCents, 0);
        }
        expect(sum, `${tileKey} tests=${tests}`).toBe(t.cents);
      }
    }
  });

  it('concordance: facturé equals an independent raw sum', () => {
    const r = fixture();
    r.invoices.push(
      inv({ id: 'cn1', kind: 'credit_note', creditsInvoiceId: 'iA1', issuedOn: '2026-10-06', totalExclTaxCents: 4000, totalInclTaxCents: 4000, netToPayCents: 0 }),
    );
    const v = buildPilotageView(r, P(), NOW);
    const kept = r.invoices.filter((i) => !i.isTest && i.issuedOn >= '2026-10-01' && i.issuedOn <= '2026-10-31');
    const raw =
      kept.filter((i) => i.kind !== 'credit_note').reduce((s, i) => s + i.netToPayCents, 0) -
      kept.filter((i) => i.kind === 'credit_note').reduce((s, i) => s + i.totalInclTaxCents, 0);
    expect(tile(v, 'facture').cents).toBe(raw);
    expect(raw).toBe(96000);
  });

  it('marge réalisée composée: encaissé positif et coûts payés négatifs', () => {
    const v = buildPilotageView(fixture(), P({ detail: 'cout' }), NOW);
    const d = v.detail!;
    expect(d.title).toBe('Marge réalisée');
    expect(d.totalCents).toBe(23000);
    expect(d.totalCents).toBe(tile(v, 'marge_realisee').cents);
    const pay = d.rows.filter((r) => r.type === 'paiement');
    const cost = d.rows.filter((r) => r.type === 'cout');
    expect(pay.map((r) => r.amountCents)).toEqual([30000]);
    expect(cost.map((r) => r.amountCents).sort((a, b) => a - b)).toEqual([-5000, -2000]);
    let sum = 0;
    for (let page = 1; page <= d.pageCount; page++) {
      sum += buildPilotageView(fixture(), P({ detail: 'cout', page }), NOW).detail!.rows.reduce((s, r) => s + r.amountCents, 0);
    }
    expect(sum).toBe(23000);
  });

  it('links projected margin and remaining-to-invoice to the project table', () => {
    const v = buildPilotageView(fixture(), P(), NOW);
    for (const k of ['marge_projetee', 'a_facturer']) {
      expect(tile(v, k).detail).toBeNull();
      expect(tile(v, k).anchor).toBe('#marge-projets');
    }
    expect(tile(v, 'pipeline').rule).toBe('Devis émis non signés, à ce jour. La période ne le filtre pas.');
  });

  it('filters the detail by project and titles it', () => {
    const v = buildPilotageView(fixture(), P({ detail: 'facture', projectId: 'pA' }), NOW);
    expect(v.detail!.title).toBe('Détail : CA facturé · Projet A');
    expect(v.detail!.projectTitle).toBe('Projet A');
    expect(v.detail!.rows.every((r) => r.type === 'facture' && r.clientName === 'Client A')).toBe(true);
    const none = buildPilotageView(fixture(), P({ detail: 'facture', projectId: 'pB' }), NOW);
    expect(none.detail!.rows).toHaveLength(0);
    expect(none.detail!.pageCount).toBe(1);
  });

  it('paginates by 50 and clamps the page', () => {
    const r = fixture();
    r.invoices = [];
    r.paymentEvents = [];
    for (let i = 0; i < 120; i++) r.invoices.push(inv({ id: `y${String(i).padStart(3, '0')}`, totalExclTaxCents: 100, totalInclTaxCents: 100, netToPayCents: 100 }));
    expect(DETAIL_PAGE_SIZE).toBe(50);
    const p3 = buildPilotageView(r, P({ detail: 'facture', page: 3 }), NOW).detail!;
    expect(p3.pageCount).toBe(3);
    expect(p3.rows).toHaveLength(20);
    expect(p3.totalRows).toBe(120);
    const beyond = buildPilotageView(r, P({ detail: 'facture', page: 9 }), NOW).detail!;
    expect(beyond.page).toBe(3);
    expect(beyond.rows).toHaveLength(20);
  });

  it('projects six months of cash', () => {
    const v = buildPilotageView(fixture(), P(), NOW);
    expect(v.cash.months).toHaveLength(6);
    expect(v.cash.months[0].month).toBe('2026-10');
    expect(v.cash.months[1].inflowCents).toBe(70000);
    expect(v.cash.hasBalance).toBe(true);
    const r = fixture();
    r.cashBalances = [];
    expect(buildPilotageView(r, P(), NOW).cash.hasBalance).toBe(false);
  });

  it('flags empty and franchise-only states', () => {
    const r = fixture();
    r.quoteDocs = [];
    r.invoices = [];
    expect(buildPilotageView(r, P(), NOW).isEmpty).toBe(true);
    expect(buildPilotageView(fixture(), P(), NOW).isEmpty).toBe(false);
    expect(buildPilotageView(fixture(), P(), NOW).allFranchise).toBe(true);
    const s = fixture();
    s.invoices[0] = inv({ id: 'iA1', vatRegime: 'standard', vatTotalCents: 5000, totalExclTaxCents: 25000 });
    expect(buildPilotageView(s, P(), NOW).allFranchise).toBe(false);
  });

  it('lists anomalies from the underlying modules', () => {
    const r = fixture();
    r.snapshots[1] = { documentId: 'dB', data: { docType: 'quote', totalCents: -5 } };
    r.facts.push({ id: 9, projectId: 'pB', type: 'contract_signed', targetFactId: null, occurredAt: '2026-10-06T09:00:00Z' });
    r.invoices.push(inv({ id: 'nd', dueDate: null }));
    r.invoices.push(inv({ id: 'cx', kind: 'credit_note', creditsInvoiceId: 'iA1', totalExclTaxCents: 40000, totalInclTaxCents: 40000, netToPayCents: 0 }));
    const kinds = new Set(buildPilotageView(r, P(), NOW).anomalies.map((a) => a.kind));
    expect(kinds.has('quote_invalid_amount')).toBe(true);
    expect(kinds.has('invoice_without_due')).toBe(true);
    expect(kinds.has('credit_exceeds_net')).toBe(true);
    const c = fixture();
    c.projects.push({ id: 'pC', clientId: 'cA', leadId: null, title: 'Projet C' });
    c.facts.push({ id: 8, projectId: 'pC', type: 'contract_signed', targetFactId: null, occurredAt: '2026-10-06T09:00:00Z' });
    expect(buildPilotageView(c, P(), NOW).anomalies.some((a) => a.kind === 'contract_without_quote')).toBe(true);
  });
});
