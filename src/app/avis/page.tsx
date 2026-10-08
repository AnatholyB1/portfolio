import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ReviewCard from '@/components/reviews/ReviewCard';
import { getPublishedReviews } from '@/lib/reviews/publicReviews';
import { buildReviewsJsonLd } from '@/lib/reviews/reviewJsonLd';
import { buildJsonLdScript } from '@/lib/serviceJsonLd';

const REVIEWS_PAGE_SIZE = 50;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sevalys.com';

type SearchParams = Promise<{ page?: string }>;

function parsePage(raw: string | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const n = parseInt(raw, 10);
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const page = parsePage((await searchParams)?.page);
  return {
    title: page > 1 ? `Avis clients, page ${page}` : 'Avis clients',
    description:
      'Les avis de clients dont le projet a été livré et la recette signée. Publiés tels qu’écrits, sans filtrage de la note ni du ton.',
    robots: { index: true, follow: true },
    alternates: { canonical: page > 1 ? `/avis?page=${page}` : '/avis' },
  };
}

const linkClass =
  'text-[var(--acid)] hover:text-[var(--acid)]/80 underline underline-offset-2 transition-colors';

export default async function AvisPage({ searchParams }: { searchParams: SearchParams }) {
  const page = parsePage((await searchParams)?.page);
  const rows = await getPublishedReviews(REVIEWS_PAGE_SIZE + 1, (page - 1) * REVIEWS_PAGE_SIZE);
  if (page > 1 && rows.length === 0) notFound();

  const hasNext = rows.length > REVIEWS_PAGE_SIZE;
  const displayed = rows.slice(0, REVIEWS_PAGE_SIZE);
  const jsonLd = buildReviewsJsonLd(displayed, SITE_URL);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--bg)] pt-32 pb-16 px-4">
        <div className="mx-auto" style={{ maxWidth: 800 }}>
          <div className="mb-12">
            <p className="text-xs font-mono tracking-[0.3em] text-[var(--acid)]/70 uppercase mb-3">
              {'// AVIS VÉRIFIÉS'}
            </p>
            <h1 className="text-[32px] font-medium leading-tight text-[var(--ink)]">Avis clients</h1>
            <p className="text-[var(--ink-dim)] mt-4 leading-relaxed">
              Chaque avis vient d&apos;un client dont le projet a été livré et recette signée. Nous ne
              filtrons ni la note ni le ton.{' '}
              <Link href="/politique-des-avis" className={linkClass}>
                Politique des avis
              </Link>
            </p>
          </div>

          {displayed.length === 0 ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-2)] p-6">
              <h2 className="text-2xl font-medium text-[var(--ink)] mb-3">Pas encore d&apos;avis publié</h2>
              <p className="text-[var(--ink-dim)] leading-relaxed">
                Les avis arrivent après la livraison des projets, par un lien personnel envoyé à chaque
                client. Vous pouvez en attendant découvrir nos{' '}
                <Link href="/#realisations" className={linkClass}>
                  Réalisations
                </Link>{' '}
                ou nous écrire via la page{' '}
                <Link href="/#contact" className={linkClass}>
                  Contact
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              {jsonLd.map((node, i) => (
                <script
                  key={displayed[i].id}
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{ __html: buildJsonLdScript(node) }}
                />
              ))}
              <div className="flex flex-col" style={{ gap: 32 }}>
                {displayed.map((r) => (
                  <ReviewCard key={r.id} review={r} variant="full" />
                ))}
              </div>
              {page > 1 || hasNext ? (
                <nav aria-label="Pagination des avis" className="flex justify-between mt-10 text-sm">
                  {hasNext ? (
                    <Link href={`/avis?page=${page + 1}`} className={linkClass}>
                      Avis précédents
                    </Link>
                  ) : (
                    <span />
                  )}
                  {page > 1 ? (
                    <Link href={page === 2 ? '/avis' : `/avis?page=${page - 1}`} className={linkClass}>
                      Avis plus récents
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </>
          )}

          <div className="mt-12 rounded-xl border border-[var(--line)] bg-[var(--bg-2)] p-6 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[var(--ink)]">Comment nos avis sont collectés et modérés</span>
            <Link href="/politique-des-avis" className={linkClass}>
              Lire la politique des avis
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
