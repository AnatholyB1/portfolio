// Creation / reutilisation du lien d'avis (D-09). Appele uniquement par le balayage cron (service_role).
// Le jeton est derive (HMAC) puis seul son sha256 part en base ; jamais logue.
import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveReviewToken, hashReviewToken } from '@/lib/reviews/token';

type EnsureResult = { outcome?: string; link_id?: string | null } | null;

/** Retourne l'id du lien (cree ou existant), ou null (deja note, PV absent, expire, erreur). */
export async function ensureReviewLink(
  admin: SupabaseClient,
  projectId: string,
  secret: string,
): Promise<string | null> {
  try {
    const linkId = randomUUID();
    const tokenHash = hashReviewToken(deriveReviewToken(linkId, secret));
    const { data, error } = await admin.rpc('sv_ensure_review_link', {
      p_project_id: projectId,
      p_link_id: linkId,
      p_token_hash: tokenHash,
    });
    if (error) {
      console.error('[reviews/links] ensure_failed');
      return null;
    }
    const res = data as EnsureResult;
    if (res && (res.outcome === 'created' || res.outcome === 'existing') && typeof res.link_id === 'string') {
      return res.link_id;
    }
    return null;
  } catch {
    console.error('[reviews/links] ensure_failed');
    return null;
  }
}
