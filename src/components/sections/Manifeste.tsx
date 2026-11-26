'use client';
import { useLanguage } from '@/context/LanguageContext';

// Introduction de l'accueil : fusionne l'ancien Manifeste, les Problèmes et les Enjeux
// (même message, un seul bloc) et porte le H2 « agence digitale à Tours ».
export default function Manifeste() {
  const { t } = useLanguage();
  const m = t.landing.manifeste;
  const half = Math.ceil(m.items.length / 2);
  const columns = [m.items.slice(0, half), m.items.slice(half)];

  return (
    <section className="mband" id="manifeste">
      <div className="wrap">
        <div className="mband-head" data-reveal>
          <span className="mband-num mono">{m.num}</span>
          <h2 className="mband-title">
            {m.title_l1}{' '}<em className="it">{m.title_l2_it}</em>
          </h2>
          <p className="mband-intro">{m.intro}</p>
        </div>

        <p className="mband-quote" data-reveal>{m.quote}</p>

        <div className="mband-cols">
          {columns.map((col, c) => (
            <div key={c} data-reveal data-reveal-delay={String(c)}>
              {col.map((item) => (
                <div key={item.t} className="mband-item">
                  <h3>{item.t}</h3>
                  <p>{item.d}</p>
                </div>
              ))}
            </div>
          ))}
        </div>

        <a className="mband-cta" href="/simulateur">
          {m.cta} <span className="ar" aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
