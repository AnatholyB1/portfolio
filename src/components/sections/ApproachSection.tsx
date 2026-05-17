'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function ApproachSection() {
  const { t } = useLanguage();
  const ts = t.services.approach;

  return (
    <section className="sec border-t">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{ts.num}</div>
          <h2 className="sec-title">
            {ts.title_l1}<br /><em className="it">{ts.title_l2_it}</em>
          </h2>
          <p className="sec-intro">{ts.intro}</p>
        </div>

        <div className="approach">
          <div className="approach-text" data-reveal>
            <div className="benefits">
              {ts.benefits.map((b, i) => (
                <div className="benefit" key={i}>
                  <span className="c">→</span>{b}
                </div>
              ))}
            </div>
          </div>
          <div className="approach-cards" data-reveal data-reveal-delay="1">
            {ts.cards.map((c, i) => (
              <div className="approach-card" key={i}>
                <span className="idx">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h4>{c.t}</h4>
                  <p>{c.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
