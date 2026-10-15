import { describe, expect, it } from 'vitest';
import { maskEmail, maskIp, maskName, maskPhone } from './mask';

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

describe('maskIp', () => {
  it('keeps the first two octets of an IPv4 address', () => {
    expect(maskIp('203.0.113.77')).toBe('203.0.x.x');
    expect(maskIp(' 10.1.2.3 ')).toBe('10.1.x.x');
  });
  it('keeps the /48 of an IPv6 address', () => {
    expect(maskIp('2001:db8:abcd:12:3456:789a:bcde:f012')).toBe('2001:db8:abcd::/48');
    expect(maskIp('2001:db8:abcd::1')).toBe('2001:db8:abcd::/48');
    expect(maskIp('2001:db8::1')).toBe('2001:db8::/48');
  });
  it('masks the IPv4 part of mapped addresses', () => {
    expect(maskIp('::ffff:203.0.113.77')).toBe('203.0.x.x');
  });
  it('is safe on null, junk and never echoes the input', () => {
    for (const v of [null, undefined, '', 'not-an-ip', '999.1.1.1.1', 42]) expect(maskIp(v)).toBeNull();
  });
});

describe('maskName', () => {
  it('reduces a name to first and last initials', () => {
    expect(maskName('Jean Dupont')).toBe('J. D.');
    expect(maskName('Jean-Pierre de la Fontaine')).toBe('J. F.');
    expect(maskName('  Marie  ')).toBe('M.');
    expect(maskName('Élodie Durand')).toBe('É. D.');
  });
  it('returns null for blanks and non-strings', () => {
    for (const v of ['', '   ', null, undefined, 3]) expect(maskName(v)).toBeNull();
  });
});
