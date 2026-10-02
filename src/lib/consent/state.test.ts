import { describe, it, expect } from 'vitest';
import {
  serialiseConsentCookie,
  parseConsentCookie,
  consentStatus,
  needsPrompt,
  readConsentFromCookieHeader,
  type ConsentState,
} from './state';
import { CONSENT_VERSION, CONSENT_COOKIE } from './constants';

const ID = '123e4567-e89b-42d3-a456-426614174000';
const base: ConsentState = {
  version: CONSENT_VERSION,
  choice: 'accepted',
  id: ID,
  at: 1760000000000,
};

describe('consent cookie codec', () => {
  it('round-trips accepted and refused', () => {
    expect(parseConsentCookie(serialiseConsentCookie(base))).toEqual(base);
    const r = { ...base, choice: 'refused' as const };
    expect(parseConsentCookie(serialiseConsentCookie(r))).toEqual(r);
  });
  it('serialises as version~a|r~id~at', () => {
    expect(serialiseConsentCookie(base)).toBe(`${CONSENT_VERSION}~a~${ID}~1760000000000`);
  });
  it('rejects malformed values', () => {
    expect(parseConsentCookie(null)).toBeNull();
    expect(parseConsentCookie(undefined)).toBeNull();
    expect(parseConsentCookie('')).toBeNull();
    expect(parseConsentCookie(`${CONSENT_VERSION}~a~${ID}`)).toBeNull();
    expect(parseConsentCookie(`${CONSENT_VERSION}~a~not-a-uuid~1`)).toBeNull();
    expect(parseConsentCookie(`${CONSENT_VERSION}~a~${ID}~abc`)).toBeNull();
    expect(parseConsentCookie(`${CONSENT_VERSION}~x~${ID}~1`)).toBeNull();
    expect(parseConsentCookie(`${CONSENT_VERSION}~a~${ID}~1~extra`)).toBeNull();
  });
});

describe('consentStatus / needsPrompt', () => {
  it('pending for null and for other versions', () => {
    expect(consentStatus(null)).toBe('pending');
    expect(consentStatus({ ...base, version: 'old' })).toBe('pending');
    expect(needsPrompt(null)).toBe(true);
    expect(needsPrompt({ ...base, version: 'old' })).toBe(true);
  });
  it('returns the choice for the current version', () => {
    expect(consentStatus(base)).toBe('accepted');
    expect(consentStatus({ ...base, choice: 'refused' })).toBe('refused');
    expect(needsPrompt(base)).toBe(false);
  });
});

describe('readConsentFromCookieHeader', () => {
  const value = serialiseConsentCookie(base);
  it('finds the cookie among others', () => {
    const h = `a=1; ${CONSENT_COOKIE}=${encodeURIComponent(value)}; b=2`;
    expect(readConsentFromCookieHeader(h)).toEqual(base);
  });
  it('returns null when absent', () => {
    expect(readConsentFromCookieHeader('a=1; b=2')).toBeNull();
    expect(readConsentFromCookieHeader(null)).toBeNull();
  });
  it('does not match a cookie with a longer name', () => {
    expect(readConsentFromCookieHeader(`x_${CONSENT_COOKIE}=${value}`)).toBeNull();
  });
});
