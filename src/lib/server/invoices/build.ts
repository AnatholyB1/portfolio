// Fonctions pures : aucune E/S. Les montants viennent du devis figé dans le contrat signé et des factures en base,
// jamais d'une saisie client (D-05, D-07, D-08, D-09). Le RPC revérifie les totaux.
import 'server-only';
import { randomUUID } from 'node:crypto';
import { addDaysIso, parisDateOf } from '@/lib/documents/dates';
import {
  creditNoteMax,
  depositInvoiceAmounts,
  finalInvoiceAmounts,
  periodInvoiceAmounts,
  type InvoiceAmounts,
} from '@/lib/documents/invoiceMath';
import {
  isSellerConfigured,
  latePenaltyText,
  RECOVERY_INDEMNITY_TEXT,
  SELLER_V1,
  VAT_FRANCHISE_MENTION,
} from '@/lib/documents/seller';
import { OFFER_LABELS } from '@/lib/projects/offers';
import type {
  CreditNoteSnapshot,
  InvoiceKind,
  InvoiceLineV2,
  InvoiceSnapshotV2,
} from '@/lib/documents/types';
import type { InvoiceContext } from './context';

export type IssueInput = {
  id: string;
  issueKey: string;
  projectId: string;
  kind: InvoiceKind;
  header: Record<string, unknown>;
  lines: object[];
  deductions: object[];
};

export type PeriodForm = {
  periodStart: string;
  periodEnd: string;
  lines: { designation: string; quantityMilli: number; unitPriceCents: number }[];
  orderNumber: string | null;
  dueDate: string | null;
};

export type CreditForm = {
  originInvoiceId: string;
  scope: 'total' | 'partial';
  amountCents: number;
  reason: string;
  refundRequested: boolean;
  createdBy: string;
};

export type CreditOrigin = {
  id: string;
  number: string;
  issuedOn: string;
  totalInclTaxCents: number;
  creditedCents: number;
  snapshot: InvoiceSnapshotV2;
};

export type CreditNoteArgs = {
  originInvoiceId: string;
  scope: 'total' | 'partial';
  amountCents: number;
  reason: string;
  refundRequested: boolean;
  createdBy: string;
  lines: object[];
  snapshot: CreditNoteSnapshot;
};

const TEMPLATE_VERSION = 'v2';

function requireSeller(): void {
  if (!isSellerConfigured()) throw new Error('seller_not_configured');
}

function lineRows(lines: InvoiceLineV2[]): object[] {
  return lines.map((l) => ({
    designation: l.designation,
    quantity_milli: l.quantityMilli,
    unit_code: l.unitCode,
    unit_price_cents: l.unitPriceCents,
    line_total_cents: l.totalCents,
  }));
}

type Common = {
  kind: InvoiceKind;
  amounts: InvoiceAmounts;
  issueKey: string;
  id: string;
  now: Date;
  depositPercent: number | null;
  quoteReference: string | null;
  quoteRevision: number | null;
  contractReference: string | null;
  quoteDocumentId: string | null;
  orderNumber: string | null;
  servicePeriod: { start: string; end: string } | null;
  dueDate: string | null;
};

