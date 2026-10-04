import { describe, expect, it } from 'vitest';
import { PRESENTATION_CONSENT } from './consent';
import { PROJECT_COPY } from './copy';
import { STEPS } from './steps';

const PRICE = /€|\beuros?\b|\d+\s?(€|EUR)|\bprix\b|\btarifs?\b/i;

function collect(v: unknown, out: string[]): void {
  if (typeof v === 'string') out.push(v);
  else if (typeof v === 'function') out.push(String((v as (...a: unknown[]) => unknown)('Exemple', 3, '3 octobre 2026')));
  else if (Array.isArray(v)) v.forEach((x) => collect(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => collect(x, out));
}

describe('PRESENTATION_CONSENT', () => {
  it('is provisional and versioned', () => {
    expect(PRESENTATION_CONSENT.provisional).toBe(true);
    expect(PRESENTATION_CONSENT.version).toBe('2026-10-v1');
    expect(PRESENTATION_CONSENT.text).toMatch(/portfolio/i);
    expect(PRESENTATION_CONSENT.text).toMatch(/réseaux/i);
    expect(PRESENTATION_CONSENT.text).toMatch(/révoc|retirer/i);
  });
});

describe('no price in copy', () => {
  it('PROJECT_COPY, STEPS and consent are price-free', () => {
    const strings: string[] = [];
    collect(PROJECT_COPY, strings);
    collect(STEPS, strings);
    collect(PRESENTATION_CONSENT, strings);
    expect(strings.length).toBeGreaterThan(20);
    for (const s of strings) expect(s, s).not.toMatch(PRICE);
  });
});

describe('payments copy', () => {
  it('has exactly the five invoice statuses', () => {
    expect(Object.keys(PROJECT_COPY.payments.statuses).sort()).toEqual(
      ['credited', 'paid', 'processing', 'refunded', 'to_pay'],
    );
  });
  it('enables the Paiements nav label', () => {
    expect(PROJECT_COPY.documents.nav.payments).toBe('Paiements');
  });
  it('spot-checks UI-SPEC strings', () => {
    expect(PROJECT_COPY.payments.portal.payDeposit).toBe("Payer l'acompte");
    expect(PROJECT_COPY.payments.returnBanner.confirmingTitle).toBe(
      'Paiement reçu, confirmation en cours',
    );
    expect(PROJECT_COPY.payments.admin.list.credit).toBe('Émettre un avoir');
    expect(PROJECT_COPY.payments.portal.paidOn('3 octobre 2026')).toBe('Payée le 3 octobre 2026');
  });
});

describe('blocage labels', () => {
  it('match UI-SPEC', () => {
    expect(PROJECT_COPY.blocage.client).toBe('Attend le client');
    expect(PROJECT_COPY.blocage.admin).toBe('Attend Sèvalys');
    expect(PROJECT_COPY.blocage.dormant(14)).toBe('Dormant (14 j sans activité)');
    expect(PROJECT_COPY.blocage.done).toBe('Terminé');
  });
});
