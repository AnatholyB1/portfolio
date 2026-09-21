'use client';
import { useLanguage } from '@/context/LanguageContext';
import { services } from '@/data/services';

export default function ServicesPreview() {
  const { t } = useLanguage();
  const ts = t.landing.servicesPreview;

  return (
    <section className="sec border-t" id="services-preview">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{ts.num}</div>
          <h2 className="sec-title">
            {ts.title_l1}<br /><em className="it">{ts.title_l2_it}</em>
          </h2>
          <p className="sec-intro">{ts.intro}</p>
        </div>

        <div className="svc-preview-grid">
          {services.map((s, i) => {
            const copy = t.services.pages.items[s.index];
            return (
              <a
                key={s.slug}
                href={`/services/${s.slug}`}
                className="upsell-card"
                data-reveal
                data-reveal-delay={String(i % 3)}
              >
                <div className="un">{String(i + 1).padStart(2, '0')}</div>
                <h4>{copy.name}</h4>
                <p>{copy.tagline}</p>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
