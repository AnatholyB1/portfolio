import { describe, expect, it } from 'vitest';
import {
  billingAnomalies,
  collected,
  invoiced,
  refundedAsOf,
  sumByProject,
  unpaidInvoices,
  type InvoiceRow,
  type PaymentEventRow,
} from './billing';
import { ALL_TIME } from './periods';

const OCT = { from: '2026-10-01', to: '2026-10-31' };
const NOV = { from: '2026-11-01', to: '2026-11-30' };

function inv(over: Partial<InvoiceRow> & { id: string }): InvoiceRow {
  return {
    projectId: 'p1',
    clientId: 'c1',
    kind: 'final',
    number: `FA-${over.id}`,
    isTest: false,
    issuedOn: '2026-10-05',
    dueDate: '2026-11-05',
    totalExclTaxCents: 0,
    vatTotalCents: 0,
    totalInclTaxCents: 0,
    prepaidCents: 0,
    netToPayCents: 0,
    vatRegime: 'franchise',
    creditsInvoiceId: null,
    ...over,
  };
}

let evId = 0;
function ev(invoiceId: string, kind: PaymentEventRow['kind'], amountCents: number | null, occurredAt: string): PaymentEventRow {
  return { id: ++evId, invoiceId, kind, amountCents, method: 'card', occurredAt };
}

const deposit = inv({
  id: 'd',
  kind: 'deposit',
  totalExclTaxCents: 300000,
  totalInclTaxCents: 300000,
  netToPayCents: 300000,
});
const final = inv({
  id: 'f',
  kind: 'final',
  totalExclTaxCents: 1000000,
  totalInclTaxCents: 1000000,
  prepaidCents: 300000,
  netToPayCents: 700000,
});
const credit = inv({
  id: 'cn',
  kind: 'credit_note',
  issuedOn: '2026-11-10',
  dueDate: null,
  totalExclTaxCents: 50000,
  totalInclTaxCents: 50000,
  netToPayCents: 0,
  creditsInvoiceId: 'f',
});

const sum = (items: { amountCents: number }[]) => items.reduce((s, i) => s + i.amountCents, 0);

describe('invoiced', () => {
  it("acompte : l'acompte n'est jamais compté deux fois", () => {
    const r = invoiced([deposit, final], ALL_TIME, 'ttc');
    expect(r.totalCents).toBe(1000000);
    expect(r.totalCents).toBe(sum(r.items));
  });

  it('avoir partiel : négatif dans sa propre période', () => {
    const all = [deposit, final, credit];
    const oct = invoiced(all, OCT, 'ttc');
    expect(oct.totalCents).toBe(1000000);
    const nov = invoiced(all, NOV, 'ttc');
    expect(nov.items).toHaveLength(1);
    expect(nov.items[0].amountCents).toBe(-50000);
    expect(nov.totalCents).toBe(sum(nov.items));
    expect(invoiced(all, ALL_TIME, 'ttc').totalCents).toBe(950000);
  });

  it('séries de test exclues sauf includeTests', () => {
    const t = inv({ id: 't', isTest: true, totalExclTaxCents: 1000, totalInclTaxCents: 1000, netToPayCents: 1000 });
    const tc = inv({
      id: 'tc',
      kind: 'credit_note',
      isTest: true,
      totalExclTaxCents: 400,
      totalInclTaxCents: 400,
      creditsInvoiceId: 't',
    });
    const all = [deposit, t, tc];
    const excluded = invoiced(all, ALL_TIME, 'ttc');
    expect(excluded.items.map((i) => i.invoiceId)).toEqual(['d']);
    expect(excluded.totalCents).toBe(300000);
    const kept = invoiced(all, ALL_TIME, 'ttc', true);
    expect(kept.items.map((i) => i.invoiceId)).toEqual(['d', 't', 'tc']);
    expect(kept.totalCents).toBe(300600);
    expect(kept.totalCents).toBe(sum(kept.items));
  });

  it('base HT franchise égale TTC', () => {
    expect(invoiced([deposit, final], ALL_TIME, 'ht').totalCents).toBe(1000000);
  });

  it('régime standard hypothétique : HT proratisé (A4)', () => {
    const s = inv({
      id: 's',
      vatRegime: 'standard',
      totalExclTaxCents: 100000,
      vatTotalCents: 20000,
      totalInclTaxCents: 120000,
      netToPayCents: 120000,
    });
    expect(invoiced([s], ALL_TIME, 'ht').totalCents).toBe(100000);
    expect(invoiced([s], ALL_TIME, 'ttc').totalCents).toBe(120000);
  });

  it('montant invalide lève invalid_amount', () => {
    const bad = inv({ id: 'x', totalExclTaxCents: 10.5, totalInclTaxCents: 10, netToPayCents: 10 });
    expect(() => invoiced([bad], ALL_TIME, 'ttc')).toThrow('invalid_amount');
  });
});

