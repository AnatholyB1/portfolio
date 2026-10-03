// Fichiers privés projet (D-14) : autorisation par lecture RLS, puis Storage en service_role.
// Aucun chemin n'est accepté de l'appelant ; téléchargement toujours en attachment (T-12-35).
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SIGNED_DOWNLOAD_SECONDS, sanitizeFilename, validateUpload } from '@/lib/projects/fileRules';
import { getAccessibleProject } from './access';

export const SV_FILES_BUCKET = 'sv-project-files';

export type UploadRequestResult =
  | { ok: true; fileId: string; signedUrl: string; token: string; path: string }
  | { ok: false; code: 'not_found' | 'too_large' | 'bad_type' | 'invalid' | 'error' };

export async function requestUpload(
  rls: SupabaseClient,
  a: {
    projectId: string;
    uploaderKind: 'client' | 'admin';
    uploaderId: string;
    filename: string;
    size: number;
    mime: string;
  },
): Promise<UploadRequestResult> {
  const project = await getAccessibleProject(rls, a.projectId);
  if (!project) return { ok: false, code: 'not_found' };
  const check = validateUpload({ filename: a.filename, size: a.size, mime: a.mime });
  if (!check.ok) return { ok: false, code: check.code };
  try {
    const sb = createSupabaseAdminClient();
    const fileId = crypto.randomUUID();
    const safe = sanitizeFilename(a.filename);
    const path = `${project.clientId}/${project.id}/${fileId}-${safe}`;
    const ins = await sb.from('sv_project_files').insert({
      id: fileId,
      project_id: project.id,
      storage_path: path,
      filename: safe,
      mime: a.mime.toLowerCase(),
      size_bytes: a.size,
      uploaded_by_kind: a.uploaderKind,
      uploaded_by: a.uploaderId,
      status: 'pending',
    });
    if (ins.error) {
      console.error('[projects/files] insert failed');
      return { ok: false, code: 'error' };
    }
    const signed = await sb.storage.from(SV_FILES_BUCKET).createSignedUploadUrl(path);
    if (signed.error || !signed.data) {
      console.error('[projects/files] signed upload failed');
      return { ok: false, code: 'error' };
    }
    return {
      ok: true,
      fileId,
      signedUrl: signed.data.signedUrl,
      token: signed.data.token,
      path,
    };
  } catch {
    console.error('[projects/files] request failed');
    return { ok: false, code: 'error' };
  }
}

export async function confirmUpload(
  rls: SupabaseClient,
  fileId: string,
): Promise<{ ok: true } | { ok: false; code: 'not_found' | 'missing' | 'error' }> {
  try {
    const row = await rls
      .from('sv_project_files')
      .select('id, storage_path, status')
      .eq('id', fileId)
      .maybeSingle();
    if (row.error || !row.data) return { ok: false, code: 'not_found' };
    if (row.data.status === 'ready') return { ok: true };
    const path = String(row.data.storage_path);
    const slash = path.lastIndexOf('/');
    const dir = path.slice(0, slash);
    const base = path.slice(slash + 1);
    const sb = createSupabaseAdminClient();
    const listed = await sb.storage.from(SV_FILES_BUCKET).list(dir, { search: base });
    if (listed.error) {
      console.error('[projects/files] list failed');
      return { ok: false, code: 'error' };
    }
    if (!(listed.data ?? []).some((o) => o.name === base)) return { ok: false, code: 'missing' };
    const upd = await sb
      .from('sv_project_files')
      .update({ status: 'ready', ready_at: new Date().toISOString() })
      .eq('id', fileId);
    if (upd.error) {
      console.error('[projects/files] confirm failed');
      return { ok: false, code: 'error' };
    }
    return { ok: true };
  } catch {
    console.error('[projects/files] confirm failed');
    return { ok: false, code: 'error' };
  }
}

export async function createDownloadUrl(
  rls: SupabaseClient,
  fileId: string,
): Promise<{ ok: true; url: string } | { ok: false; code: 'not_found' | 'error' }> {
  try {
    const row = await rls
      .from('sv_project_files')
      .select('id, storage_path, filename, status')
      .eq('id', fileId)
      .maybeSingle();
    if (row.error || !row.data || row.data.status !== 'ready') return { ok: false, code: 'not_found' };
    const signed = await createSupabaseAdminClient()
      .storage.from(SV_FILES_BUCKET)
      .createSignedUrl(String(row.data.storage_path), SIGNED_DOWNLOAD_SECONDS, {
        download: String(row.data.filename),
      });
    if (signed.error || !signed.data) {
      console.error('[projects/files] signed download failed');
      return { ok: false, code: 'error' };
    }
    return { ok: true, url: signed.data.signedUrl };
  } catch {
    console.error('[projects/files] download failed');
    return { ok: false, code: 'error' };
  }
}
