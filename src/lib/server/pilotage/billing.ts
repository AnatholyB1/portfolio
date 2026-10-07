// Module pur. Montants en centimes entiers. Facturé = net à payer moins avoirs ; encaissé = paid moins remboursé (cumulatif, max par facture).
import { parisDateOf, addDaysIso } from '@/lib/documents/dates';
import { amountDueCents, invoiceStatus, type LedgerEvent, type LedgerKind } from '@/lib/documents/invoiceStatus';
import type { Base } from './params';
import type { DateRange } from './periods';
import { inRange } from './periods';

export type InvoiceRow = {
  id: string;
  projectId: string;
  clientId: string;
  kind: 'deposit' | 'period' | 'final' | 'credit_note';
  number: string;
  isTest: boolean;
  issuedOn: string;
  dueDate: string | null;
  totalExclTaxCents: number;
  vatTotalCents: number;
  totalInclTaxCents: number;
  prepaidCents: number;
  netToPayCents: number;
  vatRegime: 'franchise' | 'standard';
  creditsInvoiceId: string | null;
};
export type PaymentEventRow = {
  id: number;
  invoiceId: string;
  kind: LedgerKind;
  amountCents: number | null;
  method: string | null;
  occurredAt: string;
};
export type InvoicedItem = {
  invoiceId: string;
  number: string;
  projectId: string;
  clientId: string;
  date: string;
  kind: InvoiceRow['kind'];
  amountCents: number;
};
export type CollectedItem = {
  eventId: number;
  invoiceId: string;
  number: string;
  projectId: string;
  date: string;
  kind: 'paid' | 'refunded';
  method: string | null;
  amountCents: number;
};
export type UnpaidInvoice = {
  invoiceId: string;
  number: string;
  projectId: string;
  dueDate: string | null;
  amountCents: number;
  overdue: boolean;
};
export type Anomaly = {
  kind: 'contract_without_quote' | 'quote_invalid_amount' | 'credit_exceeds_net' | 'invoice_without_due';
  ref: string;
};
export type Aggregate<T> = { totalCents: number; items: T[] };

function requireCents(n: number | null): number {
  if (n === null || !Number.isSafeInteger(n) || n < 0) throw new Error('invalid_amount');
  return n;
}

const eventDate = (e: PaymentEventRow) => parisDateOf(new Date(e.occurredAt));

export function filterInvoices(invoices: InvoiceRow[], includeTests: boolean): InvoiceRow[] {
  return includeTests ? invoices : invoices.filter((i) => !i.isTest);
}

export function filterEvents(events: PaymentEventRow[], invoiceIds: Set<string>): PaymentEventRow[] {
  return events.filter((e) => invoiceIds.has(e.invoiceId));
}

/** Convertit un montant TTC d'une facture dans la base demandée. */
function scale(inv: InvoiceRow, ttcCents: number, base: Base): number {
  if (base === 'ttc') return ttcCents;
  if (inv.vatTotalCents === 0) return ttcCents;
  if (inv.totalInclTaxCents === 0) return 0;
  // Hypothèse A4 : la TVA est répartie au prorata du total, un seul calcul flottant, arrondi à l'entier.
  return Math.round((ttcCents * inv.totalExclTaxCents) / inv.totalInclTaxCents);
}

function validate(inv: InvoiceRow): void {
  requireCents(inv.totalExclTaxCents);
  requireCents(inv.vatTotalCents);
  requireCents(inv.totalInclTaxCents);
  requireCents(inv.prepaidCents);
  requireCents(inv.netToPayCents);
}

/** Montant net d'une facture (avoir : montant crédité, positif) dans la base demandée. */
export function invoiceNetCents(inv: InvoiceRow, base: Base): number {
  validate(inv);
  const credit = inv.kind === 'credit_note';
  const ttc = credit ? inv.totalInclTaxCents : inv.netToPayCents;
  if (base === 'ttc') return ttc;
  if (inv.vatTotalCents === 0) {
    return credit ? inv.totalExclTaxCents : inv.totalExclTaxCents - inv.prepaidCents;
  }
  return scale(inv, ttc, base);
}

export function invoiced(
  invoices: InvoiceRow[],
  range: DateRange,
  base: Base,
  includeTests = false,
): Aggregate<InvoicedItem> {
  const items: InvoicedItem[] = [];
  for (const inv of filterInvoices(invoices, includeTests)) {
    if (!inRange(inv.issuedOn, range)) continue;
    const net = invoiceNetCents(inv, base);
    items.push({
      invoiceId: inv.id,
      number: inv.number,
      projectId: inv.projectId,
      clientId: inv.clientId,
      date: inv.issuedOn,
      kind: inv.kind,
      amountCents: inv.kind === 'credit_note' ? -net : net,
    });
  }
  return { totalCents: items.reduce((s, i) => s + i.amountCents, 0), items };
}