describe('collected', () => {
  const invs = [deposit, final];

  it('paid compte dans le mois', () => {
    const r = collected(invs, [ev('d', 'paid', 300000, '2026-10-05T10:00:00Z')], OCT, 'ttc');
    expect(r.totalCents).toBe(300000);
    expect(r.items[0]).toMatchObject({ kind: 'paid', invoiceId: 'd', date: '2026-10-05' });
    expect(r.totalCents).toBe(sum(r.items));
  });

  it('remboursement cumulatif : maximum, jamais la somme', () => {
    const events = [
      ev('d', 'paid', 300000, '2026-10-05T10:00:00Z'),
      ev('d', 'refunded', 30000, '2026-10-10T10:00:00Z'),
      ev('d', 'refunded', 50000, '2026-10-20T10:00:00Z'),
    ];
    const r = collected(invs, events, OCT, 'ttc');
    expect(r.totalCents).toBe(300000 - 50000);
    expect(r.totalCents).toBe(sum(r.items));
    expect(r.items.filter((i) => i.kind === 'refunded')).toHaveLength(1);
  });

  it('fenêtre ne couvrant que le second remboursement : -20000', () => {
    const events = [
      ev('d', 'paid', 300000, '2026-10-05T10:00:00Z'),
      ev('d', 'refunded', 30000, '2026-10-10T10:00:00Z'),
      ev('d', 'refunded', 50000, '2026-11-20T10:00:00Z'),
    ];
    const r = collected(invs, events, NOV, 'ttc');
    expect(r.totalCents).toBe(-20000);
    expect(r.items[0]).toMatchObject({ kind: 'refunded', amountCents: -20000, date: '2026-11-20' });
  });

  it('refundedAsOf plafonné par paid', () => {
    const events = [ev('d', 'refunded', 90000, '2026-10-10T10:00:00Z')];
    expect(refundedAsOf(events, 0, '2026-12-31')).toBe(0);
    expect(refundedAsOf(events, 60000, '2026-12-31')).toBe(60000);
    expect(refundedAsOf(events, 300000, '2026-10-09')).toBe(0);
  });

  it('remboursement sans paid ne compte pas', () => {
    const r = collected(invs, [ev('d', 'refunded', 50000, '2026-10-10T10:00:00Z')], ALL_TIME, 'ttc');
    expect(r.totalCents).toBe(0);
    expect(r.items).toEqual([]);
  });

  it('autres évènements ignorés', () => {
    const kinds = ['anomaly', 'refund_requested', 'processing', 'failed', 'expired', 'partially_funded', 'refund_failed'] as const;
    const events = kinds.map((k) => ev('d', k, 300000, '2026-10-05T10:00:00Z'));
    const r = collected(invs, events, ALL_TIME, 'ttc');
    expect(r.items).toEqual([]);
    expect(r.totalCents).toBe(0);
  });

  it('date Paris du paiement', () => {
    const e = ev('d', 'paid', 300000, '2026-10-31T23:30:00Z');
    expect(collected(invs, [e], OCT, 'ttc').totalCents).toBe(0);
    expect(collected(invs, [e], NOV, 'ttc').totalCents).toBe(300000);
  });

  it('séries de test exclues des encaissements', () => {
    const t = inv({ id: 't', isTest: true, totalExclTaxCents: 1000, totalInclTaxCents: 1000, netToPayCents: 1000 });
    const e = ev('t', 'paid', 1000, '2026-10-05T10:00:00Z');
    expect(collected([t], [e], ALL_TIME, 'ttc').totalCents).toBe(0);
    expect(collected([t], [e], ALL_TIME, 'ttc', true).totalCents).toBe(1000);
  });
});

