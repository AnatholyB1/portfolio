import { getPublishedReviews } from '@/lib/reviews/publicReviews';

export const dynamic = 'force-dynamic';

// Extrait d'accueil (D-03) : 3 avis maximum, champs d'affichage uniquement, cacheable CDN.

export async function GET(): Promise<Response> {
  const rows = await getPublishedReviews(3);
  const reviews = rows.slice(0, 3).map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    displayName: r.displayName,
    publishedAt: r.publishedAt,
  }));
  return Response.json(
    { reviews },
    { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}
