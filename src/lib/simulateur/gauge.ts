// Pure geometry for the diagnostic simulator's radial score gauge (Phase 7).
// Must stay free of React, DOM and Next imports so both ScoreGauge.tsx and
// vitest (environment: 'node') can import it directly.
// The numeric values below are locked by 07-UI-SPEC.md's Gauge visual
// contract and must not be changed without updating that document.

export const GAUGE_GEOMETRY = {
  diameter: 200,
  strokeWidth: 14,
  radius: (200 - 14) / 2,
  center: 200 / 2,
  circumference: 2 * Math.PI * ((200 - 14) / 2),
};

/**
 * Maps a score (0-100) to an SVG `stroke-dashoffset` for the gauge's fill
 * arc. Clamps non-finite input to 0 and the finite range to 0..100 so an
 * out-of-range or NaN score can never produce a negative or overflowing
 * offset (T-07-03).
 */
export function gaugeDashOffset(score: number): number {
  const safe = Number.isFinite(score) ? score : 0;
  const clamped = Math.min(100, Math.max(0, safe));
  return GAUGE_GEOMETRY.circumference * (1 - clamped / 100);
}
