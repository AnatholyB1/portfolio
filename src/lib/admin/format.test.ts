import { describe, expect, it } from 'vitest';
import { EM_DASH, formatDateFr, formatSiret, normalizeSiretInput } from './format';

describe('format', () => {
  it('formats a 14-digit SIRET in groups', () => {
    expect(formatSiret('12345678900012')).toBe('123 456 789 00012');
  });
  it('returns an em dash for empty values', () => {
    expect(formatSiret('')).toBe(EM_DASH);
    expect(formatSiret(null)).toBe(EM_DASH);
    expect(formatDateFr('')).toBe(EM_DASH);
    expect(formatDateFr('nope')).toBe(EM_DASH);
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
