import { describe, expect, it } from 'vitest';
import {
  ALLOWED_KEYS,
  CLICK_ID_KEYS,
  parseAttrParams,
  parseReferrer,
} from './params';

const qs = (s: string) => new URLSearchParams(s);

describe('parseAttrParams', () => {
  it('exposes the 8 whitelisted keys and the 3 click ids', () => {
    expect(ALLOWED_KEYS).toHaveLength(8);
    expect([...CLICK_ID_KEYS]).toEqual(['gclid', 'fbclid', 'ttclid']);
  });

  it('lowercases utm values', () => {
    expect(parseAttrParams(qs('utm_source=Google&utm_medium=CPC'), { allowClickIds: true })).toEqual({
      utm_source: 'google',
      utm_medium: 'cpc',
    });
  });

  it('keeps click id case verbatim while lowercasing utm_source', () => {
    expect(parseAttrParams(qs('gclid=AbC-12_x&utm_source=G'), { allowClickIds: true })).toEqual({
      gclid: 'AbC-12_x',
      utm_source: 'g',
    });
  });

  it('ignores unknown keys', () => {
    expect(parseAttrParams(qs('foo=1&utm_source=x'), { allowClickIds: true })).toEqual({ utm_source: 'x' });
  });

  it('drops a 201-char value and keeps a 200-char value', () => {
    expect(parseAttrParams(qs(`utm_source=${'a'.repeat(201)}`), { allowClickIds: true })).toEqual({});
    const kept = parseAttrParams(qs(`utm_source=${'a'.repeat(200)}`), { allowClickIds: true });
    expect(kept.utm_source).toHaveLength(200);
  });

  it('strips control characters then trims; empty becomes absent', () => {
    const s = new URLSearchParams();
    s.set('utm_source', '  a\u0001b\u007f  ');
    s.set('utm_medium', ' \u0002 ');
    expect(parseAttrParams(s, { allowClickIds: true })).toEqual({ utm_source: 'ab' });
  });

  it('drops click ids when consent is not given', () => {
    expect(parseAttrParams(qs('gclid=abc'), { allowClickIds: false })).toEqual({});
    expect(parseAttrParams(qs('gclid=abc'), { allowClickIds: true })).toEqual({ gclid: 'abc' });
  });

  it('keeps the first occurrence of a repeated key', () => {
    expect(parseAttrParams(qs('utm_source=a&utm_source=b'), { allowClickIds: true })).toEqual({ utm_source: 'a' });
  });
});

describe('parseReferrer', () => {
  it('returns null for null', () => {
    expect(parseReferrer(null, 'sevalys.com')).toBeNull();
  });

  it('keeps origin + path without query, lowercased', () => {
    expect(parseReferrer('https://www.Google.com/search?q=x', 'sevalys.com')).toBe('https://www.google.com/search');
  });

  it('ignores own host and subdomains', () => {
    expect(parseReferrer('https://sevalys.com/a', 'sevalys.com')).toBeNull();
    expect(parseReferrer('https://www.sevalys.com/a', 'sevalys.com')).toBeNull();
  });

  it('ignores stripe checkout and supabase hosts', () => {
    expect(parseReferrer('https://checkout.stripe.com/x', 'sevalys.com')).toBeNull();
    expect(parseReferrer('https://abc.supabase.co/auth/v1/verify', 'sevalys.com')).toBeNull();
  });

  it('returns null on invalid URL', () => {
    expect(parseReferrer('not a url', 'sevalys.com')).toBeNull();
  });

  it('caps result at 200 chars', () => {
    const r = parseReferrer(`https://example.com/${'a'.repeat(400)}`, 'sevalys.com');
    expect(r).not.toBeNull();
    expect(r!.length).toBeLessThanOrEqual(200);
  });
});
