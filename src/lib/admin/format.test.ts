import { describe, expect, it } from 'vitest';
import { NOT_SET, formatDateFr, formatSiret, normalizeSiretInput } from './format';

describe('format', () => {
  it('formats a 14-digit SIRET in groups', () => {
    expect(formatSiret('12345678900012')).toBe('123 456 789 00012');
  });
  it('returns an em dash for empty values', () => {
    expect(formatSiret('')).toBe(NOT_SET);
    expect(formatSiret(null)).toBe(NOT_SET);
    expect(formatDateFr('')).toBe(NOT_SET);
    expect(formatDateFr('nope')).toBe(NOT_SET);
  });
  it('keeps malformed values as is', () => {
    expect(formatSiret('123')).toBe('123');
  });
  it('formats dates as JJ/MM/AAAA', () => {
    expect(formatDateFr('2026-03-05T10:00:00Z')).toBe('05/03/2026');
  });
  it('strips spaces and dots from pasted SIRET', () => {
    expect(normalizeSiretInput('123 456 789.00012')).toBe('12345678900012');
  });
});
