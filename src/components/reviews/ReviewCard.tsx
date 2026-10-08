import { BadgeCheck, Star } from 'lucide-react';
import type { PublicReview } from '@/lib/reviews/reviewJsonLd';

// Pure presentational card (no hooks): safe in server and client trees.
// Review text is rendered as React text only (T-18-41).

type Props = {
  review: Pick<
    PublicReview,
    'id' | 'rating' | 'title' | 'body' | 'displayName' | 'publishedAt' | 'experienceDate'
  >;
  variant: 'full' | 'compact';
};

const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' });
const monthFmt = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});

export default function ReviewCard({ review, variant }: Props) {
  const compact = variant === 'compact';
  const published = new Date(review.publishedAt);
  const experience = review.experienceDate ? new Date(review.experienceDate) : null;
  const validExperience = experience && !Number.isNaN(experience.getTime());

  return (
    <article
      id={`review-${review.id}`}
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-flex', gap: 2 }} aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) =>
            n <= review.rating ? (
              <Star key={n} size={20} aria-hidden="true" fill="var(--acid)" stroke="var(--acid)" />
            ) : (
              <Star key={n} size={20} aria-hidden="true" fill="none" stroke="var(--pt-border-strong)" />
            ),
          )}
        </span>
        <span className="text-sm font-medium text-[var(--ink)]" aria-hidden="true">
          {review.rating} sur 5
        </span>
        <span className="sr-only">Note : {review.rating} sur 5</span>
      </div>

      {!compact && review.title ? (
        <h2 className="text-2xl font-medium text-[var(--ink)]">{review.title}</h2>
      ) : null}

      <p
        className={`text-base text-[var(--ink)] leading-relaxed${compact ? ' line-clamp-5' : ''}`}
        style={{ whiteSpace: 'pre-line' }}
      >
        {review.body}
      </p>

      <div className="text-sm font-medium text-[var(--ink-dim)] flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>{review.displayName}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={review.publishedAt.slice(0, 10)}>{dateFmt.format(published)}</time>
        {!compact ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <BadgeCheck size={16} aria-hidden="true" />
              Avis vérifié
            </span>
          </>
        ) : null}
      </div>

      {!compact && validExperience ? (
        <p className="text-sm text-[var(--ink-dim)]">
          Projet livré en {monthFmt.format(experience as Date)}
        </p>
      ) : null}
    </article>
  );
}
