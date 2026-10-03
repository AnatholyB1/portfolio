'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth/dal';
import { documentInputSchema, specInputSchema, type DocumentInput } from '@/lib/documents/schemas';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { linkSchema, postFactSchema, revokeFactSchema, uploadRequestSchema } from '@/lib/projects/schemas';
import { DONE_COPY, STEPS } from '@/lib/projects/steps';
import { createDocumentDownloadUrl, verifyDocumentHash } from '@/lib/server/documents/download';
import { issueDocument } from '@/lib/server/documents/issue';
import { prepareDocument } from '@/lib/server/documents/prepare';
import { loadDocumentSnapshot } from '@/lib/server/documents/read';
import { renderDocument } from '@/lib/server/documents/render';
import { getAccessibleProject } from '@/lib/server/projects/access';
import { addProjectLink } from '@/lib/server/projects/content';
import {
  postProjectFact,
  revokeProjectFact,
  type FactPostResult,
} from '@/lib/server/projects/facts';
import { confirmUpload, createDownloadUrl, requestUpload } from '@/lib/server/projects/files';
import type {
  IssueResult,
  PreviewResult,
  SnapshotResult,
  VerifyResult,
} from '@/components/admin/projects/documents/types';
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
}

function mailLine(mail: 'sent' | 'pending' | 'failed' | 'none'): string | undefined {
  switch (mail) {
    case 'sent':
      return PROJECT_COPY.facts.mailSent;
    case 'pending':
      return PROJECT_COPY.facts.mailPending;
    case 'failed':
      return PROJECT_COPY.facts.mailFailed;
    default:
      return undefined;
  }
}

function factOutcome(res: FactPostResult, projectId: string): ProjectActionState {
  if (!res.ok) return err(PROJECT_COPY.errors.generic);
  if (!res.changed) return err(PROJECT_COPY.facts.alreadyRecorded);
  refresh(projectId);
  const stepName =
    res.done || res.stepAfter === null ? DONE_COPY.name : (STEPS[res.stepAfter - 1]?.name ?? DONE_COPY.name);
  return {
    status: 'success',
    message: PROJECT_COPY.facts.recorded(stepName),
    mailLine: mailLine(res.mail),
  };
}

// Chaque action revérifie l'admin AVANT toute validation ou appel service_role (D-22).
export async function postFactAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const { user, supabase } = await requireAdmin();
  const note = str(formData, 'note').trim();
  const parsed = postFactSchema.safeParse({
    projectId: str(formData, 'projectId'),
    type: str(formData, 'type'),
    note: note || undefined,
  });
  if (!parsed.success) return err(PROJECT_COPY.errors.generic);
  if (!(await getAccessibleProject(supabase, parsed.data.projectId))) {
    return err(PROJECT_COPY.errors.generic);
  }
  const res = await postProjectFact({
    projectId: parsed.data.projectId,
    type: parsed.data.type,
    actorKind: 'admin',
    actorId: user.id,
    reason: parsed.data.note ?? null,
  });
  return factOutcome(res, parsed.data.projectId);
}

export async function revokeFactAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const { user, supabase } = await requireAdmin();
  const parsed = revokeFactSchema.safeParse({
    projectId: str(formData, 'projectId'),
    factId: str(formData, 'factId'),
    reason: str(formData, 'reason'),
  });
  if (!parsed.success) return err(PROJECT_COPY.errors.generic);
  if (!(await getAccessibleProject(supabase, parsed.data.projectId))) {
    return err(PROJECT_COPY.errors.generic);
  }
  const res = await revokeProjectFact({
    projectId: parsed.data.projectId,
    factId: parsed.data.factId,
    actorId: user.id,
    reason: parsed.data.reason,
  });
  return factOutcome(res, parsed.data.projectId);
}

export async function addLinkAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const { user, supabase } = await requireAdmin();
  const parsed = linkSchema.safeParse({
    projectId: str(formData, 'projectId'),
    title: str(formData, 'title'),
    url: str(formData, 'url').trim(),
  });
  if (!parsed.success) {
    const urlBad = parsed.error.issues.some((i) => i.path[0] === 'url');
    return err(urlBad ? PROJECT_COPY.errors.url : PROJECT_COPY.errors.generic);
  }
  const res = await addProjectLink(supabase, { ...parsed.data, actorId: user.id });
  if (!res.ok) return err(PROJECT_COPY.errors.generic);
  refresh(parsed.data.projectId);
  return { status: 'success', message: PROJECT_COPY.links.add };
}

export async function adminRequestUploadAction(input: {
  projectId: string;
  filename: string;
  size: number;
  mime: string;
}): Promise<UploadRequestResult> {
  const { user, supabase } = await requireAdmin();
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: PROJECT_COPY.errors.generic };
  const res = await requestUpload(supabase, {
    ...parsed.data,
    uploaderKind: 'admin',
    uploaderId: user.id,
  });
  if (res.ok) return { ok: true, fileId: res.fileId, signedUrl: res.signedUrl };
  if (res.code === 'too_large') return { ok: false, message: PROJECT_COPY.errors.fileTooLarge };
  if (res.code === 'bad_type') return { ok: false, message: PROJECT_COPY.errors.fileType };
  return { ok: false, message: PROJECT_COPY.errors.generic };
}

export async function adminConfirmUploadAction(fileId: string): Promise<SimpleResult> {
  const { supabase } = await requireAdmin();
  if (typeof fileId !== 'string' || fileId.length === 0) {
    return { ok: false, message: PROJECT_COPY.errors.generic };
  }
  const res = await confirmUpload(supabase, fileId);
  if (!res.ok) return { ok: false, message: PROJECT_COPY.errors.generic };
  revalidatePath('/admin/projets');
  revalidatePath('/espace-client');
  return { ok: true };
}

