/* eslint-disable @typescript-eslint/no-explicit-any -- test fixtures */
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { sampleClient } from '@/lib/documents/fixtures';
import { FIXTURE_DEPOSIT_CENTS, FIXTURE_QUOTE_TOTAL_CENTS, sampleDepositInvoiceV2 } from '@/lib/documents/invoiceFixtures';
import { VAT_FRANCHISE_MENTION } from '@/lib/documents/seller';
import {
  buildCreditNoteInput,
  buildDepositInput,
  buildFinalInput,
  buildPeriodInput,
} from './build';
import type { InvoiceContext } from './context';

const PID = '0a1b2c3d-4e5f-6789-abcd-ef0123456789';
const NOW = new Date('2026-10-15T10:00:00Z');
const ID = '99999999-9999-4999-8999-999999999999';

function ctx(over: Partial<InvoiceContext> = {}): InvoiceContext {
  return {
    project: { id: PID, title: 'Refonte', offer: 'site-vitrine', clientId: 'c1' },
    client: { id: 'c1', name: 'Atelier', siret: '12345678901234', company: {}, isTest: false },
    buyer: sampleClient(),
    contract: {
      documentId: 'd1',
      reference: 'CTR-2026-0A1B2C3D-1',
      quote: {
        reference: 'DEV-2026-0A1B2C3D-1',
        revision: 1,
        issuedOn: '2026-10-01',
        lines: [
          { designation: 'Maquette', quantity: 1, unitPriceCents: 120000, totalCents: 120000 },
          { designation: 'Développement', quantity: 5, unitPriceCents: 45000, totalCents: 225000 },
          { designation: 'Recette', quantity: 2, unitPriceCents: 17550, totalCents: 35100 },
        ],
        totalCents: FIXTURE_QUOTE_TOTAL_CENTS,
        depositPercent: 30,
        depositCents: FIXTURE_DEPOSIT_CENTS,
        balanceCents: FIXTURE_QUOTE_TOTAL_CENTS - FIXTURE_DEPOSIT_CENTS,
        leadTime: '6 semaines',
      },
    },
    quoteDocumentId: 'q1',
    invoices: [],
    contractSigned: true,
    acceptanceSigned: true,
    ...over,
  };
}

const DEPOSIT_ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'deposit' as const,
  number: 'FA-2026-0001',
  issuedOn: '2026-10-15',
  totalInclTaxCents: FIXTURE_DEPOSIT_CENTS,
  netToPayCents: FIXTURE_DEPOSIT_CENTS,
  creditedCents: 0,
};

describe('buildDepositInput', () => {
  it('builds the deposit RPC input from the frozen quote', () => {
    const r = buildDepositInput(ctx(), NOW, ID);
    expect(r.issueKey).toBe('deposit:' + PID);
    expect(r.kind).toBe('deposit');
    expect(r.lines).toHaveLength(1);
    expect(r.deductions).toEqual([]);
    const h = r.header as any;
    expect(h.deposit_percent).toBe(30);
    expect(h.order_reference).toBe('DEV-2026-0A1B2C3D-1');
    expect(h.contract_reference).toBe('CTR-2026-0A1B2C3D-1');
    expect(h.quote_document_id).toBe('q1');
    expect(h.total_excl_tax_cents).toBe(FIXTURE_DEPOSIT_CENTS);
    expect(h.vat_regime).toBe('franchise');
    expect(h.vat_exemption_code).toBe('VATEX-FR-FRANCHISE');
    expect(h.vat_exemption_text).toBe(VAT_FRANCHISE_MENTION);
    expect(h.payment_terms_days).toBe(30);
    expect(h.seller_siret).toBe('90098846000011');
    expect(h.buyer_name).toBeTruthy();
    expect(h.snapshot.kind).toBe('deposit');
    expect(h.snapshot.typeCode).toBe(386);
    expect(h.snapshot.number).toBeNull();
    expect(h.snapshot.issuedOn).toBe('2026-10-15');
    expect((r.lines[0] as any).line_total_cents).toBe(FIXTURE_DEPOSIT_CENTS);
    expect((r.lines[0] as any).unit_code).toBe('C62');
  });

  it('throws contract_missing without a contract', () => {
    expect(() => buildDepositInput(ctx({ contract: null }), NOW, ID)).toThrow('contract_missing');
  });

  it('propagates nothing_to_invoice', () => {
    const c = ctx();
    c.contract!.quote.depositCents = 0;
    expect(() => buildDepositInput(c, NOW, ID)).toThrow('nothing_to_invoice');
  });
});

