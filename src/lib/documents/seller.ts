// Module pur. Identité du vendeur versionnée, copiée dans chaque snapshot (D-12).
//
// Valeurs fournies par le propriétaire le 2026-10-03 (13-11). Relecture comptable des mentions
// encore requise avant usage réel (STATE.md).
import type { SellerIdentity } from './types';

export const SELLER_PLACEHOLDER = 'À COMPLÉTER';
export const VAT_FRANCHISE_MENTION = 'TVA non applicable, art. 293 B du CGI';
export const RECOVERY_INDEMNITY_TEXT = 'Indemnité forfaitaire pour frais de recouvrement : 40 €';
export const DISCOUNT_TEXT = 'Escompte pour paiement anticipé : néant';

export function latePenaltyText(s: SellerIdentity): string {
  return `Pénalités de retard : ${s.latePenaltyRate}`;
}

export const SELLER_V1: SellerIdentity = {
  version: 'v1',
  configured: true,
  tradeName: 'Sèvalys',
  legalName: 'Anatholy Bricon',
  legalForm: 'Entrepreneur individuel',
  showEiMention: true,
  siret: '90098846000011',
  address: { line: '71 rue de Grand Cour', postalCode: '37550', city: 'Saint-Avertin' },
  registration: "Entrepreneur individuel dispensé d'immatriculation au RCS et au RM",
  capital: null,
  vatRegime: 'franchise',
  vatNumber: null,
  email: 'contact@sevalys.com',
  iban: 'FR7628233000011010832334333',
  bic: 'REVOFRP2',
  paymentTermsDays: 30,
  paymentTermsText: 'Paiement à 30 jours à compter de la date de facture, par virement',
  latePenaltyRate: "trois fois le taux d'intérêt légal",
};

function luhnValid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

function ibanValid(raw: string): boolean {
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of code) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder === 1;
}

/** Champs encore à compléter ou invalides. Vide = identité exploitable. */
export function sellerProblems(s: SellerIdentity): string[] {
  const problems: string[] = [];
  const check = (label: string, value: string) => {
    if (value === SELLER_PLACEHOLDER || value.trim() === '') problems.push(`${label} à compléter`);
  };
  check('Raison sociale', s.legalName);
  check('Forme juridique', s.legalForm);
  check('SIRET', s.siret);
  check('Adresse', s.address.line);
  check('Code postal', s.address.postalCode);
  check('Ville', s.address.city);
  check('Immatriculation', s.registration);
  check('IBAN', s.iban);
  check('BIC', s.bic);

  if (s.siret !== SELLER_PLACEHOLDER && !(/^\d{14}$/.test(s.siret) && luhnValid(s.siret))) {
    problems.push('SIRET invalide');
  }
  if (s.iban !== SELLER_PLACEHOLDER && !ibanValid(s.iban)) problems.push('IBAN invalide');
  if (s.vatRegime === 'franchise' && s.vatNumber !== null) {
    problems.push('Numéro de TVA incompatible avec la franchise en base');
  }
  if (!Number.isInteger(s.paymentTermsDays) || s.paymentTermsDays < 1 || s.paymentTermsDays > 60) {
    problems.push('Délai de paiement hors limites (1 à 60 jours)');
  }
  return problems;
}

export function isSellerConfigured(s: SellerIdentity = SELLER_V1): boolean {
  return s.configured && sellerProblems(s).length === 0;
}
