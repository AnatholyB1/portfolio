'use client';
// page.tsx must be 'use client' because useReveals() calls IntersectionObserver (browser API)
// Metadata lives in src/app/services/layout.tsx — do NOT add it here

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
            <div className="sec-head" data-reveal>
              <div className="sec-num">{p.index.num}</div>
              <h2 className="sec-title">
                {p.index.title_l1}<br /><em className="it">{p.index.title_l2_it}</em>
              </h2>
              <p className="sec-intro">{p.index.intro}</p>
            </div>

            <div className="offers-grid">
              {services.map((s, i) => {
                const copy = p.items[s.index];
                return (
                  <a
                    key={s.slug}
                    href={`/services/${s.slug}`}
                    className="offer"
                    data-reveal
                    data-reveal-delay={String(i % 4)}
                  >
                    <div className="o-num">{String(i + 1).padStart(2, '0')}</div>
                    <div className="o-name">{copy.name}</div>
                    <div className="o-tag">{copy.tagline}</div>
                    <div className="o-problems">
                      {copy.problems.slice(0, 2).map((item, k) => (
                        <div className="o-problem" key={k}>
                          <span className="o-pn">{item.n}</span>
                          <span>{item.title}</span>
                        </div>
                      ))}
                    </div>
                    <ul className="o-feats">
                      {copy.features.slice(0, 3).map((f, j) => (
                        <li className="o-feat" key={j}>
                          <span className="c">✓</span>{f}
                        </li>
                      ))}
                    </ul>
                    <span className="o-cta">{p.index.cardCta}</span>
                  </a>
                );
              })}
            </div>
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
              <a href="/simulateur" className="btn btn-primary">{p.ctaPrimary}</a>
              <a href="/#contact" className="btn btn-ghost">{p.ctaSecondary}</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
