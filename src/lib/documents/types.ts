// Module pur, sûr côté client. Contrats des documents de la phase 13.
// Les libellés de prix vivent ici (QUOTE_FORM_LABELS) et jamais dans PROJECT_COPY (D-17).

export const DOC_TYPES = ['quote', 'spec', 'contract', 'acceptance', 'invoice'] as const;
export type DocType = (typeof DOC_TYPES)[number];

// Liste SQL des documents émissibles ; la facture est émise en phase 15.
export const ISSUABLE_DOC_TYPES = ['quote', 'spec', 'contract', 'acceptance'] as const;
export type IssuableDocType = (typeof ISSUABLE_DOC_TYPES)[number];

export const DOC_LABELS: Record<DocType, string> = {
  quote: 'Devis',
  spec: 'Cahier des charges',
  contract: 'Contrat',
  acceptance: 'PV de recette',
  invoice: 'Facture',
};

export const DOC_TITLES: Record<DocType, string> = {
  quote: 'Devis',
  spec: 'Cahier des charges',
  contract: 'Contrat de prestation de services',
  acceptance: 'Procès-verbal de recette',
  invoice: 'Facture',
};

export const DOC_REF_PREFIX: Record<DocType, string> = {
  quote: 'DEV',
  spec: 'CDC',
  contract: 'CTR',
  acceptance: 'PVR',
  invoice: 'PROFORMA',
};

export type TemplateVersion = `v${number}`;
export const CURRENT_TEMPLATE_VERSION: Record<DocType, TemplateVersion> = {
  quote: 'v1',
  spec: 'v1',
  contract: 'v2',
  acceptance: 'v1',
  invoice: 'v1',
};

export type DocumentStatus = 'to_sign' | 'signed' | 'paid' | 'to_pay' | 'issued' | 'replaced';
export const STATUS_LABELS: Record<DocumentStatus, string> = {
  to_sign: 'À signer',
  signed: 'Signé',
  paid: 'Payé',
  to_pay: 'À payer',
  issued: 'Émis',
  replaced: 'Remplacé',
};

export type PostalAddress = { line: string; postalCode: string; city: string };

export type SellerIdentity = {
  version: 'v1';
  configured: boolean;
  tradeName: string;
  legalName: string;
  legalForm: string;
  showEiMention: boolean;
  siret: string;
  address: PostalAddress;
  registration: string;
  capital: string | null;
  vatRegime: 'franchise' | 'standard';
  vatNumber: string | null;
  email: string;
  iban: string;
  bic: string;
  paymentTermsDays: number;
  paymentTermsText: string;
  latePenaltyRate: string;
};

export type ClientParty = {
  name: string;
  siret: string;
  siren: string;
  address: PostalAddress | null;
  billingAddress: PostalAddress | null;
  billingDiffers: boolean;
  vatStatus: 'number' | 'not_subject' | null;
  vatNumber: string | null;
  signatoryName: string | null;
  signatoryRole: string | null;
};

export type ProjectRef = { id: string; title: string; offerLabel: string };

export type QuoteLine = {
  designation: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};

type SnapshotBase<T extends DocType> = {
  schemaVersion: 1;
  docType: T;
  templateVersion: TemplateVersion;
  reference: string;
  revision: number;
  /** YYYY-MM-DD, Europe/Paris ; les templates n'appellent jamais new Date(). */
  issuedOn: string;
  seller: SellerIdentity;
  client: ClientParty;
  project: ProjectRef;
};

export type QuoteSnapshot = SnapshotBase<'quote'> & {
  lines: QuoteLine[];
  totalCents: number;
  depositPercent: number;
  depositCents: number;
  balanceCents: number;
  validityDays: number;
  validUntil: string;
  leadTime: string;
};

export type SpecSnapshot = SnapshotBase<'spec'> & {
  sections: {
    context: string;
    scope: string;
    deliverables: string;
    outOfScope: string;
    planning: string;
  };
  acceptanceCriteria: string[];
};

export type ContractSnapshot = SnapshotBase<'contract'> & {
  quote: {
    reference: string;
    revision: number;
    issuedOn: string;
    lines: QuoteLine[];
    totalCents: number;
    depositPercent: number;
    depositCents: number;
    balanceCents: number;
    leadTime: string;
  };
  startDate: string | null;
};

export type AcceptanceSnapshot = SnapshotBase<'acceptance'> & {
  spec: { reference: string; revision: number; issuedOn: string };
  acceptanceCriteria: string[];
  deliveryDate: string;
  reservations: string | null;
};

