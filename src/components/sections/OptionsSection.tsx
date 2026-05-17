'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function OptionsSection() {
  const { t } = useLanguage();
  const ts = t.services.upsell;

  return (
    <section className="sec border-t" id="options">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{ts.num}</div>
          <h2 className="sec-title">
            {ts.title_l1}<br /><em className="it">{ts.title_l2_it}</em>
          </h2>
          <p className="sec-intro">{ts.intro}</p>
        </div>

        <div className="upsell-grid">
          {ts.options.map((o, i) => (
            <div
              className="upsell-card"
              key={i}
              data-reveal
              data-reveal-delay={String(i % 4)}
            >
              <div className="un">{String(i + 1).padStart(2, '0')}</div>
              <h4>{o.name}</h4>
              <p>{o.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
