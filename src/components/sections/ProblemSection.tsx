'use client';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const MORE: Record<string, string> = { fr: 'Voir les 2 autres', en: 'See the other 2', th: 'ดูอีก 2 ข้อ' };

export default function ProblemSection() {
  const { t, lang } = useLanguage();
  const [more, setMore] = useState(false);
  const ts = t.landing.problems;

  return (
    <section className="sec problems" id="problems">
      <div className="wrap problems-wrap">
        <div className="problems-side" data-reveal>
          <span className="sec-num">{ts.num}</span>
          <h2 className="sec-title">
            {ts.title_l1}<br /><em className="it">{ts.title_l2_it}</em>
          </h2>
          <p className="sec-intro">{ts.intro}</p>
          <a className="btn btn-primary" href="/simulateur">
            {ts.cta} <span className="ar">→</span>
          </a>
        </div>

        <div className="problems-col">
        <ol className={`problems-list${more ? ' is-expanded' : ''}`}>
          {ts.items.map((it, i) => (
            <li key={i} className={i >= 2 ? 'pl-extra' : undefined} data-reveal data-reveal-delay={String(i % 3)}>
              <span className="pl-n mono">{it.n}</span>
              <div>
                <h3>{it.title}</h3>
                <p>{it.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        {!more && (
          <button type="button" className="more-btn" onClick={() => setMore(true)} aria-expanded={false}>
            {MORE[lang]} <span aria-hidden="true">↓</span>
          </button>
        )}
        </div>

      </div>

      <div className="wrap">
        <p className="problems-good" data-reveal>{ts.good_news}</p>
      </div>
    </section>
  );
}
