'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function Partners() {
  const { t } = useLanguage();
  const p = t.landing.partners;
  // Duplicate for seamless loop
  const items = [...p.items, ...p.items];

  return (
    <section className="partners" id="partners">
      <style>{`
        @keyframes partnersTicker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      <div className="wrap">
        <div className="partners-title">
          <span className="label">{p.title}</span>
        </div>
      </div>

      <div className="partners-track-wrap">
        <div
          className="partners-track"
          style={{ animation: 'partnersTicker 38s linear infinite' }}
        >
          {items.map((item, i) => (
            <div key={i} className="part">
              <span
                className="pglyph"
                style={{ background: item.color, boxShadow: `0 0 16px ${item.color}` }}
              />
              <div>
                <div className="pname">{item.name}</div>
                <div className="prole">{item.role}</div>
              </div>
              <span className="part-sep">·</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
