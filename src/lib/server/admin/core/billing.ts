import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { creditNoteMax, parseDaysToMilli } from '@/lib/documents/invoiceMath';
import { formatEuros, toCents } from '@/lib/documents/money';
import { stripControlChars } from '@/lib/documents/schemas';
import type { InvoiceSnapshotV2, LedgerSnapshot } from '@/lib/documents/types';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { buildCreditNoteInput, buildPeriodInput, type IssueInput } from '@/lib/server/invoices/build';
import { loadInvoiceContext } from '@/lib/server/invoices/context';
import { createInvoiceDownloadUrl, verifyInvoiceHash } from '@/lib/server/invoices/download';
import { issueCreditNote, issueInvoice } from '@/lib/server/invoices/issue';
import { renderLedgerPdf } from '@/lib/server/invoices/render';
import { getAccessibleProject } from '@/lib/server/projects/access';
import { expireOpenPayments, requestRefundForCreditNote } from '@/lib/server/stripe/refund';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
// Type seul (effacé à la compilation) : aucun import runtime de mcp/session.
import type { AdminCtx } from '@/lib/server/mcp/session';
import type { CoreResult } from './result';
import { fieldErrorsOf, rec, uuidRe, type FieldErrors } from './shared';

const PAY = PROJECT_COPY.payments.admin;
const DOC_COPY = PROJECT_COPY.documents.admin;
const GENERIC = PROJECT_COPY.errors.generic;

export type BillFail = {
  ok: false;
  message: string;
  fieldErrors?: FieldErrors;
  /** Refus après émission déjà faite (rejeu idempotent) : l'appelant reçoit le numéro existant. */
  alreadyIssued?: { number: string; invoiceId: string };
  /** Le web revalide la fiche projet même pour ce refus. */
  refreshProjectId?: string;
};

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Date invalide.');

const cleanText = (min: number, max: number, message: string) =>
  z
    .string()
    .transform(stripControlChars)
    .pipe(z.string().trim().min(min, message).max(max, message));

const periodLineSchema = z.object({
  designation: cleanText(1, 200, 'Désignation obligatoire, 200 caractères maximum.'),
  days: z.string().refine((v) => parseDaysToMilli(v) !== null, 'Jours invalides : pas de 0,5, supérieurs à zéro.'),
  dailyRate: z.string().refine((v) => toCents(v) !== null, 'Montant invalide.'),
});

const periodInvoiceSchema = z
  .object({
    projectId: z.string().uuid(),
    invoiceId: z.string().uuid().optional(),
    periodStart: isoDateSchema,
    periodEnd: isoDateSchema,
    lines: z.array(periodLineSchema).min(1, 'Ajoutez au moins une ligne.').max(30, PAY.period.maxLines),
    orderNumber: cleanText(0, 100, '100 caractères maximum.').optional(),
    dueDate: z.union([isoDateSchema, z.literal('')]).optional(),
  })
  .refine((d) => d.periodEnd >= d.periodStart, {
    path: ['periodEnd'],
    message: 'La fin de période ne peut pas précéder le début.',
  });

const creditNoteSchema = z.object({
  originInvoiceId: z.string().uuid(),
  creditNoteId: z.string().uuid().optional(),
  scope: z.enum(['total', 'partial']),
  amount: z.string().max(40).optional(),
  reason: cleanText(3, 1000, 'Le motif doit contenir entre 3 et 1000 caractères.'),
  refundRequested: z.boolean(),
});

function periodFormOf(data: z.infer<typeof periodInvoiceSchema>) {
  return {
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    lines: data.lines.map((l) => ({
      designation: l.designation,
      quantityMilli: parseDaysToMilli(l.days) as number,
      unitPriceCents: toCents(l.dailyRate) as number,
    })),
    orderNumber: data.orderNumber ? data.orderNumber : null,
    dueDate: data.dueDate ? data.dueDate : null,
  };
}

function periodBuildMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : '';
  if (m === 'nothing_to_invoice') return PAY.period.nothingToInvoice;
  if (m === 'contract_missing') return PAY.period.contractGuard;
  return PAY.period.generic;
}

async function periodContext(projectId: string) {
  const ctx = await loadInvoiceContext(projectId);
  if (!ctx) return { ok: false as const, message: PAY.period.generic };
  if (!ctx.contractSigned) return { ok: false as const, message: PAY.period.contractGuard };
  return { ok: true as const, ctx };
}

export type PreparedPeriod = {
  ok: true;
  projectId: string;
  invoiceId: string;
  input: IssueInput;
  snapshot: LedgerSnapshot;
};

/**
 * Validation, accès, contexte contractuel et construction de la facture de période, communs à l'aperçu et à
 * l'émission. Aucune écriture. Mode 'issue' : invoiceId obligatoire (clé d'idempotence) ; mode 'preview' : généré.
 */
