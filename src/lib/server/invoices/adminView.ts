// PRECONDITION : l'appelant a déjà passé requireAdmin() et fournit le client RLS de l'admin (jamais service_role).
// Les identifiants Stripe ne sont lisibles que par l'admin (politiques RLS) : ils n'atteignent que la page admin (T-15-56).
// Ne lit jamais les instantanés.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { billingSummary, creditNoteMax, finalInvoiceAmounts } from '@/lib/documents/invoiceMath';
import type { ContractSnapshot } from '@/lib/documents/types';
import { loadActiveSnapshot } from '@/lib/server/documents/read';
import type { ProjectBundle } from '@/lib/server/projects/read';
import { InvoicesLoadError, loadInvoicesForProjects, type InvoiceView } from './read';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type AdminInvoiceView = InvoiceView & {
  stripe: { paymentIntentId: string | null; livemode: boolean | null; confirmedAt: string | null };
  refundEligible: boolean;
  creditMaxCents: number;
  creditedCents: number;
};

export type PendingPaymentView = {
  invoiceNumber: string | null;
  receivedAt: string;
  expectedCents: number | null;
  receivedCents: number | null;
  status: 'transfer_waiting' | 'amount_gap' | 'unknown_invoice' | 'failed';
  stripeRef: string | null;
  livemode: boolean;
  olderThan14Days: boolean;
};

export type AdminBillingView = {
  isTest: boolean;
  summary: {
    quoteTotalCents: number | null;
    depositPercent: number | null;
    invoicedCents: number;
    collectedCents: number;
    remainingToInvoiceCents: number | null;
  };
  depositPaidViaStripeAt: string | null;
  stripeFactsExist: { deposit: boolean; balance: boolean };
  auto: {
    deposit: { state: 'waiting_contract' | 'issued' | 'failed'; number: string | null };
    final: {
      state: 'waiting_acceptance' | 'issued' | 'over_invoiced' | 'nothing_to_invoice' | 'failed';
      number: string | null;
    };
  };
  contractSigned: boolean;
  invoices: AdminInvoiceView[];
  pending: PendingPaymentView[];
};

const LEDGER_COLS =
  'id, invoice_id, client_id, kind, detail, amount_cents, expected_cents, livemode, payment_intent_id, checkout_session_id, occurred_at';
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

