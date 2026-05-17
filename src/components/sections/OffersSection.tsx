'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function OffersSection() {
  const { t } = useLanguage();
  const ts = t.services.offers;

  return (
    <section className="sec border-t" id="offers">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{ts.num}</div>
          <h2 className="sec-title">
            {ts.title_l1}<br /><em className="it">{ts.title_l2_it}</em>
          </h2>
          <p className="sec-intro">{ts.intro}</p>
        </div>

        <div className="offers-grid">
          {ts.items.map((o, i) => {
            const popular = i === 1;
            return (
              <div
                key={i}
                className={`offer${popular ? ' popular' : ''}`}
                data-reveal
                data-reveal-delay={String(i)}
              >
                {popular && <span className="pop-tag">{ts.popular}</span>}
                <div className="o-name">{o.name}</div>
                <div className="o-tag">{o.tagline}</div>
                <div className="o-from">{ts.from}</div>
                <div className="o-price">{o.price}</div>
                <p className="o-desc">{o.description}</p>
                <ul className="o-feats">
                  {o.features.map((f, j) => (
                    <li className="o-feat" key={j}>
                      <span className="c">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <a href="/#contact" className="o-cta">{ts.cta} →</a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
