'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function Manifeste() {
  const { t } = useLanguage();
  const m = t.landing.manifeste;

  return (
    <section className="sec border-t" id="manifeste">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{m.num}</div>
          <h2 className="sec-title">
            {m.title_l1}<br /><em className="it">{m.title_l2_it}</em>
          </h2>
          <p className="sec-intro">{m.intro}</p>
        </div>

        <div className="manifeste">
          <div className="col" data-reveal>
            <p>{m.p1}</p>
            <p>{m.p2}</p>
            <p className="quote">{m.quote}</p>
          </div>
          <div className="col" data-reveal data-reveal-delay="1">
            <p>{m.p3}</p>
            <p className="dim">{m.p4}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
