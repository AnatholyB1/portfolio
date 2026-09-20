import { describe, expect, it } from 'vitest';
import { GAUGE_GEOMETRY, gaugeDashOffset } from './gauge';

describe('GAUGE_GEOMETRY', () => {
  it('locks the 200px diameter and 14px stroke width from 07-UI-SPEC.md', () => {
    expect(GAUGE_GEOMETRY.diameter).toBe(200);
    expect(GAUGE_GEOMETRY.strokeWidth).toBe(14);
  });

  it('computes radius so the stroke never clips the 200x200 viewBox', () => {
    expect(GAUGE_GEOMETRY.radius).toBe((200 - 14) / 2);
  });

  it('computes center as half the diameter', () => {
    expect(GAUGE_GEOMETRY.center).toBe(100);
  });

  it('computes circumference from the radius', () => {
    expect(GAUGE_GEOMETRY.circumference).toBeCloseTo(2 * Math.PI * GAUGE_GEOMETRY.radius, 9);
  });
});

describe('gaugeDashOffset', () => {
  it('returns the full circumference (empty arc) for a score of 0', () => {
    expect(gaugeDashOffset(0)).toBeCloseTo(GAUGE_GEOMETRY.circumference, 9);
  });

  it('returns 0 (full arc) for a score of 100', () => {
    expect(gaugeDashOffset(100)).toBeCloseTo(0, 9);
  });

  it('returns half the circumference for a score of 50', () => {
    expect(gaugeDashOffset(50)).toBeCloseTo(GAUGE_GEOMETRY.circumference / 2, 9);
  });

  it('clamps a negative score to the empty-arc offset instead of overshooting', () => {
    expect(gaugeDashOffset(-20)).toBeCloseTo(GAUGE_GEOMETRY.circumference, 9);
  });

  it('clamps a score over 100 to the full-arc offset instead of overshooting', () => {
    expect(gaugeDashOffset(140)).toBeCloseTo(0, 9);
  });

  it('treats NaN as 0 rather than propagating NaN into the offset', () => {
    expect(gaugeDashOffset(Number.NaN)).toBeCloseTo(GAUGE_GEOMETRY.circumference, 9);
  });
});
