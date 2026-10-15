import { describe, expect, it } from 'vitest';
import { maskEmail, maskPhone } from './mask';

describe('maskEmail (shared)', () => {
  it('masks local part and domain name', () => {
    expect(maskEmail('alice@dupont.fr')).toBe('a***@d***.fr');
    expect(maskEmail('bad')).toBe('***');
    expect(maskEmail(null)).toBe('***');
  });
});

describe('maskPhone', () => {
  it('keeps only the last two digits', () => {
    expect(maskPhone('06 12 34 56 78')).toBe('***78');
    expect(maskPhone('+33 6 12 34 56 78')).toBe('***78');
  });
  it('is safe on short or non-string input and never echoes the input', () => {
    for (const v of ['', '12', 'abc', null, undefined, 42]) {
      const out = maskPhone(v);
      expect(out).toBe('***');
    }
  });
});
