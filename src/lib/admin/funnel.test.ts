import { describe, expect, it } from 'vitest';
import {
  averageCostPerRdv,
  conversionRate,
  formatEuroCents,
  groupFunnelRows,
  monthRange,
  type FunnelRow,
} from './funnel';

const norm = (s: string) => s.replace(/[  ]/g, ' ');

function row(over: Partial<FunnelRow>): FunnelRow {
  return {
    source: 'google',
    campaign: 'a',
    month: '2026-09-01',
    visits: 10,
    simulations: 5,
    leads: 4,
    qualified: 3,
    rdv: 2,
    signed: 1,
    costPerRdvCents: null,
    ...over,
  };
}

describe('groupFunnelRows', () => {
  it('merges campaigns of one source and sums stages', () => {
    const out = groupFunnelRows(
      [row({ campaign: 'a', costPerRdvCents: 100 }), row({ campaign: 'b', visits: 20 })],
      'source',
    );
    expect(out).toHaveLength(1);
    expect(out[0].visits).toBe(30);
    expect(out[0].leads).toBe(8);
    expect(out[0].costPerRdvCents).toBeNull();
  });

  it('groups by month and campaign', () => {
    const rows = [row({}), row({ source: 'meta', month: '2026-10-01' })];
    expect(groupFunnelRows(rows, 'month')).toHaveLength(2);
    expect(groupFunnelRows(rows, 'campaign')).toHaveLength(1);
  });

  it("returns rows unchanged for 'all'", () => {
    const rows = [row({ costPerRdvCents: 4500 })];
    expect(groupFunnelRows(rows, 'all')).toEqual(rows);
  });
});

describe('conversionRate', () => {
  it('formats a percentage', () => {
    expect(norm(conversionRate(2, 4) as string)).toBe('50 %');
  });
  it('returns null when previous is zero', () => {
    expect(conversionRate(1, 0)).toBeNull();
  });
});

describe('formatEuroCents', () => {
  it('formats euros', () => {
    expect(norm(formatEuroCents(1250))).toBe('12,50 €');
    expect(norm(formatEuroCents(4500))).toBe('45 €');
  });
  it('handles missing value', () => {
    expect(formatEuroCents(null)).toBe('Non saisi');
  });
});

describe('averageCostPerRdv', () => {
  it('weights by rdv and ignores rows without cost', () => {
    const avg = averageCostPerRdv([
      row({ rdv: 1, costPerRdvCents: 1000 }),
      row({ rdv: 3, costPerRdvCents: 2000 }),
      row({ rdv: 10, costPerRdvCents: null }),
      row({ rdv: 0, costPerRdvCents: 9999 }),
    ]);
    expect(avg).toBe(1750);
  });
  it('returns null with no data', () => {
    expect(averageCostPerRdv([row({ costPerRdvCents: null })])).toBeNull();
  });
});

describe('monthRange', () => {
  const now = new Date(Date.UTC(2026, 9, 15));
  it('defaults to the last 6 months', () => {
    expect(monthRange(undefined, undefined, now)).toEqual({ from: '2026-05', to: '2026-10' });
  });
  it('swaps inverted inputs', () => {
    expect(monthRange('2026-09', '2026-03', now)).toEqual({ from: '2026-03', to: '2026-09' });
  });
  it('falls back on malformed input', () => {
    expect(monthRange('nope', '2026-13', now)).toEqual({ from: '2026-05', to: '2026-10' });
  });
  it('caps the range at 36 months', () => {
    const r = monthRange('2015-01', '2026-10', now);
    expect(r.to).toBe('2026-10');
    expect(r.from).toBe('2023-11');
  });
});
