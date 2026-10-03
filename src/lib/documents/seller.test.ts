import { describe, it, expect } from 'vitest';
import {
  SELLER_V1,
  SELLER_PLACEHOLDER,
  VAT_FRANCHISE_MENTION,
  RECOVERY_INDEMNITY_TEXT,
  DISCOUNT_TEXT,
  latePenaltyText,
  isSellerConfigured,
  sellerProblems,
} from './seller';
import type { SellerIdentity } from './types';

function luhnSiret(base13: string): string {
  for (let d = 0; d < 10; d++) {
    const s = base13 + String(d);
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let n = Number(s[13 - i]);
      if (i % 2 === 1) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
    }
    if (sum % 10 === 0) return s;
  }
  throw new Error('unreachable');
}

const VALID: SellerIdentity = {
  ...SELLER_V1,
  configured: true,
  legalName: 'Anatholy Test',
  legalForm: 'Entrepreneur individuel',
  siret: luhnSiret('1234567890123'),
  address: { line: '1 rue de Test', postalCode: '75001', city: 'Paris' },
  registration: 'RM 123 456 789',
  iban: 'FR1420041010050500013M02606',
  bic: 'PSSTFRPPSCE',
};

describe('SELLER_V1', () => {
  it('is configured with the owner-supplied identity and no placeholder left', () => {
    expect(SELLER_V1.configured).toBe(true);
    expect(SELLER_V1.siret).toBe('90098846000011');
    expect(JSON.stringify(SELLER_V1)).not.toContain(SELLER_PLACEHOLDER);
    expect(SELLER_V1.vatRegime).toBe('franchise');
    expect(SELLER_V1.vatNumber).toBeNull();
    expect(VAT_FRANCHISE_MENTION).toBe('TVA non applicable, art. 293 B du CGI');
  });
  it('has no validation problem and unblocks issuance', () => {
    expect(sellerProblems(SELLER_V1)).toEqual([]);
    expect(isSellerConfigured(SELLER_V1)).toBe(true);
    expect(isSellerConfigured()).toBe(true);
  });
});

describe('sellerProblems', () => {
  it('accepts a fully valid seller', () => {
    expect(sellerProblems(VALID)).toEqual([]);
    expect(isSellerConfigured(VALID)).toBe(true);
  });
  it('is not configured when the flag is false even with valid values', () => {
    expect(isSellerConfigured({ ...VALID, configured: false })).toBe(false);
  });
  it('flags a bad SIRET (length and Luhn)', () => {
    expect(sellerProblems({ ...VALID, siret: '1234' }).length).toBeGreaterThan(0);
    const bad = VALID.siret.slice(0, 13) + String((Number(VALID.siret[13]) + 1) % 10);
    expect(sellerProblems({ ...VALID, siret: bad }).length).toBeGreaterThan(0);
  });
  it('flags a bad IBAN', () => {
    expect(sellerProblems({ ...VALID, iban: 'FR1420041010050500013M02607' }).length).toBeGreaterThan(0);
  });
  it('flags a VAT number under franchise regime', () => {
    expect(sellerProblems({ ...VALID, vatNumber: 'FR12345678901' }).length).toBeGreaterThan(0);
  });
  it('flags payment terms outside 1..60', () => {
    expect(sellerProblems({ ...VALID, paymentTermsDays: 0 }).length).toBeGreaterThan(0);
    expect(sellerProblems({ ...VALID, paymentTermsDays: 61 }).length).toBeGreaterThan(0);
  });
});

describe('legal texts', () => {
  it('has the mandatory mentions', () => {
    expect(RECOVERY_INDEMNITY_TEXT).toBe('Indemnité forfaitaire pour frais de recouvrement : 40 €');
    expect(DISCOUNT_TEXT).toBe('Escompte pour paiement anticipé : néant');
    expect(latePenaltyText(SELLER_V1)).toBe(`Pénalités de retard : ${SELLER_V1.latePenaltyRate}`);
  });
});
