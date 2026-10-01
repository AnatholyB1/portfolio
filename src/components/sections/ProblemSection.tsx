'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function ProblemSection() {
  const { t } = useLanguage();
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

        <ol className="problems-list">
          {ts.items.map((it, i) => (
            <li key={i} data-reveal data-reveal-delay={String(i % 3)}>
              <span className="pl-n mono">{it.n}</span>
              <div>
                <h3>{it.title}</h3>
                <p>{it.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="problems-good" data-reveal>{ts.good_news}</p>
      </div>
    </section>
  );
}
