import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ReviewCard from '@/components/reviews/ReviewCard';
import { getPublishedReviews } from '@/lib/reviews/publicReviews';

// Server component: the excerpt is read on the server from the same data module as /avis
// (the sv_public_reviews view, which excludes hidden reviews). Reviews are always the three
// most recent, in publication order, with no selection by rating.

type ExcerptReview = {
  id: string;
  rating: number;
  body: string;
  displayName: string;
  publishedAt: string;
};

const linkClass =
  'inline-flex min-h-[44px] items-center gap-1 underline underline-offset-2';

export function AvisExcerptView({ reviews }: { reviews: ExcerptReview[] }) {
  const shown = reviews.slice(0, 3);
  return (
    <section className="avis-excerpt border-t border-[var(--line)]" id="avis" aria-labelledby="avis-excerpt-title">
      <div className="wrap">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-[var(--acid)]/70">
          {'// AVIS VÉRIFIÉS'}
        </p>
        <h2 id="avis-excerpt-title" className="mb-6 text-2xl font-medium text-[var(--ink)]">
          Ce que disent nos clients
        </h2>
        {shown.length === 0 ? (
          <p className="max-w-[60ch] leading-relaxed text-[var(--ink-dim)]">
            Les avis arrivent après la livraison des projets, par un lien personnel envoyé à chaque
            client. Ils sont publiés tels qu&apos;écrits, sans filtrage de la note ni du ton.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 min-[1100px]:grid-cols-3">
            {shown.map((r) => (
              <ReviewCard
                key={r.id}
                variant="compact"
                review={{ ...r, title: null, experienceDate: null }}
              />
            ))}
          </div>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-x-6 text-sm">
          <Link href="/avis" className={`${linkClass} text-[var(--ink)]`}>
            {shown.length === 0 ? 'Voir la page des avis' : 'Voir tous les avis'}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/politique-des-avis" className={`${linkClass} text-[var(--ink-dim)]`}>
            Politique des avis
          </Link>
        </div>
      </div>
    </section>
  );
}

export default async function AvisExcerpt() {
  const rows = await getPublishedReviews(3);
  const reviews = rows.slice(0, 3).map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    displayName: r.displayName,
    publishedAt: r.publishedAt,
  }));
  return <AvisExcerptView reviews={reviews} />;
}
