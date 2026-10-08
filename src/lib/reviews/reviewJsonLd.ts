// Pure Review JSON-LD builder (Phase 18, D-04). Must stay free of next/*,
// React and Supabase imports. Serialize ONLY through buildJsonLdScript from
// '@/lib/serviceJsonLd' so '<' is escaped. Review objects only: no summary
// score object and no price keys, by design.

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  displayName: string;
  authorKind: 'person' | 'company';
  publishedAt: string;
  experienceDate: string | null;
  hidden?: boolean;
};

export function buildReviewJsonLd(
  r: PublicReview,
  siteUrl: string,
): Record<string, unknown> {
  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    '@id': `${siteUrl}/avis#review-${r.id}`,
    itemReviewed: {
      '@type': 'ProfessionalService',
      '@id': `${siteUrl}/#service`,
      name: 'Sèvalys',
    },
    author: {
      '@type': r.authorKind === 'company' ? 'Organization' : 'Person',
      name: r.displayName,
    },
    datePublished: r.publishedAt.slice(0, 10),
    reviewRating: {
      '@type': 'Rating',
      ratingValue: r.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: r.body,
  };
  if (r.title) node.name = r.title;
  return node;
}

export function buildReviewsJsonLd(
  rows: PublicReview[],
  siteUrl: string,
): Record<string, unknown>[] {
  return rows
    .filter((r) => r.hidden !== true)
    .map((r) => buildReviewJsonLd(r, siteUrl));
}