export async function preparePeriodInvoiceCore(
  ctx: AdminCtx,
  raw: unknown,
  mode: 'preview' | 'issue',
): Promise<PreparedPeriod | BillFail> {
  const parsed = periodInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: PAY.period.validationSummary, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  let invoiceId = parsed.data.invoiceId;
  if (mode === 'issue' && !invoiceId) return { ok: false, message: PAY.period.generic };
  if (!(await getAccessibleProject(ctx.supabase, parsed.data.projectId))) {
    return { ok: false, message: GENERIC };
  }
  const c = await periodContext(parsed.data.projectId);
  if (!c.ok) return { ok: false, message: c.message };

  invoiceId = invoiceId ?? randomUUID();
  try {
    const input = buildPeriodInput(c.ctx, periodFormOf(parsed.data), invoiceId);
    return {
      ok: true,
      projectId: parsed.data.projectId,
      invoiceId,
      input,
      snapshot: input.header.snapshot as LedgerSnapshot,
    };
  } catch (e) {
    if (mode === 'issue') return { ok: false, message: periodBuildMessage(e) };
    const m = e instanceof Error ? e.message : '';
    if (m === 'nothing_to_invoice' || m === 'contract_missing') return { ok: false, message: periodBuildMessage(e) };
    console.error('[admin/billing] preview failed');
    return { ok: false, message: DOC_COPY.previewFailed };
  }
}

export type PreviewedLedger = { ok: true; pdfBase64: string; snapshot: LedgerSnapshot };

export async function previewPeriodInvoiceCore(ctx: AdminCtx, raw: unknown): Promise<PreviewedLedger | BillFail> {
  const prep = await preparePeriodInvoiceCore(ctx, raw, 'preview');
  if (!prep.ok) return prep;
  try {
    const rendered = await renderLedgerPdf(prep.snapshot);
    return { ok: true, pdfBase64: rendered.buffer.toString('base64'), snapshot: prep.snapshot };
  } catch {
    console.error('[admin/billing] preview failed');
    return { ok: false, message: DOC_COPY.previewFailed };
  }
}

export type LedgerTotals = {
  exclTaxCents: number;
  vatCents: number;
  inclTaxCents: number;
  netToPayCents: number | null;
};

/** Montants HT / TVA / TTC de l'instantané qui sera (ou a été) émis. */
export function totalsOf(snapshot: LedgerSnapshot): LedgerTotals {
  return {
    exclTaxCents: snapshot.totalExclTaxCents,
    vatCents: snapshot.vatTotalCents,
    inclTaxCents: snapshot.totalInclTaxCents,
    netToPayCents: snapshot.docType === 'invoice' ? snapshot.netToPayCents : null,
  };
}

export type BillingIssued = {
  ok: true;
  tone: 'success' | 'warning';
  message: string;
  number: string;
  invoiceId: string;
  projectId: string;
  mail: 'sent' | 'pending' | 'failed' | 'none';
  pdf: 'attached' | 'pending';
  totals: LedgerTotals;
};

export async function issuePeriodInvoiceCore(ctx: AdminCtx, raw: unknown): Promise<BillingIssued | BillFail> {
  const prep = await preparePeriodInvoiceCore(ctx, raw, 'issue');
  if (!prep.ok) return prep;

  const res = await issueInvoice(prep.input);
  if (!res.ok) {
    if (res.code === 'sv_invoice_contract_not_signed') return { ok: false, message: PAY.period.contractGuard };
    if (res.code === 'sv_invoice_nothing_to_pay') return { ok: false, message: PAY.period.nothingToInvoice };
    return { ok: false, message: PAY.period.generic };
  }
  if (res.outcome === 'already_issued') {
    return {
      ok: false,
      message: PAY.period.alreadyIssued,
      alreadyIssued: { number: res.number, invoiceId: res.invoiceId },
      refreshProjectId: prep.projectId,
    };
  }
  const base = {
    number: res.number,
    invoiceId: res.invoiceId,
    projectId: prep.projectId,
    mail: res.mail,
    pdf: res.pdf,
    totals: totalsOf(prep.snapshot),
  };
  if (res.pdf === 'pending') {
    return { ok: true, tone: 'warning', message: PAY.period.partialResume(res.number), ...base };
  }
  if (res.mail === 'failed') {
    return { ok: true, tone: 'warning', message: PAY.period.mailFailed, ...base };
  }
  return { ok: true, tone: 'success', message: PAY.period.success(res.number), ...base };
}

type AdminSupabase = AdminCtx['supabase'];

type CreditOriginLoad =
  | { ok: false; message: string }
  | {
      ok: true;
      projectId: string;
      origin: Parameters<typeof buildCreditNoteInput>[0];
      refundEligible: boolean;
      paid: boolean;
    };