function assemble(ctx: InvoiceContext, c: Common): IssueInput {
  const seller = structuredClone(SELLER_V1);
  const buyer = ctx.buyer;
  const issuedOn = parisDateOf(c.now);
  const dueDate = c.dueDate ?? addDaysIso(issuedOn, seller.paymentTermsDays);
  const { amounts } = c;

  const snapshot: InvoiceSnapshotV2 = {
    schemaVersion: 2,
    docType: 'invoice',
    templateVersion: TEMPLATE_VERSION,
    number: null,
    kind: c.kind,
    typeCode: c.kind === 'deposit' ? 386 : 380,
    isTest: ctx.client.isTest,
    issuedOn,
    dueDate,
    seller,
    client: buyer,
    project: { id: ctx.project.id, title: ctx.project.title, offerLabel: (OFFER_LABELS as Record<string, string>)[ctx.project.offer] ?? ctx.project.offer },
    quote: c.quoteReference ? { reference: c.quoteReference, revision: c.quoteRevision ?? 1 } : null,
    contractReference: c.contractReference,
    orderNumber: c.orderNumber,
    servicePeriod: c.servicePeriod,
    depositPercent: c.depositPercent,
    lines: amounts.lines,
    totalExclTaxCents: amounts.totalExclTaxCents,
    vatTotalCents: 0,
    totalInclTaxCents: amounts.totalExclTaxCents,
    deductions: amounts.deductions,
    prepaidCents: amounts.prepaidCents,
    netToPayCents: amounts.netToPayCents,
    vatRegime: 'franchise',
    vatExemptionText: VAT_FRANCHISE_MENTION,
    paymentTermsText: seller.paymentTermsText,
    latePenaltyText: latePenaltyText(seller),
    recoveryIndemnityText: RECOVERY_INDEMNITY_TEXT,
  };

  const addr = buyer.billingAddress ?? buyer.address;
  const header: Record<string, unknown> = {
    seller_legal_name: seller.legalName,
    seller_trade_name: seller.tradeName,
    seller_siret: seller.siret,
    seller_address_line: seller.address.line,
    seller_postal_code: seller.address.postalCode,
    seller_city: seller.address.city,
    seller_vat_number: seller.vatNumber,
    seller_iban: seller.iban,
    seller_bic: seller.bic,
    seller_email: seller.email,
    buyer_name: buyer.name,
    buyer_siret: buyer.siret,
    buyer_siren: buyer.siren,
    buyer_address_line: addr?.line ?? null,
    buyer_postal_code: addr?.postalCode ?? null,
    buyer_city: addr?.city ?? null,
    buyer_vat_number: buyer.vatNumber,
    vat_regime: 'franchise',
    vat_exemption_code: 'VATEX-FR-FRANCHISE',
    vat_exemption_text: VAT_FRANCHISE_MENTION,
    payment_terms_days: seller.paymentTermsDays,
    payment_terms_text: seller.paymentTermsText,
    late_penalty_text: latePenaltyText(seller),
    recovery_indemnity_text: RECOVERY_INDEMNITY_TEXT,
    total_excl_tax_cents: amounts.lines.reduce((s, l) => s + l.totalCents, 0),
    prepaid_cents: amounts.prepaidCents,
    deposit_percent: c.depositPercent,
    quote_document_id: c.quoteDocumentId,
    order_reference: c.quoteReference,
    customer_order_number: c.orderNumber,
    contract_reference: c.contractReference,
    template_version: TEMPLATE_VERSION,
    service_period_start: c.servicePeriod?.start ?? null,
    service_period_end: c.servicePeriod?.end ?? null,
    due_date: c.dueDate,
    snapshot,
  };

  return {
    id: c.id,
    issueKey: c.issueKey,
    projectId: ctx.project.id,
    kind: c.kind,
    header,
    lines: lineRows(amounts.lines),
    deductions: amounts.deductions.map((d) => ({
      label: d.label,
      ref_invoice_id: d.invoiceId,
      ref_number: d.invoiceNumber,
      ref_date: d.invoiceDate,
      amount_cents: d.amountCents,
    })),
  };
}

function contractOf(ctx: InvoiceContext): NonNullable<InvoiceContext['contract']> {
  if (!ctx.contract) throw new Error('contract_missing');
  return ctx.contract;
}

export function buildDepositInput(ctx: InvoiceContext, now: Date, id: string = randomUUID()): IssueInput {
  requireSeller();
  const contract = contractOf(ctx);
  const q = contract.quote;
  const amounts = depositInvoiceAmounts({
    reference: q.reference,
    depositPercent: q.depositPercent,
    depositCents: q.depositCents,
  });
  return assemble(ctx, {
    kind: 'deposit',
    amounts,
    issueKey: 'deposit:' + ctx.project.id,
    id,
    now,
    depositPercent: q.depositPercent,
    quoteReference: q.reference,
    quoteRevision: q.revision,
    contractReference: contract.reference,
    quoteDocumentId: ctx.quoteDocumentId,
    orderNumber: null,
    servicePeriod: null,
    dueDate: null,
  });
}