describe('unpaidInvoices', () => {
  it('impayées avec reste dû, retard', () => {
    const all = [deposit, final, credit];
    const events = [ev('d', 'paid', 300000, '2026-10-05T10:00:00Z')];
    const r = unpaidInvoices(all, events, '2026-10-07', 'ttc');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ invoiceId: 'f', amountCents: 650000, overdue: false });
  });

  it('retard et échéance absente', () => {
    const late = inv({ id: 'l', dueDate: '2026-09-30', totalExclTaxCents: 100, totalInclTaxCents: 100, netToPayCents: 100 });
    const none = inv({ id: 'n', dueDate: null, totalExclTaxCents: 100, totalInclTaxCents: 100, netToPayCents: 100 });
    const r = unpaidInvoices([late, none], [], '2026-10-07', 'ttc');
    expect(r.map((x) => x.overdue)).toEqual([true, true]);
  });

  it('processing apparaît ; payée, remboursée, créditée ou nulle non', () => {
    const p = inv({ id: 'p', totalExclTaxCents: 100, totalInclTaxCents: 100, netToPayCents: 100 });
    const paid = inv({ id: 'a', totalExclTaxCents: 100, totalInclTaxCents: 100, netToPayCents: 100 });
    const refunded = inv({ id: 'r', totalExclTaxCents: 100, totalInclTaxCents: 100, netToPayCents: 100 });
    const credited = inv({ id: 'c', totalExclTaxCents: 100, totalInclTaxCents: 100, netToPayCents: 100 });
    const cc = inv({ id: 'cc', kind: 'credit_note', totalExclTaxCents: 100, totalInclTaxCents: 100, creditsInvoiceId: 'c' });
    const zero = inv({ id: 'z' });
    const events = [
      ev('p', 'processing', null, '2026-10-01T10:00:00Z'),
      ev('a', 'paid', 100, '2026-10-01T10:00:00Z'),
      ev('r', 'paid', 100, '2026-10-01T10:00:00Z'),
      ev('r', 'refunded', 100, '2026-10-02T10:00:00Z'),
    ];
    const r = unpaidInvoices([p, paid, refunded, credited, cc, zero], events, '2026-10-07', 'ttc');
    expect(r.map((x) => x.invoiceId)).toEqual(['p']);
  });
});

describe('billingAnomalies', () => {
  it('avoirs supérieurs au net et facture sans échéance', () => {
    const big = inv({
      id: 'b',
      kind: 'credit_note',
      totalExclTaxCents: 800000,
      totalInclTaxCents: 800000,
      creditsInvoiceId: 'f',
    });
    const noDue = inv({ id: 'x', dueDate: null, totalExclTaxCents: 1, totalInclTaxCents: 1, netToPayCents: 1 });
    const r = billingAnomalies([final, big, noDue]);
    expect(r).toContainEqual({ kind: 'credit_exceeds_net', ref: final.number });
    expect(r).toContainEqual({ kind: 'invoice_without_due', ref: noDue.number });
    expect(r).toHaveLength(2);
  });
});

describe('sumByProject', () => {
  it('somme par projet', () => {
    const items = [
      { projectId: 'a', amountCents: 10 },
      { projectId: 'a', amountCents: -3 },
      { projectId: 'b', amountCents: 5 },
    ];
    const m = sumByProject(items);
    expect(m.get('a')).toBe(7);
    expect(m.get('b')).toBe(5);
  });
});
