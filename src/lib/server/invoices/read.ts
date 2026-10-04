// Lectures factures : toujours via le client RLS de l'appelant, colonnes explicites, jamais snapshot ni storage_path (D-16, D-18).
// PRECONDITION: l'appelant a exécuté requireAdmin() ou requireClient() et fournit son client RLS.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  amountDueCents,
  invoiceStatus,
  sortInvoicesForDisplay,
  type InvoiceStatus,
  type LedgerEvent,
  type LedgerKind,
} from '@/lib/documents/invoiceStatus';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type InvoiceKind = 'deposit' | 'period' | 'final';

export type InvoiceView = {
  id: string;
  projectId: string;
  kind: InvoiceKind | 'credit_note';
  number: string;
  isTest: boolean;
  issuedOn: string;
  dueDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  totalInclTaxCents: number;
  netToPayCents: number;
  amountDueCents: number;
  creditsInvoiceId: string | null;
  status: InvoiceStatus;
  paidAt: string | null;
  partialCreditCents: number;
  refundPending: boolean;
  refundFailed: boolean;
  lastFailedAt: string | null;
  hasPdf: boolean;
  sha256: string | null;
  creditNotes: InvoiceView[];
};

export const INVOICE_COLS =
  'id, project_id, kind, number, is_test, issued_on, due_date, service_period_start, service_period_end, total_incl_tax_cents, net_to_pay_cents, credits_invoice_id';

/** Échec de lecture des factures : jamais confondu avec une liste vide. */
export class InvoicesLoadError extends Error {
  constructor() {
    super('invoices_load_failed');
    this.name = 'InvoicesLoadError';
  }
}

async function query(run: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<Row[]> {
  let res;
  try {
    res = await run();
  } catch {
    console.error('[invoices/read] list failed');
    throw new InvoicesLoadError();
  }
  if (res.error) {
    console.error('[invoices/read] list failed');
    throw new InvoicesLoadError();
  }
  return (res.data ?? []) as Row[];
}

type LedgerRow = LedgerEvent & { id: number };

function lastIndexOf(events: LedgerRow[], kind: LedgerKind): number {
  for (let i = events.length - 1; i >= 0; i--) if (events[i].kind === kind) return i;
  return -1;
}

export async function loadInvoicesForProjects(rls: SupabaseClient, projectIds: string[]): Promise<InvoiceView[]> {
  if (projectIds.length === 0) return [];

  const invoiceRows = await query(() =>
    rls.from('sv_invoices').select(INVOICE_COLS).in('project_id', projectIds).order('issued_on', { ascending: false }),
  );
  if (invoiceRows.length === 0) return [];
  const ids = invoiceRows.map((r) => String(r.id));

  const [ledgerRows, pdfRows] = await Promise.all([
    query(() =>
      rls
        .from('sv_invoice_payment_events')
        .select('id, invoice_id, kind, amount_cents, occurred_at')
        .in('invoice_id', ids)
        .order('occurred_at', { ascending: true })
        .order('id', { ascending: true }),
    ),
    query(() => rls.from('sv_invoice_pdfs').select('invoice_id, sha256').in('invoice_id', ids)),
  ]);

  const ledger = new Map<string, LedgerRow[]>();
  for (const e of ledgerRows) {
    const key = String(e.invoice_id);
    const list = ledger.get(key) ?? [];
    list.push({
      id: Number(e.id),
      kind: e.kind as LedgerKind,
      occurredAt: String(e.occurred_at),
      amountCents: e.amount_cents === null || e.amount_cents === undefined ? null : Number(e.amount_cents),
    });
    ledger.set(key, list);
  }
  const pdfs = new Map<string, string>();
  for (const p of pdfRows) pdfs.set(String(p.invoice_id), String(p.sha256));

  const creditedBy = new Map<string, number>();
  for (const r of invoiceRows) {
    if (r.kind === 'credit_note' && r.credits_invoice_id) {
      const origin = String(r.credits_invoice_id);
      creditedBy.set(origin, (creditedBy.get(origin) ?? 0) + Number(r.total_incl_tax_cents));
    }
  }

  function toView(r: Row): InvoiceView {
    const id = String(r.id);
    const isNote = r.kind === 'credit_note';
    const total = Number(r.total_incl_tax_cents);
    const net = Number(r.net_to_pay_cents);
    const events = ledger.get(id) ?? [];
    const credited = isNote ? 0 : (creditedBy.get(id) ?? 0);
    const derived = isNote
      ? { status: 'credited' as InvoiceStatus, paidAt: null, partialCreditCents: 0, refundPending: false }
      : invoiceStatus({ totalInclTaxCents: total, creditedCents: credited, events });

    const lastRequest = lastIndexOf(events, 'refund_requested');
    const refundFailed = events.some((e, i) => e.kind === 'refund_failed' && i > lastRequest) && lastRequest >= 0;

    let lastFailedAt: string | null = null;
    if (!isNote) {
      const lastFailed = lastIndexOf(events, 'failed');
      if (lastFailed >= 0 && !events.slice(lastFailed + 1).some((e) => e.kind === 'paid' || e.kind === 'processing')) {
        lastFailedAt = events[lastFailed].occurredAt;
      }
    }

    return {
      id,
      projectId: String(r.project_id),
      kind: r.kind as InvoiceView['kind'],
      number: String(r.number),
      isTest: Boolean(r.is_test),
      issuedOn: String(r.issued_on),
      dueDate: r.due_date ?? null,
      periodStart: r.service_period_start ?? null,
      periodEnd: r.service_period_end ?? null,
      totalInclTaxCents: total,
      netToPayCents: net,
      amountDueCents: isNote ? 0 : amountDueCents(net, credited),
      creditsInvoiceId: r.credits_invoice_id ?? null,
      status: derived.status,
      paidAt: derived.paidAt,
      partialCreditCents: derived.partialCreditCents,
      refundPending: derived.refundPending,
      refundFailed,
      lastFailedAt,
      hasPdf: pdfs.has(id),
      sha256: pdfs.get(id) ?? null,
      creditNotes: [],
    };
  }

  const views = invoiceRows.map(toView);
  const invoices = views.filter((v) => v.kind !== 'credit_note');
  const byId = new Map(invoices.map((v) => [v.id, v]));
  for (const note of views.filter((v) => v.kind === 'credit_note')) {
    const origin = note.creditsInvoiceId ? byId.get(note.creditsInvoiceId) : undefined;
    if (origin) origin.creditNotes.push(note);
  }
  for (const inv of invoices) {
    inv.creditNotes.sort((a, b) => (a.issuedOn < b.issuedOn ? 1 : a.issuedOn > b.issuedOn ? -1 : 0));
  }

  const order = sortInvoicesForDisplay(
    invoices.map((v) => ({ id: v.id, kind: 'invoice' as const, issuedOn: v.issuedOn, status: v.status })),
  );
  return order.map((o) => byId.get(o.id) as InvoiceView);
}
