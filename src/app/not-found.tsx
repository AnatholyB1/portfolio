// Site-wide styled 404. Also the practical fix for the /services/[slug]
// not-found not rendering: Next.js 16 does not route a notFound() call made
// in a layout.tsx (services/[slug]/layout.tsx) to that same segment's own
// not-found.tsx (see vercel/next.js#84738, #87738) — it bubbles here instead.
// French hardcoded — same rationale as services/[slug]/not-found.tsx: outside
// the i18n items array, never crawled for keywords.

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <section className="svc-hero">
        <div className="wrap">
          <h1 className="svc-h1">Cette page n&apos;existe pas</h1>
          <p className="svc-sub">Elle a peut-être été déplacée ou n&apos;existe plus.</p>
          <a href="/" className="btn btn-ghost">Retour à l&apos;accueil →</a>
        </div>
      </section>
      <Footer />
    </>
  );
}
