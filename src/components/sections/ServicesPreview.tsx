'use client';
import { useLanguage } from '@/context/LanguageContext';
import { services } from '@/data/services';

export default function ServicesPreview() {
  const { t } = useLanguage();
  const ts = t.landing.servicesPreview;

  return (
    <section className="sec border-t" id="services-preview">
      <div className="wrap">
        <div className="idx-head" data-reveal>
          <div>
            <span className="sec-num">{ts.num}</span>
            <h2 className="sec-title">
              {ts.title_l1}<br /><em className="it">{ts.title_l2_it}</em>
            </h2>
          </div>
          <p className="sec-intro">{ts.intro}</p>
        </div>

        <ol className="idx">
          {services.map((s, i) => {
            const copy = t.services.pages.items[s.index];
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
  );
}
