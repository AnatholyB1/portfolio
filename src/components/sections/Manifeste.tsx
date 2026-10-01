'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function Manifeste() {
  const { t } = useLanguage();
  const m = t.landing.manifeste;

  return (
    <section className="mband" id="manifeste">
      <div className="wrap">
        <div className="mband-head" data-reveal>
          <span className="mband-num mono">{m.num}</span>
          <h2 className="mband-title">
            {m.title_l1} <em className="it">{m.title_l2_it}</em>
          </h2>
          <p className="mband-intro">{m.intro}</p>
        </div>

        <p className="mband-quote" data-reveal>{m.quote}</p>

        <div className="mband-cols">
          <div data-reveal>
            <p>{m.p1}</p>
            <p>{m.p2}</p>
          </div>
          <div data-reveal data-reveal-delay="1">
            <p>{m.p3}</p>
            <p>{m.p4}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
