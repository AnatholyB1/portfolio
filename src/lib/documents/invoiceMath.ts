// Module pur, sûr côté client. Montants en centimes entiers, quantités en millièmes (D-05, Pitfall 12).
// Aucune TVA calculée (franchise en base). Pas d API de formatage localisé, pas d horloge.
import { NBSP } from "./money";
import type { InvoiceDeduction, InvoiceLineV2 } from "./types";

export type InvoiceAmounts = {
  lines: InvoiceLineV2[];
  totalExclTaxCents: number;
  deductions: InvoiceDeduction[];
  prepaidCents: number;
  netToPayCents: number;
};

const MAX_PERIOD_LINES = 30;

/** floor((quantityMilli * unitPriceCents + 500) / 1000) : demi supérieur, une seule fois. */
export function mulMilli(quantityMilli: number, unitPriceCents: number): number {
  const product = quantityMilli * unitPriceCents;
  if (
    !Number.isSafeInteger(quantityMilli) ||
    !Number.isSafeInteger(unitPriceCents) ||
    !Number.isSafeInteger(product) ||
    !Number.isSafeInteger(product + 500)
  ) {
    throw new Error("invalid_amount");
  }
  return Math.floor((product + 500) / 1000);
}

/** Saisie de jours (pas de 0,5, strictement positive) vers des millièmes, ou null. */
export function parseDaysToMilli(input: string): number | null {
  const m = /^(\d{1,6})(?:[.,](\d{1,3}))?$/.exec(input.replace(/\s/g, ""));
  if (!m) return null;
  const frac = (m[2] ?? "").padEnd(3, "0");
  if (frac !== "000" && frac !== "500") return null;
  const milli = Number(m[1]) * 1000 + Number(frac);
  return milli > 0 && Number.isSafeInteger(milli) ? milli : null;
}

export function linesTotal(lines: { totalCents: number }[]): number {
  const total = lines.reduce((sum, l) => sum + l.totalCents, 0);
  if (!Number.isSafeInteger(total)) throw new Error("invalid_amount");
  return total;
}

function requireCents(n: number): void {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("invalid_amount");
}

export function depositInvoiceAmounts(input: {
  reference: string;
  depositPercent: number;
  depositCents: number;
}): InvoiceAmounts {
  requireCents(input.depositCents);
  if (input.depositCents === 0) throw new Error("nothing_to_invoice");
  const line: InvoiceLineV2 = {
    designation: `Acompte de ${input.depositPercent}${NBSP}% sur le devis ${input.reference}`,
    quantityMilli: 1000,
    unitCode: "C62",
    unitPriceCents: input.depositCents,
    totalCents: input.depositCents,
  };
  return {
    lines: [line],
    totalExclTaxCents: input.depositCents,
    deductions: [],
    prepaidCents: 0,
    netToPayCents: input.depositCents,
  };
}

export function periodInvoiceAmounts(
  input: { designation: string; quantityMilli: number; unitPriceCents: number }[],
): InvoiceAmounts {
  if (input.length === 0 || input.length > MAX_PERIOD_LINES) throw new Error("invalid_lines");
  const lines: InvoiceLineV2[] = input.map((l) => ({
    designation: l.designation,
    quantityMilli: l.quantityMilli,
    unitCode: "DAY",
    unitPriceCents: l.unitPriceCents,
    totalCents: mulMilli(l.quantityMilli, l.unitPriceCents),
  }));
  const total = linesTotal(lines);
  if (total <= 0) throw new Error("nothing_to_invoice");
  return { lines, totalExclTaxCents: total, deductions: [], prepaidCents: 0, netToPayCents: total };
}

export function finalInvoiceAmounts(input: {
  quoteReference: string;
  quoteTotalCents: number;
  quoteLines: { designation: string; quantity: number; unitPriceCents: number }[];
  /** Part non créditée facturée par les factures de période (D-09). */
  periodInvoices: { number: string; billedCents: number }[];
  deposit: { invoiceId: string; number: string; date: string; amountCents: number };
}): InvoiceAmounts {
  requireCents(input.quoteTotalCents);
  requireCents(input.deposit.amountCents);
  const periodBilled = input.periodInvoices.reduce((s, p) => {
    requireCents(p.billedCents);
    return s + p.billedCents;
  }, 0);
  const reliquat = input.quoteTotalCents - periodBilled;
  const net = reliquat - input.deposit.amountCents;
  if (net < 0) throw new Error("over_invoiced");
  if (net === 0) throw new Error("nothing_to_invoice");

  let lines: InvoiceLineV2[];
  if (input.periodInvoices.length === 0) {
    lines = input.quoteLines.map((l) => ({
      designation: l.designation,
      quantityMilli: l.quantity * 1000,
      unitCode: "C62",
      unitPriceCents: l.unitPriceCents,
      totalCents: mulMilli(l.quantity * 1000, l.unitPriceCents),
    }));
    if (linesTotal(lines) !== input.quoteTotalCents) throw new Error("invalid_amount");
  } else {
    lines = [
      {
        designation: `Reliquat du devis ${input.quoteReference}, hors factures de période ${input.periodInvoices
          .map((p) => p.number)
          .join(", ")}`,
        quantityMilli: 1000,
        unitCode: "C62",
        unitPriceCents: reliquat,
        totalCents: reliquat,
      },
    ];
  }

  const deductions: InvoiceDeduction[] = [
    {
      label: `Acompte déjà versé (facture ${input.deposit.number})`,
      invoiceId: input.deposit.invoiceId,
      invoiceNumber: input.deposit.number,
      invoiceDate: input.deposit.date,
      amountCents: input.deposit.amountCents,
    },
  ];
  return {
    lines,
    totalExclTaxCents: reliquat,
    deductions,
    prepaidCents: input.deposit.amountCents,
    netToPayCents: net,
  };
}

/** Plafond d'un nouvel avoir : total d'origine moins les avoirs précédents (D-14). */
export function creditNoteMax(originTotalCents: number, existingCreditsCents: number): number {
  return Math.max(0, originTotalCents - existingCreditsCents);
}

/** Reste dû après avoirs, jamais négatif. */
export function amountDueCents(netToPayCents: number, creditedCents: number): number {
  return Math.max(0, netToPayCents - creditedCents);
}

/**
 * Synthèse de facturation. Le travail facturé d'une facture est son net à payer (le total de la
 * finale inclut l'acompte déjà compté par la facture d'acompte) moins ses avoirs.
 */
export function billingSummary(
  quoteTotalCents: number,
  depositPercent: number,
  invoices: { netToPayCents: number; creditedCents: number; status: string }[],
): {
  quoteTotalCents: number;
  depositPercent: number;
  invoicedCents: number;
  collectedCents: number;
  remainingToInvoiceCents: number;
} {
  const invoicedCents = invoices.reduce((s, i) => s + (i.netToPayCents - i.creditedCents), 0);
  const collectedCents = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.netToPayCents, 0);
  return {
    quoteTotalCents,
    depositPercent,
    invoicedCents,
    collectedCents,
    remainingToInvoiceCents: Math.max(0, quoteTotalCents - invoicedCents),
  };
}
