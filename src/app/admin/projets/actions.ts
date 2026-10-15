'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { requestIp } from '@/lib/server/signature/clientIp';
import { requireAdmin } from '@/lib/server/auth/dal';
import {
  downloadDocumentCore,
  exportSignatureTrailCore,
  issueDocumentCore,
  loadSnapshotCore,
  previewDocumentCore,
  resumeFinalizationCore,
  sealedDownloadCore,
  verifyDocumentHashCore,
  verifySignatureChainCore,
} from '@/lib/server/admin/core/documents';
import { fieldErrorsOf, uuidRe } from '@/lib/server/admin/core/shared';
import {
  addProjectLinkCore,
  confirmProjectUploadCore,
  downloadProjectFileCore,
  postProjectFactCore,
  requestProjectUploadCore,
  revokeProjectFactCore,
} from '@/lib/server/admin/core/projects';
import { creditNoteMax, parseDaysToMilli } from '@/lib/documents/invoiceMath';
import { formatEuros, toCents } from '@/lib/documents/money';
import { stripControlChars } from '@/lib/documents/schemas';
import type { InvoiceSnapshotV2, LedgerSnapshot } from '@/lib/documents/types';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { buildCreditNoteInput, buildPeriodInput } from '@/lib/server/invoices/build';
import { loadInvoiceContext } from '@/lib/server/invoices/context';
import { createInvoiceDownloadUrl, verifyInvoiceHash } from '@/lib/server/invoices/download';
import { issueCreditNote, issueInvoice } from '@/lib/server/invoices/issue';
import { renderLedgerPdf } from '@/lib/server/invoices/render';
import { getAccessibleProject } from '@/lib/server/projects/access';
import { expireOpenPayments, requestRefundForCreditNote } from '@/lib/server/stripe/refund';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type {
  ChainCheckResult,
  ExportTrailResult,
  ResumeResult,
  IssueResult,
  PreviewResult,
  SnapshotResult,
  VerifyResult,
} from '@/components/admin/projects/documents/types';
import type {
  BillingIssueResult,
  BillingPreviewResult,
  InvoiceDataResult,
} from '@/components/admin/projects/billing/types';
import type {
  DownloadResult,
  SimpleResult,
  UploadRequestResult,
} from '@/components/portal/project/types';

export type ProjectActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  mailLine?: string;
};

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

function err(message: string): ProjectActionState {
  return { status: 'error', message };
}

function refresh(projectId: string) {
  revalidatePath('/admin/projets');
  revalidatePath(`/admin/projets/${projectId}`);
  revalidatePath('/espace-client');
  revalidatePath('/espace-client/documents');
  revalidatePath('/espace-client/paiements');
}

function factState(res: Awaited<ReturnType<typeof postProjectFactCore>>, projectId: string): ProjectActionState {
  if (!res.ok) return err(res.message);
  refresh(projectId);
  return { status: 'success', message: res.message, mailLine: res.data?.mailLine };
}

// Chaque action revérifie l'admin AVANT toute validation ou appel service_role (D-22).
export async function postFactAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const ctx = await requireAdmin();
  const projectId = str(formData, 'projectId');
  const res = await postProjectFactCore(ctx, {
    projectId,
    type: str(formData, 'type'),
    note: str(formData, 'note'),
  });
  return factState(res, projectId);
}

export async function revokeFactAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const ctx = await requireAdmin();
  const projectId = str(formData, 'projectId');
  const res = await revokeProjectFactCore(ctx, {
    projectId,
    factId: str(formData, 'factId'),
    reason: str(formData, 'reason'),
  });
  return factState(res, projectId);
}

export async function addLinkAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const ctx = await requireAdmin();
  const projectId = str(formData, 'projectId');
  const res = await addProjectLinkCore(ctx, {
    projectId,
    title: str(formData, 'title'),
    url: str(formData, 'url'),
  });
  if (!res.ok) return err(res.message);
  refresh(projectId);
  return { status: 'success', message: res.message };
}

export async function adminRequestUploadAction(input: {
  projectId: string;
  filename: string;
  size: number;
  mime: string;
}): Promise<UploadRequestResult> {
  const ctx = await requireAdmin();
  const res = await requestProjectUploadCore(ctx, input);
  if (res.ok && res.data) return { ok: true, fileId: res.data.fileId, signedUrl: res.data.signedUrl };
  return { ok: false, message: res.message };
}

export async function adminConfirmUploadAction(fileId: string): Promise<SimpleResult> {
  const ctx = await requireAdmin();
  const res = await confirmProjectUploadCore(ctx, { fileId });
  if (!res.ok) return { ok: false, message: res.message };
  revalidatePath('/admin/projets');
  revalidatePath('/espace-client');
  return { ok: true };
}

export async function adminDownloadAction(fileId: string): Promise<DownloadResult> {
  const ctx = await requireAdmin();
  const res = await downloadProjectFileCore(ctx, { fileId });
  if (!res.ok || !res.data) return { ok: false, message: res.message };
  return { ok: true, url: res.data.url };
}

// ---- Phase 13 : documents (D-17). Ordre : requireAdmin, zod, getAccessibleProject, module serveur. ----

