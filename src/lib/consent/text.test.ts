import { describe, it, expect } from 'vitest';
import { CONSENT_TEXT, CONSENT_TEXT_VERSION } from './text';
import { CONSENT_VERSION } from './constants';

const PRICE = /€|฿|\bprix\b|\btarifs?\b|\bprice\b/i;

describe('consent text', () => {
  it('is tied to CONSENT_VERSION', () => {
    expect(CONSENT_TEXT_VERSION).toBe(CONSENT_VERSION);
  });
  for (const lang of ['fr', 'en', 'th'] as const) {
    it(`${lang}: all strings non-empty and price-free`, () => {
      for (const [k, v] of Object.entries(CONSENT_TEXT[lang])) {
        expect(v.trim().length, `${lang}.${k}`).toBeGreaterThan(0);
        expect(PRICE.test(v), `${lang}.${k}`).toBe(false);
      }
    });
  }
  it('FR and EN buttons', () => {
    expect(CONSENT_TEXT.fr.accept).toBe('Accepter');
    expect(CONSENT_TEXT.fr.refuse).toBe('Refuser');
    expect(CONSENT_TEXT.en.accept).toBe('Accept');
    expect(CONSENT_TEXT.en.refuse).toBe('Refuse');
  });
});
