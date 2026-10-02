import { describe, expect, it } from 'vitest';
import { normaliseEmail, normalisePhone } from './normalise';

describe('normaliseEmail', () => {
  it('trims and lowercases only', () => {
    expect(normaliseEmail('  Anatholyb+SV-Test@Gmail.com ')).toBe('anatholyb+sv-test@gmail.com');
  });
  it('keeps dots', () => {
    expect(normaliseEmail('a.b@x.fr')).toBe('a.b@x.fr');
  });
});

describe('normalisePhone', () => {
  it('maps FR national numbers to +33', () => {
    expect(normalisePhone('06 12 34 56 78')).toBe('+33612345678');
  });
  it('handles 00 prefix', () => {
    expect(normalisePhone('0033612345678')).toBe('+33612345678');
  });
  it('handles + prefix with spaces', () => {
    expect(normalisePhone('+33 6 12 34 56 78')).toBe('+33612345678');
  });
  it('rejects junk', () => {
    expect(normalisePhone('abc')).toBeNull();
    expect(normalisePhone(undefined)).toBeNull();
    expect(normalisePhone(null)).toBeNull();
    expect(normalisePhone('12')).toBeNull();
  });
});
