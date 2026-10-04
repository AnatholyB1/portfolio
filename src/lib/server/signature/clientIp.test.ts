import { describe, it, expect } from 'vitest';
import { requestIp } from './clientIp';

describe('requestIp', () => {
  it('takes the first x-forwarded-for entry', () => {
    expect(requestIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
  });
  it('keeps IPv6', () => {
    expect(requestIp(new Headers({ 'x-forwarded-for': '2001:db8::1' }))).toBe('2001:db8::1');
  });
  it('rejects invalid values', () => {
    expect(requestIp(new Headers({ 'x-forwarded-for': 'not-an-ip' }))).toBeNull();
  });
  it('returns null when missing', () => {
    expect(requestIp(new Headers())).toBeNull();
  });
  it('rejects values longer than 45 chars', () => {
    expect(requestIp(new Headers({ 'x-forwarded-for': '1'.repeat(46) }))).toBeNull();
  });
});
