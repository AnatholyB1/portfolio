import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type VisitInput = {
  source: string;
  medium: string;
  campaign: string | null;
  landing: string;
};

// Compteur de visites anonyme : aucun identifiant, erreurs avalées.
export async function recordVisit(v: VisitInput): Promise<void> {
  try {
    const { error } = await createSupabaseAdminClient().rpc('sv_record_visit', {
      p_source: v.source,
      p_medium: v.medium,
      p_campaign: v.campaign,
      p_landing: v.landing,
    });
    if (error) console.error('[leads/visits] rpc failed', error.code ?? 'unknown');
  } catch {
    console.error('[leads/visits] rpc failed');
  }
}
