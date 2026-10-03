// Téléchargement de documents émis. PRECONDITION : l'appelant a exécuté requireAdmin() ou requireClient().
// L'autorisation est la lecture RLS de la ligne ; le chemin n'est résolu qu'ici en service_role (D-15).
import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SIGNED_DOWNLOAD_SECONDS } from '@/lib/projects/fileRules';

export const SV_DOCUMENTS_BUCKET = 'sv-documents';

async function resolvePath(documentId: string): Promise<string | null> {
  const res = await createSupabaseAdminClient()
    .from('sv_project_documents')
    .select('storage_path')
    .eq('id', documentId)
    .maybeSingle();
  if (res.error || !res.data) return null;
  return String((res.data as { storage_path: unknown }).storage_path);
}

export async function createDocumentDownloadUrl(
  rls: SupabaseClient,
  documentId: string,
): Promise<{ ok: true; url: string } | { ok: false; code: 'not_found' | 'error' }> {
  try {
    const row = await rls.from('sv_project_documents').select('id, filename').eq('id', documentId).maybeSingle();
    if (row.error || !row.data) return { ok: false, code: 'not_found' };
    const path = await resolvePath(documentId);
    if (!path) return { ok: false, code: 'error' };
    const signed = await createSupabaseAdminClient()
      .storage.from(SV_DOCUMENTS_BUCKET)
      .createSignedUrl(path, SIGNED_DOWNLOAD_SECONDS, { download: String(row.data.filename) });
    if (signed.error || !signed.data) {
      console.error('[documents/download] signed url failed');
      return { ok: false, code: 'error' };
    }
    return { ok: true, url: signed.data.signedUrl };
  } catch {
    console.error('[documents/download] download failed');
    return { ok: false, code: 'error' };
  }
}

export async function verifyDocumentHash(
  rls: SupabaseClient,
  documentId: string,
): Promise<{ ok: true; match: boolean } | { ok: false; code: 'not_found' | 'error' }> {
  try {
    const row = await rls.from('sv_project_documents').select('id, sha256').eq('id', documentId).maybeSingle();
    if (row.error || !row.data) return { ok: false, code: 'not_found' };
    const path = await resolvePath(documentId);
    if (!path) return { ok: false, code: 'error' };
    const file = await createSupabaseAdminClient().storage.from(SV_DOCUMENTS_BUCKET).download(path);
    if (file.error || !file.data) {
      console.error('[documents/download] hash download failed');
      return { ok: false, code: 'error' };
    }
    const bytes = Buffer.from(await file.data.arrayBuffer());
    const hex = createHash('sha256').update(bytes).digest('hex');
    return { ok: true, match: hex === String(row.data.sha256) };
  } catch {
    console.error('[documents/download] hash verify failed');
    return { ok: false, code: 'error' };
  }
}
