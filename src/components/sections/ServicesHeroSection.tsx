'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function ServicesHeroSection() {
  const { t } = useLanguage();
  const ts = t.services.hero;

  return (
    <section className="s-hero">
      <div className="s-hero-grid" />
      <div className="wrap" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
        <div className="s-hero-top" data-reveal>
          <a href="/" className="crumb-back">← Accueil</a>
          <span className="s-pill"><span className="dot" />{ts.badge}</span>
        </div>

        <h1 className="s-hero-title split">
          <span className="line"><span>{ts.title_l1}</span></span>
          <span className="line"><span>{ts.title_l2}</span></span>
          <span className="line"><span><em className="it">{ts.title_l3_it}</em></span></span>
        </h1>

        <div className="s-hero-bottom" data-reveal data-reveal-delay="2">
          <div>
            <p className="s-hero-sub">{ts.sub}</p>
            <div className="s-hero-ctas">
              <a href="/#contact" className="btn btn-primary">{ts.cta_audit} <span className="ar">→</span></a>
              <a href="#offers" className="btn btn-ghost">{ts.cta_offers}</a>
            </div>
          </div>
          <div className="s-hero-meta">
            <span className="k">{ts.meta[0].k}</span>
            <span className="v">{ts.meta[0].v}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="s-hero-meta">
              <span className="k">{ts.meta[1].k}</span>
              <span className="v">{ts.meta[1].v}</span>
            </div>
            <div className="s-hero-meta">
              <span className="k">{ts.meta[2].k}</span>
              <span className="v">{ts.meta[2].v}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
