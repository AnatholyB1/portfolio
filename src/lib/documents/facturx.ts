// Module pur. Table de correspondance EN 16931 (documentation exécutable, PAY-05, D-15).
//
// AUCUN fichier Factur-X n'est émis avant PAY-07. Les codes ci-dessous (BT-3 380/386/381, catégorie
// de TVA 'E', motif VATEX-FR-FRANCHISE, moyen de paiement 58) devront être revérifiés contre le
// profil Factur-X retenu à ce moment-là.
import type { CreditNoteSnapshot, InvoiceSnapshotV2 } from './types';

export type En16931Map = {
  'BT-1': string;
  'BT-2': string;
  'BT-3': '380' | '386' | '381';
  'BT-5': 'EUR';
  'BT-9': string | null;
  'BT-13': string | null;
  'BG-3': { 'BT-25': string; 'BT-26': string }[];
  'BG-14': { 'BT-73': string; 'BT-74': string } | null;
  'BT-106': number;
  'BT-109': number;
  'BT-110': 0;
  'BT-112': number;
  'BT-113': number;
  'BT-115': number;
  'BG-23': {
    'BT-118': 'E';
    'BT-120': string;
    'BT-121': 'VATEX-FR-FRANCHISE';
    'BT-116': number;
    'BT-117': 0;
  }[];
  'BG-16': { 'BT-81': '58'; 'BT-84': string };
};

export function toEn16931(doc: InvoiceSnapshotV2 | CreditNoteSnapshot): En16931Map {
  const isCredit = doc.docType === 'credit_note';
  const linesSum = doc.lines.reduce((s, l) => s + l.totalCents, 0);
  return {
    'BT-1': doc.number ?? '',
    'BT-2': doc.issuedOn,
    'BT-3': String(doc.typeCode) as '380' | '386' | '381',
    'BT-5': 'EUR',
    'BT-9': isCredit ? null : doc.dueDate,
    'BT-13': isCredit ? null : (doc.quote?.reference ?? null),
    'BG-3': isCredit
      ? [{ 'BT-25': doc.origin.number, 'BT-26': doc.origin.issuedOn }]
      : doc.deductions.map((d) => ({ 'BT-25': d.invoiceNumber, 'BT-26': d.invoiceDate })),
    'BG-14': !isCredit && doc.servicePeriod
      ? { 'BT-73': doc.servicePeriod.start, 'BT-74': doc.servicePeriod.end }
      : null,
    'BT-106': linesSum,
    'BT-109': doc.totalExclTaxCents,
    'BT-110': 0,
    'BT-112': doc.totalInclTaxCents,
    'BT-113': isCredit ? 0 : doc.prepaidCents,
    'BT-115': isCredit ? doc.totalInclTaxCents : doc.netToPayCents,
    'BG-23': [
      {
        'BT-118': 'E',
        'BT-120': doc.vatExemptionText,
        'BT-121': 'VATEX-FR-FRANCHISE',
        'BT-116': doc.totalExclTaxCents,
        'BT-117': 0,
      },
    ],
    'BG-16': { 'BT-81': '58', 'BT-84': doc.seller.iban },
  };
}
