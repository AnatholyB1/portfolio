import { describe, expect, it } from 'vitest';
import {
  ATTR_FT_COOKIE,
  ATTR_LT_COOKIE,
  ATTR_MAX_AGE_SECONDS,
  MAX_COOKIE_VALUE_BYTES,
  decodeTouch,
  encodeTouch,
  stripClickIds,
} from './cookie';
import type { Touch } from './touch';

const b64url = (o: unknown) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const sample: Touch = {
  params: { utm_source: 'google', gclid: 'AbC' },
  landing: '/services',
  referrer: 'https://www.google.com/search',
  at: 1700000000000,
};

describe('constants', () => {
  it('has expected values', () => {
    expect(ATTR_FT_COOKIE).toBe('sv_attr_ft');
    expect(ATTR_LT_COOKIE).toBe('sv_attr_lt');
    expect(ATTR_MAX_AGE_SECONDS).toBe(30 * 24 * 3600);
    expect(MAX_COOKIE_VALUE_BYTES).toBe(3800);
  });
});

describe('encode/decode', () => {
  it('round-trips', () => {
    expect(decodeTouch(encodeTouch(sample), { allowClickIds: true })).toEqual(sample);
  });

  it('returns null for malformed input', () => {
    expect(decodeTouch(undefined, { allowClickIds: true })).toBeNull();
    expect(decodeTouch('', { allowClickIds: true })).toBeNull();
    expect(decodeTouch('!!!not-base64!!!', { allowClickIds: true })).toBeNull();
    expect(decodeTouch(b64url('plain string'), { allowClickIds: true })).toBeNull();
    expect(decodeTouch(btoa('not json'), { allowClickIds: true })).toBeNull();
    expect(decodeTouch(b64url({ p: 1 }), { allowClickIds: true })).toBeNull();
  });

  it('re-validates: unknown keys and oversized values vanish', () => {
    const raw = b64url({
      p: { utm_source: 'ok', evil: 'x', utm_medium: 'a'.repeat(500) },
      l: '/',
      r: null,
      a: 5,
    });
    expect(decodeTouch(raw, { allowClickIds: true })?.params).toEqual({ utm_source: 'ok' });
  });

  it('strips click ids when consent is absent', () => {
    const t = decodeTouch(encodeTouch(sample), { allowClickIds: false });
    expect(t).not.toBeNull();
    expect(t!.params.gclid).toBeUndefined();
    expect(t!.params.fbclid).toBeUndefined();
    expect(t!.params.ttclid).toBeUndefined();
    expect(t!.params.utm_source).toBe('google');
  });

  it('sanitises landing and referrer', () => {
    const bad = b64url({ p: {}, l: 'http://evil', r: 'javascript:x', a: 1 });
    const t = decodeTouch(bad, { allowClickIds: true });
    expect(t?.landing).toBe('/');
    expect(t?.referrer).toBeNull();
    const long = b64url({ p: {}, l: '/' + 'a'.repeat(300), r: null, a: 1 });
    expect(decodeTouch(long, { allowClickIds: true })?.landing).toBe('/');
  });

  it('rejects non-finite at', () => {
    expect(decodeTouch(b64url({ p: {}, l: '/', r: null, a: 'x' }), { allowClickIds: true })).toBeNull();
  });

  it('worst case stays within the byte budget', () => {
    const worstCase: Touch = {
      params: {
        utm_source: 'é'.repeat(200),
        utm_medium: 'é'.repeat(200),
        utm_campaign: 'é'.repeat(200),
        utm_content: 'é'.repeat(200),
        utm_term: 'é'.repeat(200),
        gclid: 'é'.repeat(200),
        fbclid: 'é'.repeat(200),
        ttclid: 'é'.repeat(200),
      },
      landing: '/' + 'a'.repeat(199),
      referrer: 'https://example.com/' + 'a'.repeat(180),
      at: 1700000000000,
    };
    expect(new TextEncoder().encode(encodeTouch(worstCase)).length).toBeLessThanOrEqual(3800);
  });

  it('drops utm_term before others when oversized', () => {
    const big: Touch = {
      params: {
        utm_source: 'é'.repeat(200),
        utm_medium: 'é'.repeat(200),
        utm_campaign: 'é'.repeat(200),
        utm_content: 'é'.repeat(200),
        utm_term: 'é'.repeat(200),
        gclid: 'é'.repeat(200),
        fbclid: 'é'.repeat(200),
        ttclid: 'é'.repeat(200),
      },
      landing: '/',
      referrer: null,
      at: 1,
    };
    const t = decodeTouch(encodeTouch(big), { allowClickIds: true });
    expect(t?.params.utm_term).toBeUndefined();
  });
});