export type InvoiceSnapshot = SnapshotBase<'invoice'> & {
  number: 'PROFORMA';
  kind: 'deposit' | 'balance';
  quote: { reference: string; revision: number };
  lines: QuoteLine[];
  totalCents: number;
  depositPercent: number;
  depositCents: number;
  balanceCents: number;
  alreadyPaidCents: number;
  netToPayCents: number;
  serviceDate: string;
  dueDate: string;
  orderNumber: string | null;
  operationNature: 'Prestation de services';
  deliveryAddress: PostalAddress | null;
};

// --- Phase 15 : factures numérotées et avoirs (hors sv_project_documents) ---------------------
// Montants en centimes entiers ; quantités en millièmes de jour (D-05).

export type InvoiceKind = 'deposit' | 'period' | 'final';
export type InvoiceSeries = 'FA' | 'AV' | 'TFA' | 'TAV';

export type InvoiceLineV2 = {
  designation: string;
  quantityMilli: number;
  unitCode: 'DAY' | 'C62';
  unitPriceCents: number;
  totalCents: number;
};

export type InvoiceDeduction = {
  label: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  amountCents: number;
};

export type InvoiceSnapshotV2 = {
  schemaVersion: 2;
  docType: 'invoice';
  templateVersion: 'v2';
  /** null = aperçu, rendu avec le tampon PROFORMA. */
  number: string | null;
  kind: InvoiceKind;
  typeCode: 380 | 386;
  isTest: boolean;
  issuedOn: string;
  dueDate: string;
  seller: SellerIdentity;
  client: ClientParty;
  project: ProjectRef;
  quote: { reference: string; revision: number } | null;
  contractReference: string | null;
  orderNumber: string | null;
  servicePeriod: { start: string; end: string } | null;
  depositPercent: number | null;
  lines: InvoiceLineV2[];
  totalExclTaxCents: number;
  vatTotalCents: 0;
  totalInclTaxCents: number;
  deductions: InvoiceDeduction[];
  prepaidCents: number;
  netToPayCents: number;
  vatRegime: 'franchise' | 'standard';
  vatExemptionText: string;
  paymentTermsText: string;
  latePenaltyText: string;
  recoveryIndemnityText: string;
};

export type CreditNoteSnapshot = {
  schemaVersion: 2;
  docType: 'credit_note';
  templateVersion: 'v1';
  number: string | null;
  typeCode: 381;
  isTest: boolean;
  issuedOn: string;
  seller: SellerIdentity;
  client: ClientParty;
  project: ProjectRef;
  origin: { invoiceId: string; number: string; issuedOn: string; totalInclTaxCents: number };
  scope: 'total' | 'partial';
  reason: string;
  refundRequested: boolean;
  lines: InvoiceLineV2[];
  totalExclTaxCents: number;
  vatTotalCents: 0;
  totalInclTaxCents: number;
  vatRegime: 'franchise' | 'standard';
  vatExemptionText: string;
};

export type LedgerSnapshot = InvoiceSnapshotV2 | CreditNoteSnapshot;

export type DocumentSnapshot =
  | QuoteSnapshot
  | SpecSnapshot
  | ContractSnapshot
  | AcceptanceSnapshot
  | InvoiceSnapshot;

/** `${prefix}-${YYYY}-${8 premiers hex du projet, majuscules}-${révision}` ; facture : 'PROFORMA'. */
export function buildReference(
  docType: DocType,
  projectId: string,
  issuedOn: string,
  revision: number,
): string {
  if (docType === 'invoice') return 'PROFORMA';
  const year = issuedOn.slice(0, 4);
  const short = projectId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `${DOC_REF_PREFIX[docType]}-${year}-${short}-${revision}`;
}

const FILENAME_PREFIX: Record<Exclude<DocType, 'invoice'>, string> = {
  quote: 'Devis',
  spec: 'Cahier-des-charges',
  contract: 'Contrat',
  acceptance: 'PV-de-recette',
};

/** Nom de fichier ASCII sûr pour Content-Disposition. */
export function buildFilename(docType: DocType, reference: string): string {
  const safeRef = reference.replace(/[^A-Za-z0-9._-]/g, '-');
  if (docType === 'invoice') return `Facture-apercu-${safeRef}.pdf`;
  return `${FILENAME_PREFIX[docType]}-${safeRef}.pdf`;
}

export const QUOTE_FORM_LABELS = {
  designation: 'Désignation',
  quantity: 'Quantité',
  unitPrice: 'Prix unitaire HT',
  amount: 'Montant HT',
  total: 'Total HT',
  deposit: 'Acompte',
  balance: 'Solde',
  validity: "Validité de l'offre (jours)",
  leadTime: 'Délai de réalisation',
  vatLine: 'TVA non applicable, art. 293 B du CGI. Total TTC = total HT.',
} as const;
