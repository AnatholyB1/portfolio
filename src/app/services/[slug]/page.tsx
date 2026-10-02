'use client';
// page.tsx must be 'use client' because useReveals() calls IntersectionObserver (browser API)
// Metadata + FAQPage JSON-LD live in src/app/services/[slug]/layout.tsx — do NOT add them here

import Link from 'next/link';
import { use } from 'react';
import { useReveals } from '@/hooks/useReveals';
import { useLanguage } from '@/context/LanguageContext';
import { getServiceBySlug } from '@/data/services';
import { projects } from '@/data/projects';
import { getFeatureIcon } from '@/lib/serviceIcons';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BrowserShot from '@/components/ui/BrowserShot';

export default function ServiceSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  useReveals();
  const { t } = useLanguage();
  const p = t.services.pages;
  const svc = getServiceBySlug(slug);
  if (!svc) return null; // layout.tsx already called notFound() for real 404s
  const copy = p.items[svc.index];

  return (
    <>
      <Navbar />
      <main>
        <section className="svc-hero">
          <div className="wrap">
            <Link href="/services" className="crumb-back">{p.back}</Link>
            <div className="svc-hero-grid">
              <div>
                <h1 className="svc-h1">
                  {copy.h1Lead} <em className="it">{copy.h1Benefit}</em>
                </h1>
                <p className="svc-sub">{copy.sub}</p>
              </div>
              <div className="svc-answer" data-reveal>
                <span className="label">{p.answerLabel}</span>
                <p>{copy.directAnswer}</p>
              </div>
            </div>
            <div className="svc-ctas">
              {/* /simulateur ships in Phase 7 — temporary 404 accepted per 06-UI-SPEC.md Copywriting Contract (Option A) */}
              <Link href="/simulateur" className="btn btn-primary">{p.ctaPrimary}</Link>
              <Link href="/#contact" className="btn btn-ghost">{p.ctaSecondary}</Link>
            </div>
          </div>
        </section>

        <section className="svc-sec">
          <div className="wrap">
            <h2 className="svc-h2">{p.headings.probleme}</h2>
            <div className="svc-problems">
              {copy.problems.map((item, i) => (
                <div className="problem-card" data-reveal data-reveal-delay={String(i)} key={i}>
                  <span className="pn">{item.n}</span>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="svc-sec">
          <div className="wrap">
            <div className="svc-split">
            <h2 className="svc-h2">{p.headings.fonctionnement}</h2>
            <div className="feat-grid">
              {copy.features.map((f, j) => {
                const Icon = getFeatureIcon(svc.featureIcons[j]);
                return (
                  <div className="feat-item" data-reveal data-reveal-delay={String(j % 4)} key={j}>
                    <span className="feat-icon"><Icon size={22} strokeWidth={1.75} /></span>
                    <p>{f}</p>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </section>

        <section className="svc-sec svc-paper">
          <div className="wrap">
            <div className="svc-split">
              <h2 className="svc-h2">{p.headings.enjeux}</h2>
              <div>
                {copy.enjeux.map((e, i) => (
                  <p className="svc-body" key={i}>{e}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="svc-sec">
          <div className="wrap">
            <h2 className="svc-h2">{p.headings.preuve}</h2>
            {svc.caseStudyProjectIndex !== null && copy.caseQuote !== null ? (
              (() => {
                const project = projects[svc.caseStudyProjectIndex as number];
                // WR-02 (06-REVIEW.md): services.test.ts guarantees this join is
                // valid today, but that's a test-time guarantee only — guard
                // against a future projects.ts edit (entry removed/reordered)
                // shipping without the test suite catching it, which would
                // otherwise throw a client-side TypeError on `project.href`.
                if (!project) return null;
                return (
                  <div className="svc-case" data-reveal>
                    <BrowserShot
                      src={project.image}
                      alt={project.name}
                      host={project.host}
                      height={project.imageHeight}
                      sizes="(max-width: 900px) 100vw, 640px"
                    />
                    <div>
                      <p className="svc-case-q">« {copy.caseQuote} »</p>
                      <div className="svc-case-src">
                        {project.href !== null ? (
                          <a href={project.href}>{p.caseLabel} — {project.name}, {project.year}</a>
                        ) : (
                          <>{p.caseLabel} — {project.name}, {project.year}</>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="reassure-grid">
                {copy.signals.map((s, i) => (
                  <div className="reassure" data-reveal key={i}>
                    <h4>{s.t}</h4>
                    <p>{s.d}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {copy.crossLink !== null && (
          <div className="wrap">
            <a className="svc-crosslink" href={`/services/${copy.crossLink.slug}`}>{copy.crossLink.label}</a>
          </div>
        )}

        <section className="svc-sec">
          <div className="wrap">
            <div className="svc-split">
              <h2 className="svc-h2">{p.headings.faq}</h2>
              <div className="faq-list">
                {copy.faq.map((item, i) => (
                  <details className="faq-item" key={i} data-reveal data-reveal-delay={String(i % 3)}>
                    <summary className="faq-q">{item.q}</summary>
                    <p className="faq-a">{item.a}</p>
                  </details>
                ))}
              </div>
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
              {/* /simulateur ships in Phase 7 — temporary 404 accepted per 06-UI-SPEC.md Copywriting Contract (Option A) */}
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