export function buildFinalInput(ctx: InvoiceContext, now: Date, id: string = randomUUID()): IssueInput {
  requireSeller();
  const contract = contractOf(ctx);
  const q = contract.quote;
  const periodInvoices = ctx.invoices
    .filter((i) => i.kind === 'period')
    .map((i) => ({ number: i.number, billedCents: Math.max(0, i.netToPayCents - i.creditedCents) }));
  const deposit = ctx.invoices.filter((i) => i.kind === 'deposit').at(-1);
  if (!deposit) throw new Error('deposit_missing');
  const amounts = finalInvoiceAmounts({
    quoteReference: q.reference,
    quoteTotalCents: q.totalCents,
    quoteLines: q.lines.map((l) => ({
      designation: l.designation,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
    })),
    periodInvoices,
    deposit: {
      invoiceId: deposit.id,
      number: deposit.number,
      date: deposit.issuedOn,
      amountCents: Math.max(0, deposit.totalInclTaxCents - deposit.creditedCents),
    },
  });
  return assemble(ctx, {
    kind: 'final',
    amounts,
    issueKey: 'final:' + ctx.project.id,
    id,
    now,
    depositPercent: q.depositPercent,
    quoteReference: q.reference,
    quoteRevision: q.revision,
    contractReference: contract.reference,
    quoteDocumentId: ctx.quoteDocumentId,
    orderNumber: null,
    servicePeriod: null,
    dueDate: null,
  });
}

export function buildPeriodInput(ctx: InvoiceContext, form: PeriodForm, id: string, now: Date = new Date()): IssueInput {
  requireSeller();
  const contract = contractOf(ctx);
  const amounts = periodInvoiceAmounts(form.lines);
  return assemble(ctx, {
    kind: 'period',
    amounts,
    issueKey: 'period:' + id,
    id,
    now,
    depositPercent: null,
    quoteReference: contract.quote.reference,
    quoteRevision: contract.quote.revision,
    contractReference: contract.reference,
    quoteDocumentId: ctx.quoteDocumentId,
    orderNumber: form.orderNumber,
    servicePeriod: { start: form.periodStart, end: form.periodEnd },
    dueDate: form.dueDate,
  });
}

export function buildCreditNoteInput(origin: CreditOrigin, form: CreditForm, now: Date): CreditNoteArgs {
  requireSeller();
  const max = creditNoteMax(origin.totalInclTaxCents, origin.creditedCents);
  const amountCents = form.scope === 'total' ? max : form.amountCents;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('invalid_amount');
  const o = origin.snapshot;
  const line: InvoiceLineV2 = {
    designation: `Avoir ${form.scope === 'total' ? 'total' : 'partiel'} sur facture ${origin.number}`,
    quantityMilli: 1000,
    unitCode: 'C62',
    unitPriceCents: amountCents,
    totalCents: amountCents,
  };
  const snapshot: CreditNoteSnapshot = {
    schemaVersion: 2,
    docType: 'credit_note',
    templateVersion: 'v1',
    number: null,
    typeCode: 381,
    isTest: o.isTest,
    issuedOn: parisDateOf(now),
    seller: o.seller,
    client: o.client,
    project: o.project,
    origin: {
      invoiceId: origin.id,
      number: origin.number,
      issuedOn: origin.issuedOn,
      totalInclTaxCents: origin.totalInclTaxCents,
    },
    scope: form.scope,
    reason: form.reason.trim(),
    refundRequested: form.refundRequested,
    lines: [line],
    totalExclTaxCents: amountCents,
    vatTotalCents: 0,
    totalInclTaxCents: amountCents,
    vatRegime: o.vatRegime,
    vatExemptionText: o.vatExemptionText,
  };
  return {
    originInvoiceId: origin.id,
    scope: form.scope,
    amountCents,
    reason: snapshot.reason,
    refundRequested: form.refundRequested,
    createdBy: form.createdBy,
    lines: lineRows([line]),
    snapshot,
  };
}
