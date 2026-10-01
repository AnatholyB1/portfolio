'use client';
import { useLanguage } from '@/context/LanguageContext';
import { projects } from '@/data/projects';
import BrowserShot from '@/components/ui/BrowserShot';

export default function HeroSection() {
  const { t } = useLanguage();
  const tl = t.landing;
  const [gecko, folies, ghj] = [projects[1], projects[2], projects[3]];

  return (
    <section className="hero" id="top">
      <div className="wrap hero-wrap">
        <div className="hero-top" data-reveal>
          <span className="pill mono"><span className="dot" />{tl.hero.pill}</span>
          <span className="label">SÈVALYS — 2026</span>
        </div>

        <div className="hero-stage">
          <div className="hero-copy">
            <h1 className="hero-title split">
              <span className="line"><span>{tl.hero.title_l1}</span></span>
              <span className="line">
                <span>{tl.hero.title_l2}<em className="it acid">{tl.hero.title_l2_it}</em></span>
              </span>
              <span className="line"><span>{tl.hero.title_l3}</span></span>
            </h1>
            <p className="hero-sub" data-reveal data-reveal-delay="2">{tl.hero.sub}</p>
            <div className="hero-ctas" data-reveal data-reveal-delay="3">
              <a className="btn btn-primary" href="/simulateur">
                {tl.hero.cta_primary} <span className="ar">→</span>
              </a>
              <a className="btn btn-ghost" href="#contact">{tl.hero.cta_secondary}</a>
            </div>
            <ul className="hero-proof mono" data-reveal data-reveal-delay="4">
              {projects.map((p) => (
                <li key={p.name}>{p.name}</li>
              ))}
            </ul>
          </div>

          <div className="hero-collage" data-reveal data-reveal-delay="2">
            <span className="hero-block" aria-hidden="true" />
            <div className="hc hc-a">
              <BrowserShot src={gecko.image} alt={gecko.name} host={gecko.host} height={gecko.imageHeight} priority sizes="(max-width: 900px) 90vw, 560px" />
              <span className="hc-cap mono">{gecko.name} · {gecko.year}</span>
            </div>
            <div className="hc hc-b">
              <BrowserShot src={ghj.image} alt={ghj.name} host={ghj.host} height={ghj.imageHeight} sizes="(max-width: 900px) 70vw, 360px" />
              <span className="hc-cap mono">{ghj.name} · {ghj.year}</span>
            </div>
            <div className="hc hc-c">
              <BrowserShot src={folies.image} alt={folies.name} host={folies.host} height={folies.imageHeight} sizes="(max-width: 900px) 60vw, 300px" />
              <span className="hc-cap mono">{folies.name} · {folies.year}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
