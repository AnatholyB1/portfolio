'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function ReassuranceSection() {
  const { t } = useLanguage();
  const ts = t.services.reassurance;

  return (
    <section className="sec border-t">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{ts.num}</div>
          <h2 className="sec-title split">
            <span className="line"><span>{ts.title_l1}</span></span>
            <span className="line"><span><em className="it">{ts.title_l2_it}</em></span></span>
          </h2>
          <p className="sec-intro">{ts.intro}</p>
        </div>

        <div className="reassure-grid">
          {ts.points.map((p, i) => (
            <div
              className="reassure"
              key={i}
              data-reveal
              data-reveal-delay={String(i % 2)}
            >
              <span className="rn">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h4>{p.t}</h4>
                <p>{p.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