/** Remboursé cumulé à une date : maximum des évènements refunded jusqu'à cette date, plafonné au payé. */
export function refundedAsOf(events: PaymentEventRow[], paidCents: number, date: string): number {
  let max = 0;
  for (const e of events) {
    if (e.kind !== 'refunded' || eventDate(e) > date) continue;
    max = Math.max(max, requireCents(e.amountCents));
  }
  return Math.min(max, paidCents);
}

export function collected(
  invoices: InvoiceRow[],
  events: PaymentEventRow[],
  range: DateRange,
  base: Base,
  includeTests = false,
): Aggregate<CollectedItem> {
  const kept = filterInvoices(invoices, includeTests).filter((i) => i.kind !== 'credit_note');
  const byId = new Map(kept.map((i) => [i.id, i]));
  const evs = filterEvents(events, new Set(byId.keys()));
  const items: CollectedItem[] = [];

  for (const inv of kept) {
    const own = evs.filter((e) => e.invoiceId === inv.id);
    const paidEvents = own.filter((e) => e.kind === 'paid');
    for (const e of paidEvents) {
      const date = eventDate(e);
      if (!inRange(date, range)) continue;
      items.push({
        eventId: e.id,
        invoiceId: inv.id,
        number: inv.number,
        projectId: inv.projectId,
        date,
        kind: 'paid',
        method: e.method,
        amountCents: scale(inv, requireCents(e.amountCents), base),
      });
    }

    const paidTotal = paidEvents.reduce((s, e) => s + requireCents(e.amountCents), 0);
    const before = range.from <= '0001-01-01' ? 0 : refundedAsOf(own, paidTotal, addDaysIso(range.from, -1));
    const delta = refundedAsOf(own, paidTotal, range.to) - before;
    if (delta <= 0) continue;
    let carrier: PaymentEventRow | null = null;
    for (const e of own) {
      if (e.kind !== 'refunded' || !inRange(eventDate(e), range)) continue;
      if (!carrier || (e.amountCents ?? 0) >= (carrier.amountCents ?? 0)) carrier = e;
    }
    if (!carrier) continue;
    items.push({
      eventId: carrier.id,
      invoiceId: inv.id,
      number: inv.number,
      projectId: inv.projectId,
      date: eventDate(carrier),
      kind: 'refunded',
      method: carrier.method,
      amountCents: -scale(inv, delta, base),
    });
  }
  return { totalCents: items.reduce((s, i) => s + i.amountCents, 0), items };
}

export function creditedByInvoice(invoices: InvoiceRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.kind !== 'credit_note' || !inv.creditsInvoiceId) continue;
    m.set(inv.creditsInvoiceId, (m.get(inv.creditsInvoiceId) ?? 0) + requireCents(inv.totalInclTaxCents));
  }
  return m;
}

export function unpaidInvoices(
  invoices: InvoiceRow[],
  events: PaymentEventRow[],
  today: string,
  base: Base,
  includeTests = false,
): UnpaidInvoice[] {
  const kept = filterInvoices(invoices, includeTests);
  const credited = creditedByInvoice(kept);
  const evs = filterEvents(events, new Set(kept.map((i) => i.id)));
  const out: UnpaidInvoice[] = [];
  for (const inv of kept) {
    if (inv.kind === 'credit_note') continue;
    validate(inv);
    const ledger: LedgerEvent[] = evs
      .filter((e) => e.invoiceId === inv.id)
      .map((e) => ({ kind: e.kind, occurredAt: e.occurredAt, amountCents: e.amountCents }));
    const creditedCents = credited.get(inv.id) ?? 0;
    const { status } = invoiceStatus({ totalInclTaxCents: inv.totalInclTaxCents, creditedCents, events: ledger });
    if (status !== 'to_pay' && status !== 'processing') continue;
    const due = amountDueCents(inv.netToPayCents, creditedCents);
    if (due <= 0) continue;
    out.push({
      invoiceId: inv.id,
      number: inv.number,
      projectId: inv.projectId,
      dueDate: inv.dueDate,
      amountCents: scale(inv, due, base),
      overdue: inv.dueDate === null || inv.dueDate < today,
    });
  }
  return out;
}

export function billingAnomalies(invoices: InvoiceRow[]): Anomaly[] {
  const out: Anomaly[] = [];
  const credited = creditedByInvoice(invoices);
  for (const inv of invoices) {
    if (inv.kind === 'credit_note') continue;
    if ((credited.get(inv.id) ?? 0) > inv.netToPayCents) out.push({ kind: 'credit_exceeds_net', ref: inv.number });
    if (inv.dueDate === null) out.push({ kind: 'invoice_without_due', ref: inv.number });
  }
  return out;
}

export function sumByProject(items: { projectId: string; amountCents: number }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const i of items) m.set(i.projectId, (m.get(i.projectId) ?? 0) + i.amountCents);
  return m;
}
