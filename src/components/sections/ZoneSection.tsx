'use client';
import { useLanguage } from '@/context/LanguageContext';

// Zone d'intervention : communes desservies uniquement, jamais d'adresse postale (non confirmée).
export default function ZoneSection() {
  const { t } = useLanguage();
  const z = t.landing.zone;

  return (
    <section className="sec border-t" id="zone">
      <div className="wrap">
        <div className="idx-head" data-reveal>
          <div>
            <span className="sec-num">{z.num}</span>
            <h2 className="sec-title">
              {z.title_l1}{' '}<br /><em className="it">{z.title_l2_it}</em>
            </h2>
          </div>
          <p className="sec-intro">{z.text}</p>
        </div>
        <div className="zone-towns" data-reveal>
          <span className="zone-label mono">{z.label}</span>
          <ul>
            {z.towns.map((town) => (
              <li key={town}>{town}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
