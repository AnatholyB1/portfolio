import { describe, expect, it } from 'vitest';
import {
  isSpamSubmission,
  prospectSchema,
  SPAM_MIN_ELAPSED_MS,
} from './prospects-schema';

const validPayload = {
  nom: 'Jean Dupont',
  email: 'jean.dupont@example.com',
  telephone: '0612345678',
  reponsesDiagnostic: [{ questionId: 'q1', value: 'oui' }],
  servicesRecommandes: ['Landing Page', 'Branding'],
  consentementRgpd: true,
  formRenderedAt: Date.now() - 5000,
};

describe('prospectSchema', () => {
  it('accepts a complete valid payload', () => {
    const result = prospectSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects a payload missing telephone (D-01)', () => {
    const { telephone, ...rest } = validPayload;
    const result = prospectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects a payload missing nom', () => {
    const { nom, ...rest } = validPayload;
    const result = prospectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects a payload missing email', () => {
    const { email, ...rest } = validPayload;
    const result = prospectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = prospectSchema.safeParse({ ...validPayload, email: 'pas-un-email' });
    expect(result.success).toBe(false);
  });

  it('rejects consentementRgpd: false', () => {
    const result = prospectSchema.safeParse({ ...validPayload, consentementRgpd: false });
    expect(result.success).toBe(false);
  });

  it('rejects a missing consentementRgpd', () => {
    const { consentementRgpd, ...rest } = validPayload;
    const result = prospectSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects servicesRecommandes with 1 entry (below the 2..4 bound)', () => {
    const result = prospectSchema.safeParse({
      ...validPayload,
      servicesRecommandes: ['Landing Page'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects servicesRecommandes with 5 entries (above the 2..4 bound)', () => {
    const result = prospectSchema.safeParse({
      ...validPayload,
      servicesRecommandes: ['A', 'B', 'C', 'D', 'E'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty reponsesDiagnostic array (D-03)', () => {
    const result = prospectSchema.safeParse({ ...validPayload, reponsesDiagnostic: [] });
    expect(result.success).toBe(false);
  });

  it('accepts a reponsesDiagnostic entry whose value is a string', () => {
    const result = prospectSchema.safeParse({
      ...validPayload,
      reponsesDiagnostic: [{ questionId: 'q1', value: 'oui' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a reponsesDiagnostic entry whose value is a string array', () => {
    const result = prospectSchema.safeParse({
      ...validPayload,
      reponsesDiagnostic: [{ questionId: 'q1', value: ['oui', 'non'] }],
    });
    expect(result.success).toBe(true);
  });

  it('drops unexpected extra fields from the parsed output (mass-assignment guard, D-02)', () => {
    const result = prospectSchema.safeParse({
      ...validPayload,
      entreprise: 'Acme SARL',
      secteur: 'restauration',
      isAdmin: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('entreprise' in result.data).toBe(false);
      expect('secteur' in result.data).toBe(false);
      expect('isAdmin' in result.data).toBe(false);
    }
  });
});

describe('isSpamSubmission', () => {
  it('returns true when the honeypot field is filled', () => {
    const now = Date.now();
    const result = isSpamSubmission(
      { website: 'http://spam.tld', formRenderedAt: now - 10000 },
      now
    );
    expect(result).toBe(true);
  });

  it('returns false when the honeypot field is an empty string', () => {
    const now = Date.now();
    const result = isSpamSubmission({ website: '', formRenderedAt: now - 10000 }, now);
    expect(result).toBe(false);
  });

  it('returns true when submitted too fast (less than SPAM_MIN_ELAPSED_MS)', () => {
    const now = Date.now();
    const result = isSpamSubmission({ formRenderedAt: now - 500 }, now);
    expect(result).toBe(true);
  });

  it('returns false at exactly the SPAM_MIN_ELAPSED_MS boundary (inclusive-pass)', () => {
    const now = Date.now();
    const result = isSpamSubmission({ formRenderedAt: now - SPAM_MIN_ELAPSED_MS }, now);
    expect(result).toBe(false);
  });

  it('returns false for a null body without throwing', () => {
    expect(() => isSpamSubmission(null)).not.toThrow();
    expect(isSpamSubmission(null)).toBe(false);
  });

  it('returns false for a non-object body without throwing', () => {
    expect(() => isSpamSubmission('not an object')).not.toThrow();
    expect(isSpamSubmission('not an object')).toBe(false);
  });

  it('accepts an injected now argument for deterministic timing tests', () => {
    const fixedNow = 1_700_000_000_000;
    const result = isSpamSubmission({ formRenderedAt: fixedNow - 100 }, fixedNow);
    expect(result).toBe(true);
  });
});
