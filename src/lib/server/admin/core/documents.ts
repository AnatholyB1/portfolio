import 'server-only';
import { documentInputSchema, specInputSchema, type DocumentInput } from '@/lib/documents/schemas';
import type { DocumentSnapshot } from '@/lib/documents/types';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { createDocumentDownloadUrl, verifyDocumentHash } from '@/lib/server/documents/download';
import { issueDocument } from '@/lib/server/documents/issue';
import { prepareDocument } from '@/lib/server/documents/prepare';
import { loadDocumentSnapshot } from '@/lib/server/documents/read';
import { renderDocument } from '@/lib/server/documents/render';
import { getAccessibleProject } from '@/lib/server/projects/access';
import { exportSignatureChain, verifySignatureChainInDb } from '@/lib/server/signature/chain';
import { createSealedDownloadUrl } from '@/lib/server/signature/links';
import { finalizeSignature } from '@/lib/server/signature/seal';
// Type seul (effacé à la compilation) : aucun import runtime de mcp/session.
import type { AdminCtx } from '@/lib/server/mcp/session';
import type { CoreResult } from './result';
import { fieldErrorsOf, rec, uuidRe, type FieldErrors } from './shared';

const DOC_COPY = PROJECT_COPY.documents.admin;
const SIG_COPY = PROJECT_COPY.signature.admin;
const GENERIC = PROJECT_COPY.errors.generic;

export type DocFail = { ok: false; message: string; fieldErrors?: FieldErrors };

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
      return GENERIC;
  }
}

export type PreparedDocument = {
  ok: true;
  input: DocumentInput;
  snapshot: DocumentSnapshot;
  replaces: string | null;
};

/**
 * Validation + contrôles d'étape + construction de l'instantané, commune à l'aperçu et à l'émission.
 * Mode 'issue' : contrôles de l'émission (dont le refus des factures). Aucune écriture.
 */
