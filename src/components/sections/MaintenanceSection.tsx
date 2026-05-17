'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function MaintenanceSection() {
  const { t } = useLanguage();
  const ts = t.services.maintenance;

  return (
    <section className="sec border-t" id="maintenance">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{ts.num}</div>
          <h2 className="sec-title">
            {ts.title_l1}<br /><em className="it">{ts.title_l2_it}</em>
          </h2>
          <p className="sec-intro">{ts.intro}</p>
        </div>

        <div className="maintenance-grid">
          {ts.packs.map((p, i) => (
            <div
              key={i}
              className={`mpack${p.popular ? ' popular' : ''}`}
              data-reveal
              data-reveal-delay={String(i)}
            >
              {p.popular && <span className="pop-tag">{ts.recommended}</span>}
              <h3>{p.name}</h3>
              <div className="price-row">
                <span className="pcur">{ts.currency}</span>
                <span className="pval">{p.price}</span>
                {p.priceNote && <span className="pnote">{p.priceNote}</span>}
                <span className="pper">{ts.per_month}</span>
              </div>
              <p className="mdesc">{p.description}</p>
              <ul className="mfeats">
                {p.features.map((f, j) => (
                  <li className="mfeat" key={j}>
                    <span className="c">✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="perks" data-reveal>
          {ts.perks.map((perk, i) => (
            <span className="perk" key={i}>{perk}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
