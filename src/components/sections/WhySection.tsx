'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function WhySection() {
  const { t } = useLanguage();
  const w = t.landing.why;

  return (
    <section className="sec border-t" id="pourquoi">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <span className="sec-num">{w.num}</span>
          <h2 className="sec-title">
            {w.title_l1}{' '}<br /><em className="it">{w.title_l2_it}</em>
          </h2>
        </div>
        <ul className="why-list">
          {w.items.map((item, i) => (
            <li key={item.t} data-reveal data-reveal-delay={String(i)}>
              <h3>{item.t}</h3>
              <p>{item.d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