const DOC_COPY = PROJECT_COPY.documents.admin;

export async function previewDocumentAction(raw: unknown): Promise<PreviewResult> {
  const ctx = await requireAdmin();
  const res = await previewDocumentCore(ctx, raw);
  return res.ok ? { ok: true, pdfBase64: res.pdfBase64 } : res;
}

export async function issueDocumentAction(raw: unknown): Promise<IssueResult> {
  const ctx = await requireAdmin();
  const res = await issueDocumentCore(ctx, raw);
  if (!res.ok) return res;
  refresh(res.data.projectId);
  return { ok: true, outcome: res.data.outcome, mail: res.data.mail };
}

export async function adminDocumentDownloadAction(documentId: string): Promise<DownloadResult> {
  const ctx = await requireAdmin();
  const res = await downloadDocumentCore(ctx, { documentId });
  return res.ok && res.data ? { ok: true, url: res.data.url } : { ok: false, message: res.message };
}

export async function verifyDocumentHashAction(documentId: string): Promise<VerifyResult> {
  const ctx = await requireAdmin();
  const res = await verifyDocumentHashCore(ctx, { documentId });
  return res.ok && res.data ? { ok: true, match: res.data.match } : { ok: false, message: res.message };
}

export async function exportSignatureTrailAction(documentId: string): Promise<ExportTrailResult> {
  const ctx = await requireAdmin();
  const res = await exportSignatureTrailCore(ctx, { documentId });
  return res.ok && res.data ? { ok: true, filename: res.data.filename, json: res.data.json } : { ok: false, message: res.message };
}

export async function verifySignatureChainAction(documentId: string): Promise<ChainCheckResult> {
  const ctx = await requireAdmin();
  const res = await verifySignatureChainCore(ctx, { documentId });
  return res.ok && res.data ? { ok: true, ...res.data } : { ok: false, message: res.message };
}

export async function adminSealedDownloadAction(documentId: string): Promise<DownloadResult> {
  const ctx = await requireAdmin();
  const ip = requestIp(await headers());
  const res = await sealedDownloadCore(ctx, { documentId, ip });
  return res.ok && res.data ? { ok: true, url: res.data.url } : { ok: false, message: res.message };
}

export async function adminResumeFinalizationAction(documentId: string): Promise<ResumeResult> {
  const ctx = await requireAdmin();
  const res = await resumeFinalizationCore(ctx, { documentId });
  if (!res.ok || !res.data) return { ok: false, message: res.message };
  refresh(res.data.projectId);
  return { ok: true };
}

export async function loadSnapshotAction(documentId: string): Promise<SnapshotResult> {
  const ctx = await requireAdmin();
  const res = await loadSnapshotCore(ctx, { documentId });
  return res.ok && res.data ? { ok: true, snapshot: res.data.snapshot } : { ok: false, message: res.message };
}

// ---- Phase 15 : facturation (D-08, D-14, D-18). Ordre : requireAdmin, zod, getAccessibleProject, module serveur. ----

const PAY = PROJECT_COPY.payments.admin;
type AdminSupabase = Awaited<ReturnType<typeof requireAdmin>>['supabase'];

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

export async function previewPeriodInvoiceAction(raw: unknown): Promise<BillingPreviewResult> {
  const { supabase } = await requireAdmin();
  const parsed = periodInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: PAY.period.validationSummary, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  if (!(await getAccessibleProject(supabase, parsed.data.projectId))) {
    return { ok: false, message: PROJECT_COPY.errors.generic };
  }
  const c = await periodContext(parsed.data.projectId);
  if (!c.ok) return { ok: false, message: c.message };
  try {
    const input = buildPeriodInput(c.ctx, periodFormOf(parsed.data), parsed.data.invoiceId ?? randomUUID());
    const rendered = await renderLedgerPdf(input.header.snapshot as LedgerSnapshot);
    return { ok: true, pdfBase64: rendered.buffer.toString('base64') };
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m === 'nothing_to_invoice' || m === 'contract_missing') return { ok: false, message: periodBuildMessage(e) };
    console.error('[admin/billing] preview failed');
    return { ok: false, message: DOC_COPY.previewFailed };
  }
}

export async function issuePeriodInvoiceAction(raw: unknown): Promise<BillingIssueResult> {
  const { supabase } = await requireAdmin();
  const parsed = periodInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: PAY.period.validationSummary, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const invoiceId = parsed.data.invoiceId;
  if (!invoiceId) return { ok: false, message: PAY.period.generic };
  if (!(await getAccessibleProject(supabase, parsed.data.projectId))) {
    return { ok: false, message: PROJECT_COPY.errors.generic };
  }
  const c = await periodContext(parsed.data.projectId);
  if (!c.ok) return { ok: false, message: c.message };

  let input;
  try {
    input = buildPeriodInput(c.ctx, periodFormOf(parsed.data), invoiceId);
  } catch (e) {
    return { ok: false, message: periodBuildMessage(e) };
  }
  const res = await issueInvoice(input);
  if (!res.ok) {
    if (res.code === 'sv_invoice_contract_not_signed') return { ok: false, message: PAY.period.contractGuard };
    if (res.code === 'sv_invoice_nothing_to_pay') return { ok: false, message: PAY.period.nothingToInvoice };
    return { ok: false, message: PAY.period.generic };
  }
  refresh(parsed.data.projectId);
  if (res.outcome === 'already_issued') return { ok: false, message: PAY.period.alreadyIssued };
  if (res.pdf === 'pending') {
    return { ok: true, tone: 'warning', message: PAY.period.partialResume(res.number), number: res.number };
  }
  if (res.mail === 'failed') {
    return { ok: true, tone: 'warning', message: PAY.period.mailFailed, number: res.number };
  }
  return { ok: true, tone: 'success', message: PAY.period.success(res.number), number: res.number };
}

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
  const generic = { ok: false as const, message: PROJECT_COPY.errors.generic };
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

