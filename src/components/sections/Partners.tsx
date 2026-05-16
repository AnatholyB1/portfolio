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
        {/* Left/right fade masks */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, var(--bg) 0%, transparent 8%, transparent 92%, var(--bg) 100%)',
          pointerEvents: 'none', zIndex: 2,
        }} />
        <div
          className="partners-track"
          style={{ animation: 'partnersTicker 32s linear infinite' }}
        >
          {items.map((item, i) => (
            <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, margin: '0 32px', flexShrink: 0 }}>
              {/* Colored glyph dot — replaces 3D CSS shape from PartnersBanner */}
              <span
                className="pglyph"
                style={{ background: item.color, boxShadow: `0 0 16px ${item.color}` }}
              />
              <div>
                <div className="pname">{item.name}</div>
                <div className="prole">{item.role}</div>
              </div>
              <span className="part-sep" style={{ marginLeft: 32, color: 'var(--line)' }}>·</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