/** Lecture RLS de la facture d'origine (accès), puis instantané en service_role seulement après le contrôle d'accès. */
async function loadCreditOrigin(supabase: AdminSupabase, originInvoiceId: string): Promise<CreditOriginLoad> {
  const generic = { ok: false as const, message: GENERIC };
  const row = await supabase
    .from('sv_invoices')
    .select('id, project_id, kind')
    .eq('id', originInvoiceId)
    .maybeSingle();
  if (row.error || !row.data || String((row.data as { kind: unknown }).kind) === 'credit_note') return generic;
  const projectId = String((row.data as { project_id: unknown }).project_id);
  if (!(await getAccessibleProject(supabase, projectId))) return generic;

  const ctx = await loadInvoiceContext(projectId);
  const inv = ctx?.invoices.find((i) => i.id === originInvoiceId);
  if (!inv) return { ok: false, message: PAY.credit.error };
  const snap = await createSupabaseAdminClient()
    .from('sv_invoices')
    .select('snapshot')
    .eq('id', originInvoiceId)
    .maybeSingle();
  const snapshot = (snap.data as { snapshot?: InvoiceSnapshotV2 } | null)?.snapshot;
  if (snap.error || !snapshot) return { ok: false, message: PAY.credit.error };

  // payment_intent_id n'est pas accordé à `authenticated` : lecture service_role, après le contrôle d'accès ci-dessus.
  const ledger = await createSupabaseAdminClient()
    .from('sv_invoice_payment_events')
    .select('payment_intent_id')
    .eq('invoice_id', originInvoiceId)
    .eq('kind', 'paid');
  if (ledger.error) return { ok: false, message: PAY.credit.error };
  const paidRows = (ledger.data ?? []) as { payment_intent_id: string | null }[];
  return {
    ok: true,
    projectId,
    origin: {
      id: inv.id,
      number: inv.number,
      issuedOn: inv.issuedOn,
      totalInclTaxCents: inv.totalInclTaxCents,
      creditedCents: inv.creditedCents,
      snapshot,
    },
    refundEligible: paidRows.some((r) => Boolean(r.payment_intent_id)),
    paid: paidRows.length > 0,
  };
}

export type PreparedCredit = {
  ok: true;
  load: Extract<CreditOriginLoad, { ok: true }>;
  args: ReturnType<typeof buildCreditNoteInput>;
  refund: boolean;
  id: string;
};

/** Validation, contrôle d'accès, plafond d'avoir et construction de l'avoir, communs à l'aperçu et à l'émission. */
export async function prepareCreditNoteCore(ctx: AdminCtx, raw: unknown): Promise<PreparedCredit | BillFail> {
  const parsed = creditNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: PAY.credit.error, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const load = await loadCreditOrigin(ctx.supabase, parsed.data.originInvoiceId);
  if (!load.ok) return load;
  const max = creditNoteMax(load.origin.totalInclTaxCents, load.origin.creditedCents);
  if (max <= 0) return { ok: false, message: PAY.credit.overCredit };

  let amountCents = 0;
  if (parsed.data.scope === 'partial') {
    const cents = toCents(parsed.data.amount ?? '');
    if (cents === null || cents < 1 || cents > max) {
      const message = PAY.credit.amountRange(formatEuros(1), formatEuros(max));
      return { ok: false, message, fieldErrors: { amount: message } };
    }
    amountCents = cents;
  }
  const refund = parsed.data.refundRequested && load.refundEligible;
  const id = parsed.data.creditNoteId ?? randomUUID();
  try {
    const args = buildCreditNoteInput(
      load.origin,
      {
        originInvoiceId: load.origin.id,
        scope: parsed.data.scope,
        amountCents,
        reason: parsed.data.reason,
        refundRequested: refund,
        createdBy: ctx.user.id,
      },
      new Date(),
    );
    return { ok: true, load, args, refund, id };
  } catch {
    return { ok: false, message: PAY.credit.error };
  }
}

export type PreviewedCredit = PreviewedLedger & {
  credit: { refundWillBeRequested: boolean; refundEligible: boolean; openPaymentsWillBeExpired: boolean };
};

export async function previewCreditNoteCore(ctx: AdminCtx, raw: unknown): Promise<PreviewedCredit | BillFail> {
  const prep = await prepareCreditNoteCore(ctx, raw);
  if (!prep.ok) return prep;
  try {
    const rendered = await renderLedgerPdf(prep.args.snapshot);
    return {
      ok: true,
      pdfBase64: rendered.buffer.toString('base64'),
      snapshot: prep.args.snapshot,
      credit: {
        refundWillBeRequested: prep.refund,
        refundEligible: prep.load.refundEligible,
        openPaymentsWillBeExpired: !prep.load.paid,
      },
    };
  } catch {
    console.error('[admin/billing] credit preview failed');
    return { ok: false, message: PAY.credit.error };
  }
}

