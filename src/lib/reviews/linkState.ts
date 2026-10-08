import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { hashReviewToken, isWellFormedReviewToken } from '@/lib/reviews/token';

// Hors de src/lib/server pour rester importable par les pages publiques (priceScope règle (b)).
// Lecture seule : ne consomme jamais le jeton (D-05, D-09). Tout cas non valide -> 'invalid'.

export type ReviewLinkState =
  | { state: 'valid'; projectTitle: string; companyName: string }
  | { state: 'invalid' };

export async function getReviewLinkState(token: string): Promise<ReviewLinkState> {
  if (!isWellFormedReviewToken(token)) return { state: 'invalid' };
  try {
    const { data, error } = await createSupabaseAdminClient().rpc('sv_review_link_state', {
      p_token_hash: hashReviewToken(token),
    });
    if (error || !data || typeof data !== 'object') return { state: 'invalid' };
    const d = data as { state?: unknown; project_title?: unknown; company_name?: unknown };
    if (d.state === 'valid' && typeof d.project_title === 'string' && typeof d.company_name === 'string') {
      return { state: 'valid', projectTitle: d.project_title, companyName: d.company_name };
    }
    return { state: 'invalid' };
  } catch {
    console.error('[reviews/link] read_failed');
    return { state: 'invalid' };
  }
}
