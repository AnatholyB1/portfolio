// Autorisation par lecture RLS : si le client RLS de l'appelant voit le projet, il y a accès (D-22).
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function getAccessibleProject(
  rls: SupabaseClient,
  projectId: string,
): Promise<{ id: string; clientId: string } | null> {
  try {
    const res = await rls.from('sv_projects').select('id, client_id').eq('id', projectId).maybeSingle();
    if (res.error || !res.data) return null;
    return { id: String(res.data.id), clientId: String(res.data.client_id) };
  } catch {
    console.error('[projects/access] read failed');
    return null;
  }
}
