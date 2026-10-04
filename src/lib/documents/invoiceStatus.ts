// Module pur, sûr côté client. Statut de facture dérivé du registre d'évènements et des avoirs,
// jamais stocké (D-16, PAY-02, D-18) : « Payée » ne vient que d'un évènement paid vérifié.
export { amountDueCents } from './invoiceMath';

export const LEDGER_KINDS = [
  'processing',
  'paid',
  'failed',
  'expired',
  'partially_funded',
  'refund_requested',
  'refunded',
  'refund_failed',
  'anomaly',
] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

export type InvoiceStatus = 'to_pay' | 'processing' | 'paid' | 'credited' | 'refunded';

export type LedgerEvent = { kind: LedgerKind; occurredAt: string; amountCents: number | null };

export function invoiceStatus(input: {
  totalInclTaxCents: number;
  creditedCents: number;
  events: LedgerEvent[];
}): { status: InvoiceStatus; paidAt: string | null; partialCreditCents: number; refundPending: boolean } {
  const events = [...input.events].sort((a, b) =>
    a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0,
  );
  const paid = events.find((e) => e.kind === 'paid') ?? null;
  const hasRefunded = events.some((e) => e.kind === 'refunded');

  let lastRefundRequest = -1;
  events.forEach((e, i) => {
    if (e.kind === 'refund_requested') lastRefundRequest = i;
  });
  const refundPending =
    lastRefundRequest >= 0 &&
    !events.slice(lastRefundRequest + 1).some((e) => e.kind === 'refunded' || e.kind === 'refund_failed');

  const fullyCredited = input.totalInclTaxCents > 0 && input.creditedCents >= input.totalInclTaxCents;
  const partialCreditCents =
    input.creditedCents > 0 && input.creditedCents < input.totalInclTaxCents ? input.creditedCents : 0;

  const lastPayment = [...events]
    .reverse()
    .find((e) => e.kind === 'processing' || e.kind === 'failed' || e.kind === 'expired');

  let status: InvoiceStatus;
  if (paid && hasRefunded) status = 'refunded';
  else if (fullyCredited) status = 'credited';
  else if (paid) status = 'paid';
  else if (lastPayment?.kind === 'processing') status = 'processing';
  else status = 'to_pay';

  return { status, paidAt: paid ? paid.occurredAt : null, partialCreditCents, refundPending };
}

export function isPayable(status: InvoiceStatus): boolean {
  return status === 'to_pay';
}

type Sortable = {
  id: string;
  kind: 'invoice' | 'credit_note';
  issuedOn: string;
  status: InvoiceStatus;
  originId?: string;
};

/** Payables d'abord, puis date d'émission décroissante ; chaque avoir juste après son origine. */
export function sortInvoicesForDisplay<T extends Sortable>(items: T[]): T[] {
  const desc = (a: T, b: T) => (a.issuedOn < b.issuedOn ? 1 : a.issuedOn > b.issuedOn ? -1 : 0);
  const notes = items.filter((i) => i.kind === 'credit_note');
  const invoices = items.filter((i) => i.kind === 'invoice');
  const payable = invoices.filter((i) => isPayable(i.status)).sort(desc);
  const rest = invoices.filter((i) => !isPayable(i.status)).sort(desc);
  const ordered = [...payable, ...rest];
  const out: T[] = [];
  for (const inv of ordered) {
    out.push(inv);
    out.push(...notes.filter((n) => n.originId === inv.id).sort(desc));
  }
  const placed = new Set(out);
  out.push(...notes.filter((n) => !placed.has(n)).sort(desc));
  return out;
}
