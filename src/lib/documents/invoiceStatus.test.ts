import { describe, expect, it } from 'vitest';
import {
  amountDueCents,
  invoiceStatus,
  isPayable,
  sortInvoicesForDisplay,
  type LedgerKind,
} from './invoiceStatus';

const ev = (kind: LedgerKind, occurredAt: string, amountCents: number | null = null) => ({
  kind,
  occurredAt,
  amountCents,
});

const base = { totalInclTaxCents: 100000, creditedCents: 0 };

describe('invoiceStatus', () => {
  it('sans évènement : à payer', () => {
    const r = invoiceStatus({ ...base, events: [] });
    expect(r).toEqual({ status: 'to_pay', paidAt: null, partialCreditCents: 0, refundPending: false });
  });
  it('processing puis failed : à payer', () => {
    expect(
      invoiceStatus({ ...base, events: [ev('processing', '2026-10-01T10:00:00Z'), ev('failed', '2026-10-01T11:00:00Z')] }).status,
    ).toBe('to_pay');
  });
  it('processing en dernier : en cours', () => {
    expect(
      invoiceStatus({ ...base, events: [ev('failed', '2026-10-01T10:00:00Z'), ev('processing', '2026-10-01T11:00:00Z')] }).status,
    ).toBe('processing');
    expect(
      invoiceStatus({ ...base, events: [ev('processing', '2026-10-01T10:00:00Z'), ev('expired', '2026-10-01T11:00:00Z')] }).status,
    ).toBe('to_pay');
  });
  it('paid : payée avec date', () => {
    const r = invoiceStatus({ ...base, events: [ev('paid', '2026-10-02T09:00:00Z', 100000)] });
    expect(r.status).toBe('paid');
    expect(r.paidAt).toBe('2026-10-02T09:00:00Z');
  });
  it('payée et intégralement créditée sans remboursement : créditée', () => {
    const r = invoiceStatus({
      totalInclTaxCents: 100000,
      creditedCents: 100000,
      events: [ev('paid', '2026-10-02T09:00:00Z')],
    });
    expect(r.status).toBe('credited');
  });
  it('payée puis refunded : remboursée', () => {
    const r = invoiceStatus({
      totalInclTaxCents: 100000,
      creditedCents: 100000,
      events: [ev('paid', '2026-10-02T09:00:00Z'), ev('refund_requested', '2026-10-03T09:00:00Z'), ev('refunded', '2026-10-04T09:00:00Z')],
    });
    expect(r.status).toBe('refunded');
    expect(r.refundPending).toBe(false);
  });
  it('avoir partiel sur payée : payée avec avoir partiel', () => {
    const r = invoiceStatus({
      totalInclTaxCents: 100000,
      creditedCents: 30000,
      events: [ev('paid', '2026-10-02T09:00:00Z')],
    });
    expect(r.status).toBe('paid');
    expect(r.partialCreditCents).toBe(30000);
  });
  it('avoirs égaux au total sur impayée : créditée', () => {
    expect(invoiceStatus({ totalInclTaxCents: 100000, creditedCents: 100000, events: [] }).status).toBe('credited');
  });
  it('anomaly et partially_funded ne changent rien', () => {
    expect(
      invoiceStatus({ ...base, events: [ev('anomaly', '2026-10-01T10:00:00Z'), ev('partially_funded', '2026-10-01T11:00:00Z')] }).status,
    ).toBe('to_pay');
    expect(
      invoiceStatus({ ...base, events: [ev('paid', '2026-10-01T10:00:00Z'), ev('anomaly', '2026-10-01T11:00:00Z')] }).status,
    ).toBe('paid');
  });
  it('refundPending : remboursement demandé sans issue', () => {
    const pending = invoiceStatus({
      totalInclTaxCents: 100000,
      creditedCents: 100000,
      events: [ev('paid', '2026-10-02T09:00:00Z'), ev('refund_requested', '2026-10-03T09:00:00Z')],
    });
    expect(pending.refundPending).toBe(true);
    const failed = invoiceStatus({
      totalInclTaxCents: 100000,
      creditedCents: 100000,
      events: [ev('paid', '2026-10-02T09:00:00Z'), ev('refund_requested', '2026-10-03T09:00:00Z'), ev('refund_failed', '2026-10-04T09:00:00Z')],
    });
    expect(failed.refundPending).toBe(false);
  });
});

describe('isPayable / amountDueCents', () => {
  it('seul to_pay est payable', () => {
    expect(isPayable('to_pay')).toBe(true);
    for (const s of ['processing', 'paid', 'credited', 'refunded'] as const) expect(isPayable(s)).toBe(false);
  });
  it('montant dû plafonné à zéro', () => {
    expect(amountDueCents(100000, 30000)).toBe(70000);
    expect(amountDueCents(100000, 150000)).toBe(0);
  });
});

describe('sortInvoicesForDisplay', () => {
  it('payables en premier, puis date décroissante, avoirs après leur origine', () => {
    const items = [
      { id: 'a', kind: 'invoice' as const, issuedOn: '2026-10-01', status: 'paid' as const },
      { id: 'cn', kind: 'credit_note' as const, issuedOn: '2026-10-20', status: 'paid' as const, originId: 'a' },
      { id: 'b', kind: 'invoice' as const, issuedOn: '2026-11-01', status: 'paid' as const },
      { id: 'c', kind: 'invoice' as const, issuedOn: '2026-09-01', status: 'to_pay' as const },
    ];
    expect(sortInvoicesForDisplay(items).map((i) => i.id)).toEqual(['c', 'b', 'a', 'cn']);
  });
});