export async function prepareDocumentCore(
  ctx: AdminCtx,
  raw: unknown,
  mode: 'preview' | 'issue',
): Promise<PreparedDocument | DocFail> {
  const parsed = parseDocumentInput(raw);
  if (!parsed.success) {
    return { ok: false, message: DOC_COPY.validationSummary, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  // D-10 : les factures restent en aperçu pendant la phase 13.
  if (mode === 'issue' && parsed.data.docType === 'invoice') return { ok: false, message: DOC_COPY.invoiceHelper };
  if (!(await getAccessibleProject(ctx.supabase, parsed.data.projectId))) {
    return { ok: false, message: GENERIC };
  }
  const prep = await prepareDocument(ctx.supabase, parsed.data, mode, new Date());
  if (!prep.ok) return { ok: false, message: checkMessage(prep.code) };
  return { ok: true, input: parsed.data, snapshot: prep.snapshot, replaces: prep.replaces };
}

export type PreviewedDocument = { ok: true; pdfBase64: string; snapshot: DocumentSnapshot; replaces: string | null };

export async function previewDocumentCore(ctx: AdminCtx, raw: unknown): Promise<PreviewedDocument | DocFail> {
  const prep = await prepareDocumentCore(ctx, raw, 'preview');
  if (!prep.ok) return prep;
  try {
    const rendered = await renderDocument(prep.snapshot);
    return { ok: true, pdfBase64: rendered.buffer.toString('base64'), snapshot: prep.snapshot, replaces: prep.replaces };
  } catch {
    console.error('[admin/documents] preview failed');
    return { ok: false, message: DOC_COPY.previewFailed };
  }
}

export type IssuedDocument = {
  ok: true;
  data: {
    outcome: 'issued' | 'already_issued';
    mail: 'sent' | 'pending' | 'failed' | 'none';
    documentId: string;
    projectId: string;
    reference: string;
    revision: number;
  };
};

export async function issueDocumentCore(ctx: AdminCtx, raw: unknown): Promise<IssuedDocument | DocFail> {
  const prep = await prepareDocumentCore(ctx, raw, 'issue');
  if (!prep.ok) return prep;

  const res = await issueDocument({
    documentId: prep.input.documentId,
    projectId: prep.input.projectId,
    snapshot: prep.snapshot,
    replaces: prep.replaces,
    actorId: ctx.user.id,
  });
  if (res.ok) {
    return {
      ok: true,
      data: {
        outcome: res.outcome,
        mail: res.mail,
        documentId: res.documentId,
        projectId: prep.input.projectId,
        reference: prep.snapshot.reference,
        revision: prep.snapshot.revision,
      },
    };
  }
  if (res.code === 'invoice_not_issuable') return { ok: false, message: DOC_COPY.invoiceHelper };
  if (res.code === 'seller_not_configured') return { ok: false, message: DOC_COPY.sellerNotConfigured };
  if (res.code === 'signed_no_replace') return { ok: false, message: DOC_COPY.signedNoReplace };
  if (res.code === 'replaces_mismatch' || res.code === 'revision_mismatch') {
    return { ok: false, message: DOC_COPY.concurrent };
  }
  return { ok: false, message: DOC_COPY.issueFailed };
}

function docIdOf(input: unknown): string | null {
  const id = rec(input).documentId;
  return typeof id === 'string' && uuidRe.test(id) ? id : null;
}

// URL signée de courte durée : jamais le contenu du fichier.
export async function downloadDocumentCore(ctx: AdminCtx, input: unknown): Promise<CoreResult<{ url: string }>> {
  const failed = { ok: false as const, message: PROJECT_COPY.documents.portal.downloadFailed };
  const id = docIdOf(input);
  if (!id) return failed;
  const res = await createDocumentDownloadUrl(ctx.supabase, id);
  return res.ok ? { ok: true, message: '', data: { url: res.url } } : failed;
}

export async function verifyDocumentHashCore(ctx: AdminCtx, input: unknown): Promise<CoreResult<{ match: boolean }>> {
  const id = docIdOf(input);
  if (!id) return { ok: false, message: GENERIC };
  const res = await verifyDocumentHash(ctx.supabase, id);
  return res.ok ? { ok: true, message: '', data: { match: res.match } } : { ok: false, message: GENERIC };
}

export async function loadSnapshotCore(
  ctx: AdminCtx,
  input: unknown,
): Promise<CoreResult<{ snapshot: DocumentSnapshot }>> {
  const id = docIdOf(input);
  if (!id) return { ok: false, message: GENERIC };
  const snapshot = await loadDocumentSnapshot(ctx.supabase, id);
  return snapshot ? { ok: true, message: '', data: { snapshot } } : { ok: false, message: GENERIC };
}

export async function exportSignatureTrailCore(
  ctx: AdminCtx,
  input: unknown,
): Promise<CoreResult<{ filename: string; json: string }>> {
  const failed = { ok: false as const, message: SIG_COPY.exportFailed };
  const id = docIdOf(input);
  if (!id) return { ok: false, message: GENERIC };
  const doc = await ctx.supabase.from('sv_project_documents').select('reference').eq('id', id).maybeSingle();
  if (doc.error || !doc.data) return failed;
  const reference = String((doc.data as { reference: unknown }).reference).replace(/[^A-Za-z0-9._-]/g, '_');
  // Export auto-vérifié avant remise (T-14-54).
  const res = await exportSignatureChain(id);
  if (!res.ok) return failed;
  return { ok: true, message: '', data: { filename: `piste-audit-${reference}.json`, json: res.json } };
}

export async function verifySignatureChainCore(
  _ctx: AdminCtx,
  input: unknown,
): Promise<CoreResult<{ intact: boolean; count: number; brokenAt: number | null; checkedAt: string }>> {
  const id = docIdOf(input);
  if (!id) return { ok: false, message: GENERIC };
  const res = await verifySignatureChainInDb(id);
  if (!res.ok) return { ok: false, message: SIG_COPY.integrityFailure };
  return {
    ok: true,
    message: '',
    data: { intact: res.chainOk, count: res.count, brokenAt: res.brokenAt, checkedAt: new Date().toISOString() },
  };
}

// L'IP vient de l'appelant (en-têtes de la requête web) ; absente pour un client MCP.
export async function sealedDownloadCore(ctx: AdminCtx, input: unknown): Promise<CoreResult<{ url: string }>> {
  const failed = { ok: false as const, message: PROJECT_COPY.documents.portal.downloadFailed };
  const id = docIdOf(input);
  if (!id) return failed;
  const ip = rec(input).ip;
  const res = await createSealedDownloadUrl(ctx.supabase, id, {
    kind: 'admin',
    id: ctx.user.id,
    ip: typeof ip === 'string' ? ip : null,
  });
  return res.ok ? { ok: true, message: '', data: { url: res.url } } : failed;
}

export async function resumeFinalizationCore(
  ctx: AdminCtx,
  input: unknown,
): Promise<CoreResult<{ projectId: string; outcome: 'sealed' | 'already_sealed' }>> {
  const id = docIdOf(input);
  if (!id) return { ok: false, message: GENERIC };
  const doc = await ctx.supabase.from('sv_project_documents').select('project_id').eq('id', id).maybeSingle();
  if (doc.error || !doc.data) return { ok: false, message: GENERIC };
  const res = await finalizeSignature(id);
  if (!res.ok) return { ok: false, message: GENERIC };
  return {
    ok: true,
    message: '',
    data: { projectId: String((doc.data as { project_id: unknown }).project_id), outcome: res.outcome },
  };
}

export type ExistingDocument = { documentId: string; reference: string; revision: number };

/** Document déjà émis sous cet identifiant (rejeu). Lecture RLS ; null si inconnu ou identifiant mal formé. */
export async function findIssuedDocumentCore(ctx: AdminCtx, input: unknown): Promise<ExistingDocument | null> {
  const id = docIdOf(input);
  if (!id) return null;
  const row = await ctx.supabase.from('sv_project_documents').select('id, reference, revision').eq('id', id).maybeSingle();
  const d = row.data as { id?: string; reference?: string; revision?: number } | null;
  if (row.error || !d) return null;
  return { documentId: String(d.id ?? id), reference: String(d.reference), revision: Number(d.revision) };
}