type CreditPrepared =
  | { ok: false; message: string; fieldErrors?: Record<string, string> }
  | {
      ok: true;
      load: Extract<CreditOriginLoad, { ok: true }>;
      args: ReturnType<typeof buildCreditNoteInput>;
      refund: boolean;
      id: string;
    };

async function prepareCreditNote(supabase: AdminSupabase, userId: string, raw: unknown): Promise<CreditPrepared> {
  const parsed = creditNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: PAY.credit.error, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const load = await loadCreditOrigin(supabase, parsed.data.originInvoiceId);
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
        createdBy: userId,
      },
      new Date(),
    );
    return { ok: true, load, args, refund, id };
  } catch {
    return { ok: false, message: PAY.credit.error };
  }
}

export async function previewCreditNoteAction(raw: unknown): Promise<BillingPreviewResult> {
  const { supabase, user } = await requireAdmin();
  const prep = await prepareCreditNote(supabase, user.id, raw);
  if (!prep.ok) return prep;
  try {
    const rendered = await renderLedgerPdf(prep.args.snapshot);
    return { ok: true, pdfBase64: rendered.buffer.toString('base64') };
  } catch {
    console.error('[admin/billing] credit preview failed');
    return { ok: false, message: PAY.credit.error };
  }
}

export async function issueCreditNoteAction(raw: unknown): Promise<BillingIssueResult> {
  const { supabase, user } = await requireAdmin();
  const prep = await prepareCreditNote(supabase, user.id, raw);
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
  refresh(prep.load.projectId);
  return { ok: true, tone, message, number: res.number };
}

/** Accès à une facture : lecture RLS de la ligne, puis accès au projet. */
async function invoiceProjectId(supabase: AdminSupabase, invoiceId: string): Promise<string | null> {
  const row = await supabase.from('sv_invoices').select('id, project_id').eq('id', invoiceId).maybeSingle();
  if (row.error || !row.data) return null;
  const projectId = String((row.data as { project_id: unknown }).project_id);
  return (await getAccessibleProject(supabase, projectId)) ? projectId : null;
}

export async function adminInvoiceDownloadAction(invoiceId: string): Promise<DownloadResult> {
  const { supabase } = await requireAdmin();
  const failed = { ok: false as const, message: PROJECT_COPY.payments.portal.downloadFailed };
  if (typeof invoiceId !== 'string' || !uuidRe.test(invoiceId)) return failed;
  if (!(await invoiceProjectId(supabase, invoiceId))) return failed;
  const res = await createInvoiceDownloadUrl(supabase, invoiceId);
  return res.ok ? { ok: true, url: res.url } : failed;
}

export async function verifyInvoiceHashAction(invoiceId: string): Promise<VerifyResult> {
  const { supabase } = await requireAdmin();
  if (typeof invoiceId !== 'string' || !uuidRe.test(invoiceId)) {
    return { ok: false, message: PROJECT_COPY.errors.generic };
  }
  if (!(await invoiceProjectId(supabase, invoiceId))) return { ok: false, message: PROJECT_COPY.errors.generic };
  const res = await verifyInvoiceHash(invoiceId);
  if (res === 'missing') return { ok: false, message: PROJECT_COPY.errors.generic };
  return { ok: true, match: res === 'match' };
}

export async function loadInvoiceDataAction(invoiceId: string): Promise<InvoiceDataResult> {
  const { supabase } = await requireAdmin();
  const failed = { ok: false as const, message: PROJECT_COPY.errors.generic };
  if (typeof invoiceId !== 'string' || !uuidRe.test(invoiceId)) return failed;
  if (!(await invoiceProjectId(supabase, invoiceId))) return failed;
  const admin = createSupabaseAdminClient();
  const [inv, lines] = await Promise.all([
    admin.from('sv_invoices').select('snapshot').eq('id', invoiceId).maybeSingle(),
    admin.from('sv_invoice_lines').select('*').eq('invoice_id', invoiceId).order('position', { ascending: true }),
  ]);
  const snapshot = (inv.data as { snapshot?: unknown } | null)?.snapshot;
  if (inv.error || !snapshot || lines.error) return failed;
  return { ok: true, snapshot, lines: (lines.data ?? []) as Record<string, unknown>[] };
}