describe('buildFinalInput', () => {
  it('deducts the deposit and keeps the quote lines', () => {
    const r = buildFinalInput(ctx({ invoices: [DEPOSIT_ROW] }), NOW, ID);
    expect(r.issueKey).toBe('final:' + PID);
    expect(r.lines).toHaveLength(3);
    expect(r.deductions).toEqual([
      {
        label: 'Acompte déjà versé (facture FA-2026-0001)',
        ref_invoice_id: DEPOSIT_ROW.id,
        ref_number: 'FA-2026-0001',
        ref_date: '2026-10-15',
        amount_cents: FIXTURE_DEPOSIT_CENTS,
      },
    ]);
    const h = r.header as any;
    expect(h.prepaid_cents).toBe(FIXTURE_DEPOSIT_CENTS);
    expect(h.total_excl_tax_cents).toBe(FIXTURE_QUOTE_TOTAL_CENTS);
    expect(h.snapshot.netToPayCents).toBe(FIXTURE_QUOTE_TOTAL_CENTS - FIXTURE_DEPOSIT_CENTS);
    expect(h.snapshot.typeCode).toBe(380);
  });

  it('removes credited period work from what was billed', () => {
    const period = {
      id: 'p1',
      kind: 'period' as const,
      number: 'FA-2026-0002',
      issuedOn: '2026-11-30',
      totalInclTaxCents: 67500,
      netToPayCents: 67500,
      creditedCents: 17500,
    };
    const r = buildFinalInput(ctx({ invoices: [DEPOSIT_ROW, period] }), NOW, ID);
    // reliquat = quote total - (67500 - 17500)
    expect((r.header as any).total_excl_tax_cents).toBe(FIXTURE_QUOTE_TOTAL_CENTS - 50000);
    expect(r.lines).toHaveLength(1);
  });

  it('throws over_invoiced and nothing_to_invoice', () => {
    const big = { ...DEPOSIT_ROW, totalInclTaxCents: FIXTURE_QUOTE_TOTAL_CENTS + 1, netToPayCents: FIXTURE_QUOTE_TOTAL_CENTS + 1 };
    expect(() => buildFinalInput(ctx({ invoices: [big] }), NOW, ID)).toThrow('over_invoiced');
    const exact = { ...DEPOSIT_ROW, totalInclTaxCents: FIXTURE_QUOTE_TOTAL_CENTS, netToPayCents: FIXTURE_QUOTE_TOTAL_CENTS };
    expect(() => buildFinalInput(ctx({ invoices: [exact] }), NOW, ID)).toThrow('nothing_to_invoice');
  });

  it('throws deposit_missing without a deposit invoice', () => {
    expect(() => buildFinalInput(ctx(), NOW, ID)).toThrow('deposit_missing');
  });
});

describe('buildPeriodInput', () => {
  const form = {
    periodStart: '2026-11-01',
    periodEnd: '2026-11-30',
    lines: [{ designation: 'Jours de développement', quantityMilli: 1500, unitPriceCents: 45000 }],
    orderNumber: 'BC-42',
    dueDate: '2026-12-31',
  };

  it('builds DAY lines with the service period', () => {
    const r = buildPeriodInput(ctx(), form, ID, NOW);
    expect(r.issueKey).toBe('period:' + ID);
    expect((r.lines[0] as any).unit_code).toBe('DAY');
    expect((r.lines[0] as any).line_total_cents).toBe(67500);
    const h = r.header as any;
    expect(h.service_period_start).toBe('2026-11-01');
    expect(h.service_period_end).toBe('2026-11-30');
    expect(h.customer_order_number).toBe('BC-42');
    expect(h.due_date).toBe('2026-12-31');
    expect(h.snapshot.typeCode).toBe(380);
  });
});

describe('buildCreditNoteInput', () => {
  const snapshot = { ...sampleDepositInvoiceV2(), number: 'FA-2026-0001' };
  const origin = {
    id: DEPOSIT_ROW.id,
    number: 'FA-2026-0001',
    issuedOn: '2026-10-15',
    totalInclTaxCents: FIXTURE_DEPOSIT_CENTS,
    creditedCents: 10000,
    snapshot,
  };
  const form = {
    originInvoiceId: DEPOSIT_ROW.id,
    scope: 'total' as const,
    amountCents: 1,
    reason: '  Annulation du projet  ',
    refundRequested: true,
    createdBy: 'u1',
  };

  it('forces the maximum for a total credit', () => {
    const r = buildCreditNoteInput(origin, form, NOW);
    expect(r.amountCents).toBe(FIXTURE_DEPOSIT_CENTS - 10000);
    expect(r.reason).toBe('Annulation du projet');
    expect((r.lines[0] as any).quantity_milli).toBe(1000);
    expect((r.lines[0] as any).designation).toBe('Avoir total sur facture FA-2026-0001');
    expect(r.snapshot.refundRequested).toBe(true);
    expect(r.snapshot.number).toBeNull();
  });

  it('keeps the requested amount for a partial credit', () => {
    const r = buildCreditNoteInput(origin, { ...form, scope: 'partial', amountCents: 5000 }, NOW);
    expect(r.amountCents).toBe(5000);
    expect((r.lines[0] as any).designation).toBe('Avoir partiel sur facture FA-2026-0001');
    expect(r.snapshot.totalInclTaxCents).toBe(5000);
  });

  it('refuses a non positive amount', () => {
    expect(() => buildCreditNoteInput(origin, { ...form, scope: 'partial', amountCents: 0 }, NOW)).toThrow('invalid_amount');
    expect(() => buildCreditNoteInput({ ...origin, creditedCents: FIXTURE_DEPOSIT_CENTS }, form, NOW)).toThrow('invalid_amount');
  });
});
