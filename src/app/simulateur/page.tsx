'use client';
// This file carries a client-only directive because the scroll-reveal hook
// below relies on IntersectionObserver, a browser-only API. Page metadata
// and the FAQPage JSON-LD script live in the sibling layout.tsx and must
// not be duplicated here.

import { useReveals } from '@/hooks/useReveals';
import { useLanguage } from '@/context/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Wizard from '@/components/simulateur/Wizard';

export default function SimulateurPage() {
  useReveals();
  const { t } = useLanguage();
  const s = t.simulateur;

  return (
    <>
      <Navbar />
      <main>
        <section className="svc-hero">
          <div className="wrap">
            <span className="label">{s.badge}</span>
            <div className="svc-hero-grid">
              <div>
                <h1 className="svc-h1">
                  {s.h1Lead} <em className="it">{s.h1Benefit}</em>
                </h1>
                <p className="svc-sub">{s.sub}</p>
              </div>
              <div className="svc-answer" data-reveal>
                <span className="label">{t.services.pages.answerLabel}</span>
                <p>{s.directAnswer}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="svc-sec sim-sec">
          <div className="wrap sim-layout">
            <Wizard />
            <aside className="sim-aside">
              <h2 className="sim-aside-title">{s.intro.heading}</h2>
              <div className="sim-intro">
                {s.intro.paragraphs.map((paragraph, i) => (
                  <p className="svc-body" data-reveal data-reveal-delay={String(i % 3)} key={i}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="svc-sec">
          <div className="wrap">
            <div className="svc-split">
              <h2 className="svc-h2">{t.services.pages.headings.faq}</h2>
              <div className="faq-list">
                {s.faq.map((item, i) => (
                  <details
                    className="faq-item"
                    key={i}
                    data-reveal
                    data-reveal-delay={String(i % 3)}
                  >
                    <summary className="faq-q">{item.q}</summary>
                    <p className="faq-a">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