async function read(run: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<Row[]> {
  let res;
  try {
    res = await run();
  } catch {
    console.error('[invoices/adminView] read failed');
    throw new InvoicesLoadError();
  }
  if (res.error) {
    console.error('[invoices/adminView] read failed');
    throw new InvoicesLoadError();
  }
  return (res.data ?? []) as Row[];
}

function effective(facts: ProjectBundle['facts'], type: string): boolean {
  const revoked = new Set(facts.filter((f) => f.type === 'fact_revoked').map((f) => f.targetFactId));
  return facts.some((f) => f.type === (type as never) && !revoked.has(f.id));
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export async function loadAdminBillingView(
  rls: SupabaseClient,
  bundle: ProjectBundle,
  now: Date = new Date(),
): Promise<AdminBillingView> {
  const projectId = bundle.project.id;
  const [views, clientRows, contractHit] = await Promise.all([
    loadInvoicesForProjects(rls, [projectId]),
    read(() => rls.from('sv_clients').select('is_test').eq('id', bundle.client.id)),
    loadActiveSnapshot(rls, projectId, 'contract'),
  ]);
  const isTest = clientRows[0]?.is_test === true;
  const contract =
    contractHit && contractHit.snapshot.docType === 'contract' ? (contractHit.snapshot as ContractSnapshot) : null;

  const ids = views.flatMap((v) => [v.id, ...v.creditNotes.map((c) => c.id)]);
  const [invoiceLedger, clientLedger] = await Promise.all([
    ids.length > 0
      ? read(() =>
          rls.from('sv_invoice_payment_events').select(LEDGER_COLS).in('invoice_id', ids).order('id', { ascending: true }),
        )
      : Promise.resolve<Row[]>([]),
    read(() =>
      rls
        .from('sv_invoice_payment_events')
        .select(LEDGER_COLS)
        .eq('client_id', bundle.client.id)
        .is('invoice_id', null)
        .order('id', { ascending: true }),
    ),
  ]);

  const byInvoice = new Map<string, Row[]>();
  for (const e of invoiceLedger) {
    const k = String(e.invoice_id);
    byInvoice.set(k, [...(byInvoice.get(k) ?? []), e]);
  }

  const invoices: AdminInvoiceView[] = views.map((v) => {
    const events = byInvoice.get(v.id) ?? [];
    const paid = events.find((e) => e.kind === 'paid') ?? null;
    const credited = v.creditNotes.reduce((s, c) => s + c.totalInclTaxCents, 0);
    return {
      ...v,
      stripe: {
        paymentIntentId: paid?.payment_intent_id ?? null,
        livemode: paid ? Boolean(paid.livemode) : null,
        confirmedAt: paid ? String(paid.occurred_at) : null,
      },
      refundEligible: Boolean(paid?.payment_intent_id),
      creditMaxCents: creditNoteMax(v.totalInclTaxCents, credited),
      creditedCents: credited,
    };
  });

  const summaryBase = billingSummary(
    contract?.quote.totalCents ?? 0,
    contract?.quote.depositPercent ?? 0,
    invoices.map((i) => ({ netToPayCents: i.netToPayCents, creditedCents: i.creditedCents, status: i.status })),
  );
  const summary: AdminBillingView['summary'] = {
    quoteTotalCents: contract ? summaryBase.quoteTotalCents : null,
    depositPercent: contract ? summaryBase.depositPercent : null,
    invoicedCents: summaryBase.invoicedCents,
    collectedCents: summaryBase.collectedCents,
    remainingToInvoiceCents: contract ? summaryBase.remainingToInvoiceCents : null,
  };

  const contractSigned = effective(bundle.facts, 'contract_signed');
  const acceptanceSigned = effective(bundle.facts, 'acceptance_signed');
  const depositInv = invoices.filter((i) => i.kind === 'deposit').at(-1) ?? null;
  const finalInv = invoices.find((i) => i.kind === 'final') ?? null;

  const auto: AdminBillingView['auto'] = {
    deposit: depositInv
      ? { state: 'issued', number: depositInv.number }
      : { state: contractSigned ? 'failed' : 'waiting_contract', number: null },
    final: { state: 'failed', number: null },
  };
  if (finalInv) {
    auto.final = { state: 'issued', number: finalInv.number };
  } else if (!acceptanceSigned) {
    auto.final = { state: 'waiting_acceptance', number: null };
  } else if (contract && depositInv) {
    try {
      finalInvoiceAmounts({
        quoteReference: contract.quote.reference,
        quoteTotalCents: contract.quote.totalCents,
        quoteLines: contract.quote.lines.map((l) => ({
          designation: l.designation,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
        })),
        periodInvoices: invoices
          .filter((i) => i.kind === 'period')
          .map((i) => ({ number: i.number, billedCents: Math.max(0, i.netToPayCents - i.creditedCents) })),
        deposit: {
          invoiceId: depositInv.id,
          number: depositInv.number,
          date: depositInv.issuedOn,
          amountCents: Math.max(0, depositInv.totalInclTaxCents - depositInv.creditedCents),
        },
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      if (m === 'over_invoiced') auto.final = { state: 'over_invoiced', number: null };
      else if (m === 'nothing_to_invoice') auto.final = { state: 'nothing_to_invoice', number: null };
    }
  }

  const depositPaid = depositInv ? (byInvoice.get(depositInv.id) ?? []).find((e) => e.kind === 'paid') : undefined;
  const finalPaid = finalInv ? (byInvoice.get(finalInv.id) ?? []).find((e) => e.kind === 'paid') : undefined;

  const pending: PendingPaymentView[] = [];
  const olderThan = (at: string) => now.getTime() - new Date(at).getTime() > FOURTEEN_DAYS_MS;
  const stripeRef = (e: Row | undefined) => e?.payment_intent_id ?? e?.checkout_session_id ?? null;

  for (const inv of invoices) {
    const events = byInvoice.get(inv.id) ?? [];
    if (inv.status === 'processing') {
      const last = [...events].reverse().find((e) => e.kind === 'processing');
      const at = String(last?.occurred_at ?? inv.issuedOn);
      pending.push({
        invoiceNumber: inv.number,
        receivedAt: at,
        expectedCents: inv.amountDueCents,
        receivedCents: num(last?.amount_cents),
        status: 'transfer_waiting',
        stripeRef: stripeRef(last),
        livemode: Boolean(last?.livemode),
        olderThan14Days: olderThan(at),
      });
      continue;
    }
    if (inv.status === 'paid' || inv.status === 'credited' || inv.status === 'refunded') continue;
    for (const e of events) {
      const gap =
        e.kind === 'partially_funded' ||
        (e.kind === 'anomaly' && (e.detail === 'amount_mismatch' || e.detail === 'partially_funded'));
      if (!gap) continue;
      const at = String(e.occurred_at);
      pending.push({
        invoiceNumber: inv.number,
        receivedAt: at,
        expectedCents: num(e.expected_cents),
        receivedCents: num(e.amount_cents),
        status: 'amount_gap',
        stripeRef: stripeRef(e),
        livemode: Boolean(e.livemode),
        olderThan14Days: olderThan(at),
      });
    }
    if (inv.lastFailedAt) {
      const failed = [...events].reverse().find((e) => e.kind === 'failed');
      pending.push({
        invoiceNumber: inv.number,
        receivedAt: inv.lastFailedAt,
        expectedCents: inv.amountDueCents,
        receivedCents: null,
        status: 'failed',
        stripeRef: stripeRef(failed),
        livemode: Boolean(failed?.livemode),
        olderThan14Days: olderThan(inv.lastFailedAt),
      });
    }
  }
  for (const e of clientLedger) {
    if (e.detail !== 'unknown_invoice' && e.detail !== 'unreconciled_funds') continue;
    const at = String(e.occurred_at);
    pending.push({
      invoiceNumber: null,
      receivedAt: at,
      expectedCents: num(e.expected_cents),
      receivedCents: num(e.amount_cents),
      status: 'unknown_invoice',
      stripeRef: stripeRef(e),
      livemode: Boolean(e.livemode),
      olderThan14Days: olderThan(at),
    });
  }

  return {
    isTest,
    summary,
    depositPaidViaStripeAt: depositPaid ? String(depositPaid.occurred_at) : null,
    stripeFactsExist: { deposit: Boolean(depositPaid), balance: Boolean(finalPaid) },
    auto,
    contractSigned,
    invoices,
    pending,
  };
}
