import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const panel = read('./billing/BillingPanel.tsx');
const list = read('./billing/InvoiceList.tsx');
const pending = read('./billing/PendingPayments.tsx');

describe('Facturation composition source guards (T-15-72, T-15-73)', () => {
  it('BillingPanel takes its copy from PROJECT_COPY.payments.admin', () => {
    expect(panel).toContain('PROJECT_COPY.payments.admin');
    expect(panel).not.toContain('createSupabaseAdminClient');
    expect(panel).not.toContain('dangerouslySetInnerHTML');
  });

  it('BillingPanel shows the D-10 warning under stripeFactsExist', () => {
    const i = panel.indexOf('stripeFactsExist');
    expect(i).toBeGreaterThan(-1);
    expect(panel.slice(i, i + 400)).toContain('COPY.manualFactWarning');
  });

  it('BillingPanel keeps one open form at a time', () => {
    expect(panel).toContain('useState<OpenForm>(null)');
    expect(panel).toContain("kind: 'period'");
    expect(panel).toContain("kind: 'credit'");
    expect(panel).toContain("open?.kind === 'period'");
    expect(panel).toContain("open?.kind === 'credit'");
  });

  it('BillingPanel renders the over-invoiced and nothing-to-invoice final states', () => {
    expect(panel).toContain('COPY.auto.finalOverInvoiced');
    expect(panel).toContain('COPY.auto.finalNothingToInvoice');
  });

  it('InvoiceList offers the credit note only when creditMaxCents > 0', () => {
    expect(list).toContain('inv.creditMaxCents > 0');
    expect(list).toContain('canCredit');
    expect(list).toContain('LIST.credit');
  });

  it('PendingPayments is read-only (D-04)', () => {
    expect(pending).not.toContain('<form');
    expect(pending).not.toContain('<button');
    expect(pending).not.toContain('onClick');
    expect(pending).not.toContain('use server');
    expect(pending).not.toContain('@/lib/server');
    expect(pending).not.toMatch(/Action\b/);
  });
});
