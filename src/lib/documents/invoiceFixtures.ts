// Données d'exemple pour les tests des factures numérotées (phase 15) ; jamais utilisées pour une émission.
import { sampleClient, sampleSeller } from "./fixtures";
import { addDaysIso } from "./dates";
import { RECOVERY_INDEMNITY_TEXT, VAT_FRANCHISE_MENTION, latePenaltyText } from "./seller";
import type {
  CreditNoteSnapshot,
  InvoiceLineV2,
  InvoiceSnapshotV2,
} from "./types";

const PROJECT = {
  id: "0a1b2c3d-4e5f-6789-abcd-ef0123456789",
  title: "Refonte du site de l'atelier",
  offerLabel: "Site vitrine",
};

const QUOTE_REF = "DEV-2026-0A1B2C3D-1";

// Total du devis d'exemple : 120000 + 5 x 45000 + 2 x 17550 = 380100 ; acompte 30 % = 114030.
export const FIXTURE_QUOTE_TOTAL_CENTS = 380100;
export const FIXTURE_DEPOSIT_CENTS = 114030;

function quoteLinesV2(): InvoiceLineV2[] {
  return [
    {
      designation: "Maquette de l'œuvre et identité visuelle",
      quantityMilli: 1000,
      unitCode: "C62",
      unitPriceCents: 120000,
      totalCents: 120000,
    },
    {
      designation: "Développement du site vitrine (5 pages)",
      quantityMilli: 5000,
      unitCode: "C62",
      unitPriceCents: 45000,
      totalCents: 225000,
    },
    {
      designation: "Recette, mise en ligne et formation",
      quantityMilli: 2000,
      unitCode: "C62",
      unitPriceCents: 17550,
      totalCents: 35100,
    },
  ];
}

function base(
  number: string,
  kind: InvoiceSnapshotV2["kind"],
  issuedOn: string,
  lines: InvoiceLineV2[],
): InvoiceSnapshotV2 {
  const seller = sampleSeller;
  const total = lines.reduce((s, l) => s + l.totalCents, 0);
  return {
    schemaVersion: 2,
    docType: "invoice",
    templateVersion: "v2",
    number,
    kind,
    typeCode: kind === "deposit" ? 386 : 380,
    isTest: false,
    issuedOn,
    dueDate: addDaysIso(issuedOn, seller.paymentTermsDays),
    seller,
    client: sampleClient(),
    project: PROJECT,
    quote: { reference: QUOTE_REF, revision: 1 },
    contractReference: "CTR-2026-0A1B2C3D-1",
    orderNumber: null,
    servicePeriod: null,
    depositPercent: 30,
    lines,
    totalExclTaxCents: total,
    vatTotalCents: 0,
    totalInclTaxCents: total,
    deductions: [],
    prepaidCents: 0,
    netToPayCents: total,
    vatRegime: "franchise",
    vatExemptionText: VAT_FRANCHISE_MENTION,
    paymentTermsText: seller.paymentTermsText,
    latePenaltyText: latePenaltyText(seller),
    recoveryIndemnityText: RECOVERY_INDEMNITY_TEXT,
  };
}

export function sampleDepositInvoiceV2(): InvoiceSnapshotV2 {
  return base("FA-2026-0001", "deposit", "2026-10-15", [
    {
      designation: `Acompte de 30 % sur le devis ${QUOTE_REF}`,
      quantityMilli: 1000,
      unitCode: "C62",
      unitPriceCents: FIXTURE_DEPOSIT_CENTS,
      totalCents: FIXTURE_DEPOSIT_CENTS,
    },
  ]);
}

export function samplePeriodInvoiceV2(): InvoiceSnapshotV2 {
  const inv = base("FA-2026-0002", "period", "2026-11-30", [
    {
      designation: "Journées de développement supplémentaires",
      quantityMilli: 1500,
      unitCode: "DAY",
      unitPriceCents: 45000,
      totalCents: 67500,
    },
  ]);
  return { ...inv, servicePeriod: { start: "2026-11-01", end: "2026-11-30" } };
}

export function sampleFinalInvoiceV2(): InvoiceSnapshotV2 {
  const inv = base("FA-2026-0004", "final", "2026-12-18", quoteLinesV2());
  return {
    ...inv,
    deductions: [
      {
        label: "Acompte déjà versé (facture FA-2026-0001)",
        invoiceId: "11111111-1111-4111-8111-111111111111",
        invoiceNumber: "FA-2026-0001",
        invoiceDate: "2026-10-15",
        amountCents: FIXTURE_DEPOSIT_CENTS,
      },
    ],
    prepaidCents: FIXTURE_DEPOSIT_CENTS,
    netToPayCents: FIXTURE_QUOTE_TOTAL_CENTS - FIXTURE_DEPOSIT_CENTS,
  };
}

export function sampleCreditNote(): CreditNoteSnapshot {
  const deposit = sampleDepositInvoiceV2();
  return {
    schemaVersion: 2,
    docType: "credit_note",
    templateVersion: "v1",
    number: "AV-2026-0001",
    typeCode: 381,
    isTest: false,
    issuedOn: "2026-10-20",
    seller: deposit.seller,
    client: deposit.client,
    project: deposit.project,
    origin: {
      invoiceId: "11111111-1111-4111-8111-111111111111",
      number: "FA-2026-0001",
      issuedOn: "2026-10-15",
      totalInclTaxCents: deposit.totalInclTaxCents,
    },
    scope: "total",
    reason: "Annulation du projet avant démarrage",
    refundRequested: true,
    lines: deposit.lines.map((l) => ({ ...l })),
    totalExclTaxCents: deposit.totalExclTaxCents,
    vatTotalCents: 0,
    totalInclTaxCents: deposit.totalInclTaxCents,
    vatRegime: "franchise",
    vatExemptionText: VAT_FRANCHISE_MENTION,
  };
}
