'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function ProblemSection() {
  const { t } = useLanguage();
  const ts = t.services.problem;

  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{ts.num}</div>
          <h2 className="sec-title">
            {ts.title_l1}<br /><em className="it">{ts.title_l2_it}</em>
          </h2>
          <p className="sec-intro">{ts.intro}</p>
        </div>

        <div className="problem-grid">
          {ts.items.map((it, i) => (
            <div
              className="problem-card"
              data-reveal
              data-reveal-delay={String(i % 4)}
              key={i}
            >
              <span className="pn">{it.n}</span>
              <h3>{it.title}</h3>
              <p>{it.desc}</p>
            </div>
          ))}
        </div>

        <div className="problem-good" data-reveal>{ts.good_news}</div>
      </div>
    </section>
  );
}
