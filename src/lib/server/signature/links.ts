// PRECONDITION : l'appelant a exécuté requireClient() ou requireAdmin().
// L'autorisation est la lecture RLS de la ligne ; le chemin n'est résolu qu'ici en service_role (D-09).
import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SIGNED_DOWNLOAD_SECONDS } from '@/lib/projects/fileRules';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SV_DOCUMENTS_BUCKET } from '@/lib/server/documents/download';
import { logDocumentOpened, logSealDownloaded, type ChainActor } from './chain';

export const PREVIEW_LINK_SECONDS = 300;

export type PreviewUrlResult = { ok: true; url: string } | { ok: false; code: 'not_found' | 'error' };

export async function createPreviewUrl(
  rls: SupabaseClient,
  documentId: string,
  actor: ChainActor,
): Promise<PreviewUrlResult> {
  try {
    const row = await rls.from('sv_project_documents').select('id').eq('id', documentId).maybeSingle();
    if (row.error || !row.data) return { ok: false, code: 'not_found' };
    const admin = createSupabaseAdminClient();
    const res = await admin.from('sv_project_documents').select('storage_path').eq('id', documentId).maybeSingle();
    if (res.error || !res.data) return { ok: false, code: 'error' };
    const path = String((res.data as { storage_path: unknown }).storage_path);
    await logDocumentOpened(documentId, actor);
    const signed = await admin.storage.from(SV_DOCUMENTS_BUCKET).createSignedUrl(path, PREVIEW_LINK_SECONDS);
    if (signed.error || !signed.data) {
      console.error('[signature/links] preview url failed');
      return { ok: false, code: 'error' };
    }
    return { ok: true, url: signed.data.signedUrl };
  } catch {
    console.error('[signature/links] preview failed');
    return { ok: false, code: 'error' };
  }
}

export type SealedDownloadResult =
  | { ok: true; url: string }
  | { ok: false; code: 'not_found' | 'hash_mismatch' | 'error' };

export async function createSealedDownloadUrl(
  rls: SupabaseClient,
  documentId: string,
  actor: ChainActor,
): Promise<SealedDownloadResult> {
  try {
    const seal = await rls.from('sv_document_seals').select('id, sha256').eq('document_id', documentId).maybeSingle();
    if (seal.error || !seal.data) return { ok: false, code: 'not_found' };
    const doc = await rls.from('sv_project_documents').select('id, filename').eq('id', documentId).maybeSingle();
    if (doc.error || !doc.data) return { ok: false, code: 'not_found' };

    const admin = createSupabaseAdminClient();
    const pathRow = await admin.from('sv_document_seals').select('storage_path').eq('document_id', documentId).maybeSingle();
    if (pathRow.error || !pathRow.data) return { ok: false, code: 'error' };
    const path = String((pathRow.data as { storage_path: unknown }).storage_path);

    const file = await admin.storage.from(SV_DOCUMENTS_BUCKET).download(path);
    if (file.error || !file.data) {
      console.error('[signature/links] seal download failed');
      return { ok: false, code: 'error' };
    }
    const hex = createHash('sha256')
      .update(Buffer.from(await file.data.arrayBuffer()))
      .digest('hex');
    if (hex !== String(seal.data.sha256)) {
      console.error('[signature/links] seal hash mismatch');
      return { ok: false, code: 'hash_mismatch' };
    }

    await logSealDownloaded(documentId, actor);
    const base = String(doc.data.filename).replace(/\.pdf$/i, '');
    const signed = await admin
      .storage.from(SV_DOCUMENTS_BUCKET)
      .createSignedUrl(path, SIGNED_DOWNLOAD_SECONDS, { download: `${base}-signe.pdf` });
    if (signed.error || !signed.data) {
      console.error('[signature/links] seal url failed');
      return { ok: false, code: 'error' };
    }
    return { ok: true, url: signed.data.signedUrl };
  } catch {
    console.error('[signature/links] seal link failed');
    return { ok: false, code: 'error' };
  }
}