export async function adminDownloadAction(fileId: string): Promise<DownloadResult> {
  const { supabase } = await requireAdmin();
  if (typeof fileId !== 'string' || fileId.length === 0) {
    return { ok: false, message: PROJECT_COPY.errors.downloadFailed };
  }
  const res = await createDownloadUrl(supabase, fileId);
  if (!res.ok) return { ok: false, message: PROJECT_COPY.errors.downloadFailed };
  return { ok: true, url: res.url };
}

// ---- Phase 13 : documents (D-17). Ordre : requireAdmin, zod, getAccessibleProject, module serveur. ----

const DOC_COPY = PROJECT_COPY.documents.admin;
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fieldErrorsOf(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.');
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}

type ParsedInput =
  | { success: true; data: DocumentInput }
  | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };

// L'union documentInputSchema ne porte pas la transformation de la spec (acceptanceCriteriaList, valeurs par défaut) :
// on la rejoue via specInputSchema pour que le constructeur d'instantané reçoive la forme transformée.
function parseDocumentInput(raw: unknown): ParsedInput {
  const parsed = documentInputSchema.safeParse(raw);
  if (!parsed.success) return parsed;
  if (parsed.data.docType === 'spec') return specInputSchema.safeParse(raw);
  return { success: true, data: parsed.data };
}

function checkMessage(code: string): string {
  switch (code) {
    case 'wrong_step':
      return DOC_COPY.wrongStep;
    case 'missing_quote':
      return DOC_COPY.needQuote;
    case 'missing_spec':
      return DOC_COPY.needSpec;
    case 'signed_no_replace':
      return DOC_COPY.signedNoReplace;
    case 'preview_only':
      return DOC_COPY.invoiceHelper;
    default:
      return PROJECT_COPY.errors.generic;
  }
}

export async function previewDocumentAction(raw: unknown): Promise<PreviewResult> {
  const { supabase } = await requireAdmin();
  const parsed = parseDocumentInput(raw);
  if (!parsed.success) {
    return { ok: false, message: DOC_COPY.validationSummary, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  if (!(await getAccessibleProject(supabase, parsed.data.projectId))) {
    return { ok: false, message: PROJECT_COPY.errors.generic };
  }
  const prep = await prepareDocument(supabase, parsed.data, 'preview', new Date());
  if (!prep.ok) return { ok: false, message: checkMessage(prep.code) };
  try {
    const rendered = await renderDocument(prep.snapshot);
    return { ok: true, pdfBase64: rendered.buffer.toString('base64') };
  } catch {
    console.error('[admin/documents] preview failed');
    return { ok: false, message: DOC_COPY.previewFailed };
  }
}

export async function issueDocumentAction(raw: unknown): Promise<IssueResult> {
  const { user, supabase } = await requireAdmin();
  const parsed = parseDocumentInput(raw);
  if (!parsed.success) {
    return { ok: false, message: DOC_COPY.validationSummary, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  // D-10 : les factures restent en aperçu pendant la phase 13.
  if (parsed.data.docType === 'invoice') return { ok: false, message: DOC_COPY.invoiceHelper };
  if (!(await getAccessibleProject(supabase, parsed.data.projectId))) {
    return { ok: false, message: PROJECT_COPY.errors.generic };
  }
  const prep = await prepareDocument(supabase, parsed.data, 'issue', new Date());
  if (!prep.ok) return { ok: false, message: checkMessage(prep.code) };

  const res = await issueDocument({
    documentId: parsed.data.documentId,
    projectId: parsed.data.projectId,
    snapshot: prep.snapshot,
    replaces: prep.replaces,
    actorId: user.id,
  });
  if (res.ok) {
    refresh(parsed.data.projectId);
    return { ok: true, outcome: res.outcome, mail: res.mail };
  }
  if (res.code === 'invoice_not_issuable') return { ok: false, message: DOC_COPY.invoiceHelper };
  if (res.code === 'seller_not_configured') return { ok: false, message: DOC_COPY.sellerNotConfigured };
  if (res.code === 'replaces_mismatch' || res.code === 'revision_mismatch') {
    return { ok: false, message: DOC_COPY.concurrent };
  }
  return { ok: false, message: DOC_COPY.issueFailed };
}

export async function adminDocumentDownloadAction(documentId: string): Promise<DownloadResult> {
  const { supabase } = await requireAdmin();
  const failed = { ok: false as const, message: PROJECT_COPY.documents.portal.downloadFailed };
  if (typeof documentId !== 'string' || !uuidRe.test(documentId)) return failed;
  const res = await createDocumentDownloadUrl(supabase, documentId);
  return res.ok ? { ok: true, url: res.url } : failed;
}

export async function verifyDocumentHashAction(documentId: string): Promise<VerifyResult> {
  const { supabase } = await requireAdmin();
  if (typeof documentId !== 'string' || !uuidRe.test(documentId)) {
    return { ok: false, message: PROJECT_COPY.errors.generic };
  }
  const res = await verifyDocumentHash(supabase, documentId);
  return res.ok ? { ok: true, match: res.match } : { ok: false, message: PROJECT_COPY.errors.generic };
}

export async function loadSnapshotAction(documentId: string): Promise<SnapshotResult> {
  const { supabase } = await requireAdmin();
  if (typeof documentId !== 'string' || !uuidRe.test(documentId)) {
    return { ok: false, message: PROJECT_COPY.errors.generic };
  }
  const snapshot = await loadDocumentSnapshot(supabase, documentId);
  return snapshot ? { ok: true, snapshot } : { ok: false, message: PROJECT_COPY.errors.generic };
}
