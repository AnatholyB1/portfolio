// Liens utiles (D-15) et accord de présentation append-only (D-16).
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { PRESENTATION_CONSENT } from '@/lib/projects/consent';
import { linkSchema } from '@/lib/projects/schemas';
import { getAccessibleProject } from './access';

export async function addProjectLink(
  rls: SupabaseClient,
  a: { projectId: string; title: string; url: string; actorId: string },
): Promise<{ ok: true } | { ok: false; code: 'invalid' | 'not_found' | 'error' }> {
  const parsed = linkSchema.safeParse({ projectId: a.projectId, title: a.title, url: a.url });
  if (!parsed.success) return { ok: false, code: 'invalid' };
  const project = await getAccessibleProject(rls, a.projectId);
  if (!project) return { ok: false, code: 'not_found' };
  try {
    const res = await createSupabaseAdminClient().from('sv_project_links').insert({
      project_id: project.id,
      title: parsed.data.title,
      url: parsed.data.url,
      created_by: a.actorId,
    });
    if (res.error) {
      console.error('[projects/content] link insert failed');
      return { ok: false, code: 'error' };
    }
    return { ok: true };
  } catch {
    console.error('[projects/content] link failed');
    return { ok: false, code: 'error' };
  }
}

export async function setPresentationConsent(
  rls: SupabaseClient,
  a: { projectId: string; granted: boolean; version: string; actorId: string },
): Promise<{ ok: true; createdAt: string } | { ok: false; code: 'stale_version' | 'not_found' | 'error' }> {
  if (a.version !== PRESENTATION_CONSENT.version) return { ok: false, code: 'stale_version' };
  const project = await getAccessibleProject(rls, a.projectId);
  if (!project) return { ok: false, code: 'not_found' };
  try {
    const res = await createSupabaseAdminClient()
      .from('sv_project_consents')
      .insert({
        project_id: project.id,
        granted: a.granted,
        text_version: PRESENTATION_CONSENT.version,
        text_snapshot: PRESENTATION_CONSENT.text,
        actor_id: a.actorId,
      })
      .select('created_at')
      .single();
    if (res.error || !res.data) {
      console.error('[projects/content] consent insert failed');
      return { ok: false, code: 'error' };
    }
    return { ok: true, createdAt: String(res.data.created_at) };
  } catch {
    console.error('[projects/content] consent failed');
    return { ok: false, code: 'error' };
  }
}
