import { describe, expect, it } from 'vitest';
import { encodeTouch } from '@/lib/attribution/cookie';
import type { Touch } from '@/lib/attribution/touch';
import { CONSENT_VERSION } from '@/lib/consent/constants';
import { serialiseConsentCookie } from '@/lib/consent/state';
import { readAttribution } from './requestAttribution';

const touch = (extra: Record<string, string> = {}): Touch => ({
  params: { utm_source: 'google', utm_medium: 'cpc', ...extra },
  landing: '/',
  referrer: null,
  at: 1000,
});

const ID = '123e4567-e89b-42d3-a456-426614174000';
const consentCookie = (choice: 'accepted' | 'refused') =>
  `sv_consent=${encodeURIComponent(serialiseConsentCookie({ version: CONSENT_VERSION, choice, id: ID, at: 5 }))}`;

describe('readAttribution', () => {
  it('returns direct/pending for no cookies', () => {
    const r = readAttribution(null);
    expect(r.firstTouch).toBeNull();
    expect(r.lastTouch).toBeNull();
    expect(r.source).toEqual({ source: 'direct', medium: '(none)', campaign: null, kind: 'direct' });
    expect(r.consent).toBeNull();
    expect(r.consentStatus).toBe('pending');
  });

  it('strips click ids without consent', () => {
    const h = `sv_attr_ft=${encodeTouch(touch({ gclid: 'abc' }))}; sv_attr_lt=${encodeTouch(touch({ gclid: 'abc' }))}`;
    const r = readAttribution(h);
    expect(r.firstTouch?.params.gclid).toBeUndefined();
    expect(r.lastTouch?.params.gclid).toBeUndefined();
    expect(r.source.source).toBe('google');
  });

  it('keeps click ids with accepted consent', () => {
    const h = `sv_attr_ft=${encodeTouch(touch({ gclid: 'abc' }))}; sv_attr_lt=${encodeTouch(touch({ gclid: 'abc' }))}; ${consentCookie('accepted')}`;
    const r = readAttribution(h);
    expect(r.firstTouch?.params.gclid).toBe('abc');
    expect(r.consentStatus).toBe('accepted');
    expect(r.consent?.choice).toBe('accepted');
  });

  it('strips click ids when refused', () => {
    const h = `sv_attr_lt=${encodeTouch(touch({ gclid: 'abc' }))}; ${consentCookie('refused')}`;
    const r = readAttribution(h);
    expect(r.lastTouch?.params.gclid).toBeUndefined();
    expect(r.consentStatus).toBe('refused');
  });

  it('ignores a forged lt and falls back to ft for source', () => {
    const h = `sv_attr_ft=${encodeTouch(touch())}; sv_attr_lt=garbage`;
    const r = readAttribution(h);
    expect(r.lastTouch).toBeNull();
    expect(r.firstTouch).not.toBeNull();
    expect(r.source.source).toBe('google');
  });
});
