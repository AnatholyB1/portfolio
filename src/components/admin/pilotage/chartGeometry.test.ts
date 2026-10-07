import { describe, expect, it } from 'vitest';
import type { CashMonth } from '@/lib/server/pilotage/forecast';
import { chartGeometry, VIEW_H, VIEW_W } from './chartGeometry';

function month(i: number, o: number, inf: number, out: number): CashMonth {
  return {
    month: `2026-${String(10 + i > 12 ? i - 2 : 10 + i).padStart(2, '0')}`,
    openingCents: o,
    inflowCents: inf,
    overdueInflowCents: 0,
    outflowCents: out,
    closingCents: o + inf - out,
  };
}

function series(): CashMonth[] {
  const ms: CashMonth[] = [];
  let bal = 100000;
  const flows: [number, number][] = [
    [50000, 80000],
    [20000, 90000],
    [0, 60000],
    [300000, 10000],
    [10000, 10000],
    [0, 0],
  ];
  flows.forEach(([inf, out], i) => {
    const m = month(i, bal, inf, out);
    ms.push(m);
    bal = m.closingCents;
  });
  return ms;
}

describe('chartGeometry', () => {
  it('returns 6 increasing x positions inside the viewBox', () => {
    const g = chartGeometry(series());
    expect(g.xs).toHaveLength(6);
    for (let i = 1; i < 6; i++) expect(g.xs[i]).toBeGreaterThan(g.xs[i - 1]);
    for (const x of g.xs) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(VIEW_W);
    }
    expect(g.inflowBars).toHaveLength(6);
    expect(g.outflowBars).toHaveLength(6);
    expect(g.points).toHaveLength(6);
    expect(g.linePath.startsWith('M')).toBe(true);
  });

  it('detects negative segments', () => {
    const g = chartGeometry(series());
    expect(g.negativeSegments.length).toBeGreaterThan(0);
  });

  it('keeps y within the viewBox', () => {
    const g = chartGeometry(series());
    const ys = [
      g.zeroY,
      ...g.points.map((p) => p.y),
      ...g.inflowBars.flatMap((b) => [b.y, b.y + b.h]),
      ...g.outflowBars.flatMap((b) => [b.y, b.y + b.h]),
      ...g.yTicks.map((t) => t.y),
    ];
    for (const y of ys) {
      expect(Number.isFinite(y)).toBe(true);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(VIEW_H);
    }
  });

  it('handles an all-zero series', () => {
    const zero = Array.from({ length: 6 }, (_, i) => month(i, 0, 0, 0));
    const g = chartGeometry(zero);
    for (const p of g.points) expect(Number.isFinite(p.y)).toBe(true);
    expect(Number.isFinite(g.zeroY)).toBe(true);
    expect(g.negativeSegments).toHaveLength(0);
  });

  it('rounds tick labels to the euro', () => {
    const g = chartGeometry(series());
    for (const t of g.yTicks) expect(t.cents % 100).toBe(0);
  });
});
