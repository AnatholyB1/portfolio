import { describe, expect, it } from 'vitest';
import { formatEuros, NBSP } from '@/lib/documents/money';
import { formatDateFr, formatMonthFr, formatShareBp, formatSignedEuros } from './format';

describe('formatSignedEuros', () => {
  it('uses U+2212 for negatives', () => {
    expect(formatSignedEuros(-123450)).toBe(`−1${NBSP}234,50${NBSP}€`);
  });
  it('matches formatEuros for positives and zero', () => {
    expect(formatSignedEuros(5000)).toBe(formatEuros(5000));
    expect(formatSignedEuros(0)).toBe(formatEuros(0));
  });
});

describe('formatShareBp', () => {
  it('formats basis points with integer math', () => {
    expect(formatShareBp(1250)).toBe(`12,5${NBSP}%`);
    expect(formatShareBp(10000)).toBe(`100${NBSP}%`);
    expect(formatShareBp(0)).toBe(`0${NBSP}%`);
  });
});

describe('dates', () => {
  it('formats a civil date without day shift', () => {
    expect(formatDateFr('2026-10-07')).toBe('07/10/2026');
  });
  it('formats a month short', () => {
    expect(formatMonthFr('2026-10')).toBe('oct. 2026');
  });
});