describe('raw and eid fields (phase 19)', () => {
  const eid = '3f2b8c1e-1a2b-4c3d-8e4f-123456789abc';
  const withExtras: Touch = {
    params: { utm_source: 'meta' },
    landing: '/',
    referrer: null,
    at: 5,
    raw: { utm_source: 'Facebook' },
    eid,
  };
  const opts = { allowClickIds: true };

  it('round-trips raw and eid', () => {
    expect(decodeTouch(encodeTouch(withExtras), opts)).toEqual(withExtras);
  });

  it('writes no w or e key when absent', () => {
    const b64 = encodeTouch(sample).replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    expect(Object.keys(json).sort()).toEqual(['a', 'l', 'p', 'r']);
  });

  it('validates w shape and drops other keys', () => {
    const c = b64url({ p: { utm_source: 'meta' }, l: '/', r: null, a: 1, w: { utm_source: 'FB', evil: 'x', utm_medium: 3 } });
    expect(decodeTouch(c, opts)?.raw).toEqual({ utm_source: 'FB' });
    const arr = b64url({ p: { utm_source: 'meta' }, l: '/', r: null, a: 1, w: ['x'] });
    expect(decodeTouch(arr, opts)?.raw).toBeUndefined();
    const long = b64url({ p: { utm_source: 'meta' }, l: '/', r: null, a: 1, w: { utm_source: 'x'.repeat(201) } });
    expect(decodeTouch(long, opts)?.raw).toBeUndefined();
  });

  it('accepts only a v4 UUID for e', () => {
    const ok = b64url({ p: { utm_source: 'meta' }, l: '/', r: null, a: 1, e: eid });
    expect(decodeTouch(ok, opts)?.eid).toBe(eid);
    for (const e of ['not-a-uuid', '3f2b8c1e-1a2b-1c3d-8e4f-123456789abc', 42]) {
      const c = b64url({ p: { utm_source: 'meta' }, l: '/', r: null, a: 1, e });
      expect(decodeTouch(c, opts)?.eid).toBeUndefined();
    }
  });

  it('recomputes raw for a legacy cookie with an alias', () => {
    const c = b64url({ p: { utm_source: 'facebook' }, l: '/', r: null, a: 1 });
    const t = decodeTouch(c, opts);
    expect(t?.params.utm_source).toBe('meta');
    expect(t?.raw).toEqual({ utm_source: 'facebook' });
  });

  it('size guard drops raw before utm_term', () => {
    const e = 'é'.repeat(200);
    const mk = (extras: Partial<Touch>): Touch => ({
      params: {
        utm_source: 'meta',
        utm_term: e,
        utm_content: e,
        utm_campaign: e,
        gclid: 'g'.repeat(200),
        fbclid: 'f'.repeat(200),
        ttclid: 't'.repeat(200),
      },
      landing: '/',
      referrer: 'https://x.io/' + 'r'.repeat(150),
      at: 1,
      ...extras,
    });
    const size = (s: string) => new TextEncoder().encode(s).length;
    const bare = size(encodeTouch(mk({})));
    expect(bare).toBeLessThanOrEqual(MAX_COOKIE_VALUE_BYTES);
    // Raw of ~400 bytes pushes the cookie over the limit; it must go first.
    const heavy = mk({ raw: { utm_source: e, utm_medium: e }, eid });
    const full = JSON.stringify({ ...heavy });
    expect(size(btoa(unescape(encodeURIComponent(full))))).toBeGreaterThan(MAX_COOKIE_VALUE_BYTES);
    const dec = decodeTouch(encodeTouch(heavy), opts);
    expect(size(encodeTouch(heavy))).toBeLessThanOrEqual(MAX_COOKIE_VALUE_BYTES);
    expect(dec?.params.utm_term).toBe(e);
    expect(dec?.params.utm_content).toBe(e);
    expect(dec?.raw).toBeUndefined();
  });
});

describe('stripClickIds', () => {
  it('removes click ids only', () => {
    expect(stripClickIds(sample).params).toEqual({ utm_source: 'google' });
  });
});
