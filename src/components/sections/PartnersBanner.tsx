'use client';

import { useLanguage } from '@/context/LanguageContext';

// ─────────────────────────────────────────────────────────
// PARTNER DATA (non-translated: proper nouns)
// ─────────────────────────────────────────────────────────

const PARTNERS = [
  {
    id: 'selenium',
    name: 'Selenium Studio',
    url: 'https://selenium-studio.com',
    shape: 'torus' as const,
    color: '#6366f1',
  },
  {
    id: 'gecko',
    name: 'Gecko Cabane',
    url: 'https://geckocabanerestaurant.com',
    shape: 'diamond' as const,
    color: '#10b981',
  },
  {
    id: 'victor',
    name: 'Victor Verissimo',
    url: 'https://victor-verissimo.vercel.app',
    shape: 'octahedron' as const,
    color: '#f59e0b',
  },
  {
    id: 'folies',
    name: 'Les Folies Temps Danse',
    url: null,
    shape: 'triangle' as const,
    color: '#ec4899',
  },
  {
    id: 'ajmg',
    name: 'AJMG-EXP',
    url: null,
    shape: 'hexagon' as const,
    color: '#06b6d4',
  },
] as const;

type Shape = typeof PARTNERS[number]['shape'];

// ─────────────────────────────────────────────────────────
// CSS 3D SHAPES
// ─────────────────────────────────────────────────────────

function Shape3D({ shape, color }: { shape: Shape; color: string }) {
  const glow = `0 0 12px ${color}99, 0 0 24px ${color}44`;

  const base: React.CSSProperties = {
    boxShadow: glow,
    flexShrink: 0,
  };

  if (shape === 'torus') return (
    <div
      className="animate-spin"
      style={{
        ...base,
        width: 26, height: 26,
        borderRadius: '50%',
        border: `5px solid ${color}`,
        animationDuration: '3.5s',
        animationTimingFunction: 'linear',
        boxShadow: `0 0 10px ${color}99`,
      }}
    />
  );

  if (shape === 'diamond') return (
    <div
      className="animate-spin"
      style={{
        ...base,
        width: 20, height: 20,
        background: color,
        transform: 'rotate(45deg)',
        animationDuration: '4s',
        animationTimingFunction: 'linear',
      }}
    />
  );

  if (shape === 'octahedron') return (
    <div
      className="animate-spin"
      style={{
        ...base,
        width: 22, height: 22,
        background: color,
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        animationDuration: '4.5s',
        animationTimingFunction: 'linear',
      }}
    />
  );

  if (shape === 'triangle') return (
    <div
      className="animate-spin"
      style={{
        ...base,
        width: 22, height: 22,
        background: color,
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        animationDuration: '5s',
        animationTimingFunction: 'linear',
      }}
    />
  );

  // hexagon
  return (
    <div
      className="animate-spin"
      style={{
        ...base,
        width: 24, height: 24,
        background: color,
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        animationDuration: '5.5s',
        animationTimingFunction: 'linear',
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────
// ORBIT RINGS + SHAPE
// ─────────────────────────────────────────────────────────

function ShapeWithRings({ shape, color }: { shape: Shape; color: string }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
      {/* Outer orbit ring */}
      <div
        className="absolute animate-spin rounded-full"
        style={{
          width: 42, height: 42,
          border: `1px solid ${color}55`,
          animationDuration: '10s',
          animationTimingFunction: 'linear',
        }}
      />
      {/* Inner orbit ring */}
      <div
        className="absolute animate-spin rounded-full"
        style={{
          width: 30, height: 30,
          border: `1px solid ${color}33`,
          animationDuration: '16s',
          animationTimingFunction: 'linear',
          animationDirection: 'reverse',
        }}
      />
      <Shape3D shape={shape} color={color} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// BANNER
// ─────────────────────────────────────────────────────────

export default function PartnersBanner() {
  const { t } = useLanguage();
  const tp = t.services.partners;

  const roles: Record<string, string> = {
    selenium: tp.selenium_role,
    gecko: tp.gecko_role,
    victor: tp.victor_role,
    folies: tp.folies_role,
    ajmg: tp.ajmg_role,
  };

  // Duplicate for seamless infinite scroll (2 copies → animate -50%)
  const items = [...PARTNERS, ...PARTNERS];

  return (
    <section className="relative py-14 overflow-hidden border-y border-white/5" style={{ background: '#03031a' }}>
      {/* Left & right fade edges */}
      <div
        className="absolute left-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #03031a, transparent)' }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #03031a, transparent)' }}
      />

      {/* Title */}
      <p className="text-center text-xs font-mono tracking-[0.3em] text-white/25 uppercase mb-8 relative z-10">
        {tp.title}
      </p>

      {/* Ticker track */}
      <div className="flex" style={{ width: 'max-content', animation: 'partnersTicker 32s linear infinite' }}>
        {items.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-3 mx-3 px-5 py-3 rounded-2xl border shrink-0 transition-all duration-300 hover:scale-105"
            style={{
              background: `${p.color}0a`,
              borderColor: `${p.color}2a`,
              minWidth: '230px',
            }}
          >
            <ShapeWithRings shape={p.shape} color={p.color} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">{p.name}</p>
              <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: p.color }}>
                {roles[p.id] ?? ''}
              </p>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes partnersTicker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
