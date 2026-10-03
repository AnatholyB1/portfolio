// Données d'exemple pour les tests et l'aperçu de démonstration ; jamais utilisées pour une émission.
import { addDaysIso } from "./dates";
import { quoteTotals } from "./money";
import { SELLER_V1 } from "./seller";
import {
  buildReference,
  type ClientParty,
  type InvoiceSnapshot,
  type QuoteLine,
  type QuoteSnapshot,
  type SellerIdentity,
} from "./types";

export const sampleSeller: SellerIdentity = {
  ...SELLER_V1,
  configured: true,
  legalName: "Martin Dubois",
  legalForm: "Entrepreneur individuel",
  siret: "73282932000074",
  address: { line: "12 rue Nationale", postalCode: "37000", city: "Tours" },
  registration: "Dispensé d'immatriculation au RCS et au RM",
  iban: "FR7630006000011234567890189",
  bic: "AGRIFRPP",
};

export function sampleClient(opts?: {
  billingDiffers?: boolean;
  vatStatus?: "number" | "not_subject";
}): ClientParty {
  const billingDiffers = opts?.billingDiffers ?? false;
  const vatStatus = opts?.vatStatus ?? "not_subject";
  const address = { line: "8 avenue des Lilas", postalCode: "37100", city: "Tours" };
  const siret = "35600000000048";
  return {
    name: "Atelier Œuvre & Lumière",
    siret,
    siren: siret.slice(0, 9),
    address,
    billingAddress: billingDiffers
      ? { line: "3 place de la Mairie", postalCode: "37200", city: "Chambray-lès-Tours" }
      : address,
    billingDiffers,
    vatStatus,
    vatNumber: vatStatus === "number" ? "FR40356000000" : null,
    signatoryName: "Claire Lambert",
    signatoryRole: "Gérante",
  };
}

const SAMPLE_LINES_INPUT: { designation: string; quantity: number; unitPriceCents: number }[] = [
  { designation: "Maquette de l'œuvre et identité visuelle", quantity: 1, unitPriceCents: 120000 },
  { designation: "Développement du site vitrine (5 pages)", quantity: 5, unitPriceCents: 45000 },
  { designation: "Recette, mise en ligne et formation", quantity: 2, unitPriceCents: 17550 },
];

function sampleLines(): QuoteLine[] {
  return SAMPLE_LINES_INPUT.map((l) => ({ ...l, totalCents: l.quantity * l.unitPriceCents }));
}

const SAMPLE_PROJECT = {
  id: "0a1b2c3d-4e5f-6789-abcd-ef0123456789",
  title: "Refonte du site de l'atelier",
  offerLabel: "Site vitrine",
};

export function sampleQuoteSnapshot(opts?: {
  seller?: SellerIdentity;
  client?: ClientParty;
}): QuoteSnapshot {
  const lines = sampleLines();
  const depositPercent = 30;
  const totals = quoteTotals(lines, depositPercent);
  const issuedOn = "2026-10-12";
  const validityDays = 30;
  return {
    schemaVersion: 1,
    docType: "quote",
    templateVersion: "v1",
    reference: buildReference("quote", SAMPLE_PROJECT.id, issuedOn, 1),
    revision: 1,
    issuedOn,
    seller: opts?.seller ?? sampleSeller,
    client: opts?.client ?? sampleClient(),
    project: SAMPLE_PROJECT,
    lines,
    ...totals,
    depositPercent,
    validityDays,
    validUntil: addDaysIso(issuedOn, validityDays),
    leadTime: "6 semaines à compter de la réception de l'acompte",
  };
}

export function sampleInvoiceSnapshot(opts?: {
  seller?: SellerIdentity;
  client?: ClientParty;
  kind?: "deposit" | "balance";
}): InvoiceSnapshot {
  const seller = opts?.seller ?? sampleSeller;
  const client = opts?.client ?? sampleClient();
  const kind = opts?.kind ?? "deposit";
  const lines = sampleLines();
  const depositPercent = 30;
  const totals = quoteTotals(lines, depositPercent);
  const issuedOn = "2026-10-12";
  const alreadyPaidCents = kind === "balance" ? totals.depositCents : 0;
  const netToPayCents = kind === "balance" ? totals.balanceCents : totals.depositCents;
  return {
    schemaVersion: 1,
    docType: "invoice",
    templateVersion: "v1",
    reference: buildReference("invoice", SAMPLE_PROJECT.id, issuedOn, 1),
    revision: 1,
    issuedOn,
    seller,
    client,
    project: SAMPLE_PROJECT,
    number: "PROFORMA",
    kind,
    quote: { reference: buildReference("quote", SAMPLE_PROJECT.id, issuedOn, 1), revision: 1 },
    lines,
    ...totals,
    depositPercent,
    alreadyPaidCents,
    netToPayCents,
    serviceDate: issuedOn,
    dueDate: addDaysIso(issuedOn, seller.paymentTermsDays),
    orderNumber: null,
    operationNature: "Prestation de services",
    deliveryAddress: client.billingDiffers ? client.address : null,
  };
}
