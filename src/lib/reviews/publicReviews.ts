import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { PublicReview } from '@/lib/reviews/reviewJsonLd';

// Hors de src/lib/server pour rester importable par les pages publiques (priceScope règle (b)).
// Source unique des avis publiés pour /avis, le JSON-LD et l'extrait d'accueil (D-04, Pitfall 7) :
// la vue sv_public_reviews exclut les avis masqués. Aucun log de contenu d'avis.

type Row = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  display_name: string;
  author_kind: 'person' | 'company';
  published_at: string;
  experience_date: string | null;
};

export async function getPublishedReviews(limit: number, offset = 0): Promise<PublicReview[]> {
  try {
    const { data, error } = await createSupabaseAdminClient().rpc('sv_public_reviews', {
      p_limit: limit,
      p_offset: offset,
    });
    if (error || !Array.isArray(data)) {
      console.error('[reviews/public] read_failed');
      return [];
    }
    return (data as Row[]).map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title ?? null,
      body: r.body,
      displayName: r.display_name,
      authorKind: r.author_kind,
      publishedAt: r.published_at,
      experienceDate: r.experience_date ?? null,
    }));
  } catch {
    console.error('[reviews/public] read_failed');
    return [];
  }
}
