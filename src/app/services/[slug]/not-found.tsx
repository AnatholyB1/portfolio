// On-brand 404 for unknown /services/[slug] values (dynamicParams = false in
// layout.tsx means any slug outside the fixed 9 hits this Server Component).
// French hardcoded — outside the i18n items array, never crawled for keywords.

import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function ServiceSlugNotFound() {
  return (
    <>
      <Navbar />
      <section className="svc-hero">
        <div className="wrap">
          <h1 className="svc-h1">Cette page n&apos;existe pas</h1>
          <p className="svc-sub">Ce service n&apos;est pas (ou plus) référencé.</p>
          <Link href="/services" className="btn btn-ghost">Voir tous nos services →</Link>
        </div>
      </section>
      <Footer />
    </>
  );
}
