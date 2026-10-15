'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
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
import {
  downloadInvoiceCore,
  issueCreditNoteCore,
  issuePeriodInvoiceCore,
  loadInvoiceDataCore,
  previewCreditNoteCore,
  previewPeriodInvoiceCore,
  verifyInvoiceHashCore,
} from '@/lib/server/admin/core/billing';
import {
  addProjectLinkCore,
  confirmProjectUploadCore,
  downloadProjectFileCore,
  postProjectFactCore,
  requestProjectUploadCore,
  revokeProjectFactCore,
} from '@/lib/server/admin/core/projects';
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

function billingFailure(res: { message: string; fieldErrors?: Record<string, string> }) {
  return { ok: false as const, message: res.message, ...(res.fieldErrors ? { fieldErrors: res.fieldErrors } : {}) };
}

export async function previewPeriodInvoiceAction(raw: unknown): Promise<BillingPreviewResult> {
  const ctx = await requireAdmin();
  const res = await previewPeriodInvoiceCore(ctx, raw);
  return res.ok ? { ok: true, pdfBase64: res.pdfBase64 } : billingFailure(res);
}

export async function issuePeriodInvoiceAction(raw: unknown): Promise<BillingIssueResult> {
  const ctx = await requireAdmin();
  const res = await issuePeriodInvoiceCore(ctx, raw);
  if (!res.ok) {
    if (res.refreshProjectId) refresh(res.refreshProjectId);
    return billingFailure(res);
  }
  refresh(res.projectId);
  return { ok: true, tone: res.tone, message: res.message, number: res.number };
}

export async function previewCreditNoteAction(raw: unknown): Promise<BillingPreviewResult> {
  const ctx = await requireAdmin();
  const res = await previewCreditNoteCore(ctx, raw);
  return res.ok ? { ok: true, pdfBase64: res.pdfBase64 } : billingFailure(res);
}

export async function issueCreditNoteAction(raw: unknown): Promise<BillingIssueResult> {
  const ctx = await requireAdmin();
  const res = await issueCreditNoteCore(ctx, raw);
  if (!res.ok) return billingFailure(res);
  refresh(res.projectId);
  return { ok: true, tone: res.tone, message: res.message, number: res.number };
}

export async function adminInvoiceDownloadAction(invoiceId: string): Promise<DownloadResult> {
  const ctx = await requireAdmin();
  const res = await downloadInvoiceCore(ctx, { invoiceId });
  return res.ok && res.data ? { ok: true, url: res.data.url } : { ok: false, message: res.message };
}

export async function verifyInvoiceHashAction(invoiceId: string): Promise<VerifyResult> {
  const ctx = await requireAdmin();
  const res = await verifyInvoiceHashCore(ctx, { invoiceId });
  return res.ok && res.data ? { ok: true, match: res.data.match } : { ok: false, message: res.message };
}

export async function loadInvoiceDataAction(invoiceId: string): Promise<InvoiceDataResult> {
  const ctx = await requireAdmin();
  const res = await loadInvoiceDataCore(ctx, { invoiceId });
  return res.ok && res.data ? { ok: true, snapshot: res.data.snapshot, lines: res.data.lines } : { ok: false, message: res.message };
}
