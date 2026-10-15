import { describe, expect, it } from 'vitest';
import { maskEmail } from './mask';

describe('maskEmail (shared)', () => {
  it('masks local part and domain name', () => {
    expect(maskEmail('alice@dupont.fr')).toBe('a***@d***.fr');
    expect(maskEmail('bad')).toBe('***');
    expect(maskEmail(null)).toBe('***');
  });
});
