'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function EnjeuxSection() {
  const { t } = useLanguage();
  const ts = t.landing.enjeux;

  return (
    <section className="paper" id="enjeux">
      <div className="wrap">
        <div className="paper-head" data-reveal>
          <span className="paper-num mono">{ts.num}</span>
          <h2 className="paper-title">
            {ts.title_l1} <mark>{ts.title_l2_it}</mark>
          </h2>
          <p className="paper-intro">{ts.intro}</p>
        </div>

        <ol className="paper-points">
          {ts.points.map((p, i) => (
            <li key={i} data-reveal data-reveal-delay={String(i % 4)}>
              <span className="pp-n mono">{String(i + 1).padStart(2, '0')}</span>
              <h4>{p.t}</h4>
              <p>{p.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
