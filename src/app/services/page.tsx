'use client';
// page.tsx must be 'use client' because useReveals() calls IntersectionObserver (browser API)
// Metadata lives in src/app/services/layout.tsx — do NOT add it here

import Link from 'next/link';
import { useReveals } from '@/hooks/useReveals';
import { useLanguage } from '@/context/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { services } from '@/data/services';

export default function ServicesPage() {
  // Mount scroll-reveal system — sweeps all [data-reveal] elements across all child sections
  useReveals();
  const { t } = useLanguage();
  const p = t.services.pages;

  return (
    <>
      <Navbar />
      <main>
        <section className="svc-hero">
          <div className="wrap">
            <div className="o-num">{p.index.badge}</div>
            <h1 className="svc-h1">
              {p.index.title_l1} <em className="it">{p.index.title_l2_it}</em>
            </h1>
            <p className="svc-sub">{p.index.sub}</p>
          </div>
        </section>

        <section className="svc-sec">
          <div className="wrap">
            <p className="svc-body" data-reveal style={{ marginBottom: 56 }}>{p.index.intro}</p>

            <ol className="idx">
              {services.map((s, i) => {
                const copy = p.items[s.index];
                return (
                  <li key={s.slug} data-reveal>
                    <a href={`/services/${s.slug}`} className="idx-row">
                      <span className="idx-n mono">{String(i + 1).padStart(2, '0')}</span>
                      <span className="idx-name">{copy.name}</span>
                      <span className="idx-tag mono">{copy.tagline}</span>
                      <span className="idx-go" aria-hidden="true">→</span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="svc-cta">
          <div className="wrap">
            <h2 className="svc-h2">
              {p.ctaHeading_l1} <em className="it">{p.ctaHeading_l2_it}</em>
            </h2>
            <p className="svc-body">{p.ctaSub}</p>
            <div className="svc-ctas">
              {/* /simulateur ships in Phase 7 — linking it now is the decision locked in 06-UI-SPEC.md's Copywriting Contract */}
              <Link href="/simulateur" className="btn btn-primary">{p.ctaPrimary}</Link>
              <Link href="/#contact" className="btn btn-ghost">{p.ctaSecondary}</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
