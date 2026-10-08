import { describe, expect, it } from 'vitest';
import {
  classifyArrival,
  classifyChannel,
  enrichFirstTouchClickIds,
  nextTouches,
  type ArrivalInput,
  type Touch,
} from './touch';

const base: ArrivalInput = {
  method: 'GET',
  secFetchDest: 'document',
  secFetchMode: 'navigate',
  userAgent: 'Mozilla/5.0 Chrome/120',
  host: 'sevalys.com',
  canonicalHost: 'sevalys.com',
  hasAuthCookie: false,
  params: { utm_source: 'google' },
  referrer: null,
};

const touch = (over: Partial<Touch> = {}): Touch => ({
  params: {},
  landing: '/',
  referrer: null,
  at: 1000,
  ...over,
});

describe('classifyArrival', () => {
  it('arrival for document navigation with params', () => {
    expect(classifyArrival(base)).toBe('arrival');
  });
  it('skips POST', () => {
    expect(classifyArrival({ ...base, method: 'POST' })).toBe('skip');
  });
  it('skips RSC / prefetch (dest empty)', () => {
    expect(classifyArrival({ ...base, secFetchDest: 'empty' })).toBe('skip');
  });
  it('skips when no params and no referrer', () => {
    expect(classifyArrival({ ...base, params: {} })).toBe('skip');
  });
  it('arrival on external referrer only', () => {
    expect(classifyArrival({ ...base, params: {}, referrer: 'https://www.google.com/search' })).toBe('arrival');
  });
  it.each([
    'Googlebot/2.1', 'bingbot', 'facebookexternalhit/1.1', 'Slackbot', 'Twitterbot', 'LinkedInBot',
    'WhatsApp/2', 'Discordbot', 'HeadlessChrome', 'Chrome-Lighthouse', 'vercel-screenshot',
  ])('skips bot UA %s', (ua) => {
    expect(classifyArrival({ ...base, userAgent: ua })).toBe('skip');
  });
  it('skips non canonical host (preview)', () => {
    expect(classifyArrival({ ...base, host: 'x-git-abc.vercel.app' })).toBe('skip');
  });
  it('skips when auth cookie present', () => {
    expect(classifyArrival({ ...base, hasAuthCookie: true })).toBe('skip');
  });
  it('arrival when Sec-Fetch headers are missing', () => {
    expect(classifyArrival({ ...base, secFetchDest: null, secFetchMode: null })).toBe('arrival');
  });
});

describe('classifyChannel', () => {
  it('utm touch', () => {
    expect(classifyChannel(touch({ params: { utm_source: 'newsletter', utm_campaign: 'oct' } }))).toEqual({
      source: 'newsletter', medium: '(none)', campaign: 'oct', kind: 'touch',
    });
  });
  it('organic search', () => {
    expect(classifyChannel(touch({ referrer: 'https://www.google.com/search' }))).toMatchObject({
      source: 'google.com', medium: 'organic', kind: 'touch',
    });
  });
  it('referral', () => {
    expect(classifyChannel(touch({ referrer: 'https://blog.example.org/post' }))).toMatchObject({
      source: 'blog.example.org', medium: 'referral',
    });
  });
  it('direct', () => {
    expect(classifyChannel(null)).toEqual({ source: 'direct', medium: '(none)', campaign: null, kind: 'direct' });
  });
});

describe('nextTouches', () => {
  it('sets ft when absent', () => {
    const a = touch({ at: 5 });
    const r = nextTouches({ ft: null, lt: null }, a);
    expect(r.ft).toBe(a);
    expect(r.lt).toBe(a);
    expect(r.ftChanged).toBe(true);
  });
  it('keeps existing ft and replaces lt', () => {
    const ft = touch({ at: 1 });
    const a = touch({ at: 9 });
    const r = nextTouches({ ft, lt: touch({ at: 2 }) }, a);
    expect(r.ft).toBe(ft);
    expect(r.lt).toBe(a);
    expect(r.ftChanged).toBe(false);
  });
});

describe('enrichFirstTouchClickIds', () => {
  const ft = touch({ params: { utm_source: 'g' }, referrer: 'https://x.com/a', at: 42 });
  it('adds click id keeping at and referrer', () => {
    const r = enrichFirstTouchClickIds(ft, touch({ params: { utm_source: 'g', gclid: 'AbC' }, at: 99 }));
    expect(r).toEqual({ params: { utm_source: 'g', gclid: 'AbC' }, landing: '/', referrer: 'https://x.com/a', at: 42 });
  });
  it('null when ft already has click id', () => {
    expect(enrichFirstTouchClickIds(touch({ params: { utm_source: 'g', gclid: 'z' } }), touch({ params: { utm_source: 'g', gclid: 'AbC' } }))).toBeNull();
  });
  it('null when arrival has no click id', () => {
    expect(enrichFirstTouchClickIds(ft, touch({ params: { utm_source: 'g' } }))).toBeNull();
  });
  it('null when utm differs', () => {
    expect(enrichFirstTouchClickIds(ft, touch({ params: { utm_source: 'h', gclid: 'A' } }))).toBeNull();
  });
  it('null when landing differs', () => {
    expect(enrichFirstTouchClickIds(ft, touch({ params: { utm_source: 'g', gclid: 'A' }, landing: '/x' }))).toBeNull();
  });
});

describe('phase 19 canonical flow', () => {
  it('classifyChannel returns canonical source for an alias touch', async () => {
    const { parseAttrParams } = await import('./params');
    const params = parseAttrParams(new URLSearchParams('utm_source=fb&utm_medium=paid_social'), { allowClickIds: true });
    const c = classifyChannel({ params, landing: '/', referrer: null, at: 1 });
    expect(c.source).toBe('meta');
  });
  it('enrichFirstTouchClickIds keeps raw and eid', () => {
    const ft: Touch = {
      params: { utm_source: 'meta' },
      landing: '/',
      referrer: null,
      at: 1,
      raw: { utm_source: 'Facebook' },
      eid: '3f2b8c1e-1a2b-4c3d-8e4f-123456789abc',
    };
    const r = enrichFirstTouchClickIds(ft, { params: { utm_source: 'meta', gclid: 'x' }, landing: '/', referrer: null, at: 2 });
    expect(r?.raw).toEqual({ utm_source: 'Facebook' });
    expect(r?.eid).toBe(ft.eid);
  });
});
