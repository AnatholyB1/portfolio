'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ReviewCard from '@/components/reviews/ReviewCard';

type ExcerptReview = {
  id: string;
  rating: number;
  body: string;
  displayName: string;
  publishedAt: string;
};

export function AvisExcerptView({ reviews }: { reviews: ExcerptReview[] }) {
  const shown = reviews.slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <section className="border-t border-[var(--line)]" style={{ padding: '48px 0' }} id="avis">
      <div className="wrap">
        <p className="text-xs font-mono tracking-[0.3em] text-[var(--acid)]/70 uppercase mb-3">
          {'// AVIS VÉRIFIÉS'}
        </p>
        <h2 className="text-2xl font-medium text-[var(--ink)] mb-6">Ce que disent nos clients</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 min-[1100px]:grid-cols-3" style={{ gap: 24 }}>
          {shown.map((r) => (
            <ReviewCard
              key={r.id}
              variant="compact"
              review={{ ...r, title: null, experienceDate: null }}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-6 mt-8 text-sm">
          <Link
            href="/avis"
            className="inline-flex items-center gap-1 text-[var(--ink)] underline underline-offset-2"
          >
            Voir tous les avis
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/politique-des-avis"
            className="text-[var(--ink-dim)] underline underline-offset-2"
          >
            Politique des avis
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function AvisExcerpt() {
  const [reviews, setReviews] = useState<ExcerptReview[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/avis/recent')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json && Array.isArray(json.reviews)) setReviews(json.reviews);
      })
      .catch(() => {
        // keep state empty: render nothing on error
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <AvisExcerptView reviews={reviews} />;
}