export type CreditIssued = {
  ok: true;
  tone: 'success' | 'warning';
  message: string;
  number: string;
  creditNoteId: string;
  projectId: string;
  originNumber: string;
  refundRequested: boolean;
  totals: LedgerTotals;
};

export async function issueCreditNoteCore(ctx: AdminCtx, raw: unknown): Promise<CreditIssued | BillFail> {
  const prep = await prepareCreditNoteCore(ctx, raw);
  if (!prep.ok) return prep;

  const res = await issueCreditNote({ ...prep.args, id: prep.id, issueKey: 'credit:' + prep.id });
  if (!res.ok) {
    if (res.code === 'sv_credit_exceeds_invoice') return { ok: false, message: PAY.credit.overCredit };
    return { ok: false, message: PAY.credit.error };
  }
  const base = PAY.credit.success(res.number, prep.load.origin.number);
  let tone: 'success' | 'warning' = 'success';
  let message = base;

  // Effets Stripe après l'émission : le remboursement n'est demandé que si la case est cochée et la facture payée via Stripe.
  if (prep.refund) {
    const refund = await requestRefundForCreditNote(res.creditNoteId);
    if (refund.ok) {
      message = `${base} ${PAY.credit.refundRequested}`;
    } else {
      tone = 'warning';
      message = `${base} ${PAY.credit.refundFailed}`;
    }
  }
  if (!prep.load.paid) await expireOpenPayments(prep.load.origin.id);
  return {
    ok: true,
    tone,
    message,
    number: res.number,
    creditNoteId: res.creditNoteId,
    projectId: prep.load.projectId,
    originNumber: prep.load.origin.number,
    refundRequested: prep.refund,
    totals: totalsOf(prep.args.snapshot),
  };
}

/** Accès à une facture : lecture RLS de la ligne, puis accès au projet. */
async function invoiceProjectId(supabase: AdminSupabase, invoiceId: string): Promise<string | null> {
  const row = await supabase.from('sv_invoices').select('id, project_id').eq('id', invoiceId).maybeSingle();
  if (row.error || !row.data) return null;
  const projectId = String((row.data as { project_id: unknown }).project_id);
  return (await getAccessibleProject(supabase, projectId)) ? projectId : null;
}

function invoiceIdOf(input: unknown): string | null {
  const id = rec(input).invoiceId;
  return typeof id === 'string' && uuidRe.test(id) ? id : null;
}

// URL signée de courte durée : jamais le contenu du PDF.
export async function downloadInvoiceCore(ctx: AdminCtx, input: unknown): Promise<CoreResult<{ url: string }>> {
  const failed = { ok: false as const, message: PROJECT_COPY.payments.portal.downloadFailed };
  const id = invoiceIdOf(input);
  if (!id) return failed;
  if (!(await invoiceProjectId(ctx.supabase, id))) return failed;
  const res = await createInvoiceDownloadUrl(ctx.supabase, id);
  return res.ok ? { ok: true, message: '', data: { url: res.url } } : failed;
}

export async function verifyInvoiceHashCore(ctx: AdminCtx, input: unknown): Promise<CoreResult<{ match: boolean }>> {
  const id = invoiceIdOf(input);
  if (!id) return { ok: false, message: GENERIC };
  if (!(await invoiceProjectId(ctx.supabase, id))) return { ok: false, message: GENERIC };
  const res = await verifyInvoiceHash(id);
  if (res === 'missing') return { ok: false, message: GENERIC };
  return { ok: true, message: '', data: { match: res === 'match' } };
}

export async function loadInvoiceDataCore(
  ctx: AdminCtx,
  input: unknown,
): Promise<CoreResult<{ snapshot: unknown; lines: Record<string, unknown>[] }>> {
  const failed = { ok: false as const, message: GENERIC };
  const id = invoiceIdOf(input);
  if (!id) return failed;
  if (!(await invoiceProjectId(ctx.supabase, id))) return failed;
  const admin = createSupabaseAdminClient();
  const [inv, lines] = await Promise.all([
    admin.from('sv_invoices').select('snapshot').eq('id', id).maybeSingle(),
    admin.from('sv_invoice_lines').select('*').eq('invoice_id', id).order('position', { ascending: true }),
  ]);
  const snapshot = (inv.data as { snapshot?: unknown } | null)?.snapshot;
  if (inv.error || !snapshot || lines.error) return failed;
  return { ok: true, message: '', data: { snapshot, lines: (lines.data ?? []) as Record<string, unknown>[] } };
}
