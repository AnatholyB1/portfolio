import { describe, expect, it } from 'vitest';
import { services } from '@/data/services';
import { OFFER_SLUGS } from './offers';
import {
  blockCompletion,
  isOnboardingComplete,
  isValidFrVat,
  projetSchema,
  type OnboardingRow,
} from './onboardingSchema';

const empty: OnboardingRow = {
  companyConfirmedAt: null,
  signatoryName: null,
  signatoryRole: null,
  projectContactName: null,
  projectContactEmail: null,
  projectContactPhone: null,
  billingSameAsCompany: true,
  billingAddress: null,
  vatStatus: null,
  vatNumber: null,
  existingSiteUrl: null,
  socialLinks: [],
  projectGoal: null,
};

const complete: OnboardingRow = {
  ...empty,
  companyConfirmedAt: '2026-10-03T10:00:00Z',
  signatoryName: 'Jeanne Martin',
  signatoryRole: 'Gérante',
  vatStatus: 'not_subject',
};

describe('offers', () => {
  it('matches services.ts slugs', () => {
    expect([...OFFER_SLUGS]).toEqual(services.map((s) => s.slug));
  });
});

describe('isValidFrVat', () => {
  it('validates FR numbers', () => {
    expect(isValidFrVat('FR 12 345678901')).toBe(true);
    expect(isValidFrVat('FR1234')).toBe(false);
    expect(isValidFrVat('DE123456789')).toBe(false);
  });
});

describe('isOnboardingComplete', () => {
  it('false on empty row', () => expect(isOnboardingComplete(empty)).toBe(false));
  it('true when complete', () => expect(isOnboardingComplete(complete)).toBe(true));
  it('false with incomplete billing address', () => {
    expect(
      isOnboardingComplete({
        ...complete,
        billingSameAsCompany: false,
        billingAddress: { adresse: '1 rue A', code_postal: '', commune: 'Tours' },
      }),
    ).toBe(false);
  });
  it('true with full billing address', () => {
    expect(
      isOnboardingComplete({
        ...complete,
        billingSameAsCompany: false,
        billingAddress: { adresse: '1 rue A', code_postal: '37000', commune: 'Tours' },
      }),
    ).toBe(true);
  });
  it('false with invalid VAT number', () => {
    expect(isOnboardingComplete({ ...complete, vatStatus: 'number', vatNumber: 'FR12' })).toBe(false);
  });
  it('true with valid VAT number', () => {
    expect(isOnboardingComplete({ ...complete, vatStatus: 'number', vatNumber: 'FR12345678901' })).toBe(true);
  });
});

describe('blockCompletion', () => {
  it('contact complete when empty and signataire complete', () => {
    expect(blockCompletion(complete).contact).toBe(true);
    expect(blockCompletion(empty).contact).toBe(false);
  });
  it('projet needs goal', () => {
    expect(blockCompletion(complete).projet).toBe(false);
    expect(blockCompletion({ ...complete, projectGoal: 'Un site' }).projet).toBe(true);
  });
});

describe('projetSchema', () => {
  it('rejects non-https URLs', () => {
    expect(projetSchema.safeParse({ existingSiteUrl: 'http://x.fr', socialLinks: [], projectGoal: '' }).success).toBe(false);
    expect(projetSchema.safeParse({ existingSiteUrl: 'javascript:alert(1)', socialLinks: [], projectGoal: '' }).success).toBe(false);
  });
  it('accepts https', () => {
    expect(projetSchema.safeParse({ existingSiteUrl: 'https://x.fr', socialLinks: [], projectGoal: '' }).success).toBe(true);
  });
  it('rejects 5 social links', () => {
    const links = Array.from({ length: 5 }, (_, i) => `https://x.fr/${i}`);
    expect(projetSchema.safeParse({ socialLinks: links, projectGoal: '' }).success).toBe(false);
  });
});
