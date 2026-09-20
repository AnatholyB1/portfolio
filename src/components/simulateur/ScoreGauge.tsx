'use client';
import { useEffect, useState } from 'react';
import gsap from 'gsap';
import { GAUGE_GEOMETRY, gaugeDashOffset } from '@/lib/simulateur/gauge';

// This gauge animates on mount (the result step becoming visible), not on
// scroll — per 07-RESEARCH.md assumption A3 and 07-UI-SPEC.md. Do NOT
// "fix" this into a scroll-driven trigger: no scroll-plugin import or
// plugin-registration call belongs in this file.

function useCountUp(target: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    // Respect reduced motion: jump straight to the final value, no tween
    // (hard PROJECT.md constraint, mirrors useReveals()'s branch shape).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }

    const obj = { v: 0 };
    const tween = gsap.to(obj, {
      v: target,
      duration: 1.4,
      ease: 'power2.out',
      onUpdate: () => setValue(obj.v),
    });

    return () => {
      tween.kill();
    };
  }, [target]);

  return value;
}

export default function ScoreGauge({
  score,
  caption,
  framing,
}: {
  score: number;
  caption: string;
  framing: string;
}) {
  const animated = useCountUp(score);

  return (
    <div className="sim-gauge">
      <svg
        viewBox="0 0 200 200"
        width={GAUGE_GEOMETRY.diameter}
        height={GAUGE_GEOMETRY.diameter}
        role="img"
        aria-hidden={false}
        aria-label={`${caption} : ${Math.round(score)}`}
      >
        <circle
          cx={GAUGE_GEOMETRY.center}
          cy={GAUGE_GEOMETRY.center}
          r={GAUGE_GEOMETRY.radius}
          stroke="var(--line)"
          strokeWidth={GAUGE_GEOMETRY.strokeWidth}
          fill="none"
        />
        <circle
          cx={GAUGE_GEOMETRY.center}
          cy={GAUGE_GEOMETRY.center}
          r={GAUGE_GEOMETRY.radius}
          stroke="var(--acid)"
          strokeWidth={GAUGE_GEOMETRY.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={GAUGE_GEOMETRY.circumference}
          strokeDashoffset={gaugeDashOffset(animated)}
          transform="rotate(-90 100 100)"
        />
        <text x={100} y={112} textAnchor="middle" className="sim-gauge-num">
          {Math.round(animated)}
        </text>
      </svg>
      <span className="sim-gauge-caption">{caption}</span>
      <p className="sim-gauge-framing">{framing}</p>
    </div>
  );
}
