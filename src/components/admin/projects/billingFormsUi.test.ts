import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(process.cwd(), 'src/components/admin/projects/billing');
const period = readFileSync(join(DIR, 'PeriodInvoiceForm.tsx'), 'utf8');
const credit = readFileSync(join(DIR, 'CreditNoteForm.tsx'), 'utf8');

const count = (src: string, needle: string) => src.split(needle).length - 1;

describe('billing admin forms (source assertions)', () => {
  it.each([
    ['PeriodInvoiceForm', period],
    ['CreditNoteForm', credit],
  ])('%s takes copy from PROJECT_COPY.payments.admin', (_n, src) => {
    expect(src).toContain('PROJECT_COPY.payments.admin');
    for (const literal of [
      'Émettre la facture',
      "Émettre l'avoir",
      'Rembourser aussi le client par Stripe',
      'Aperçu non conservé',
    ]) {
      expect(src).not.toContain(literal);
    }
  });

  it.each([
    ['PeriodInvoiceForm', period],
    ['CreditNoteForm', credit],
  ])('%s generates its idempotency uuid once and never uses Intl or heavy libs', (_n, src) => {
    expect(count(src, 'crypto.randomUUID')).toBe(1);
    expect(src).not.toMatch(/Intl\./);
    expect(src).not.toMatch(/from ['"](gsap|three)|cinema|cursor/i);
  });

  it.each([
    ['PeriodInvoiceForm', period],
    ['CreditNoteForm', credit],
  ])('%s has the issue button and the confirm button as the only primaries', (_n, src) => {
    expect(count(src, 'pt-btn-primary')).toBe(2);
  });

  it('PeriodInvoiceForm limits lines, labels removal via copy, gates issue on a current preview', () => {
    expect(period).toContain('MAX_LINES = 30');
    expect(period).toContain('COPY.removeLine(');
    expect(period).toContain('disabled={!previewCurrent || pending}');
    expect(period).toContain('previewKey !== dirtyKey');
    expect(period).toContain('invoiceId');
    expect(period).toContain('aria-live="polite"');
    expect(period).toContain('aria-invalid');
  });

  it('CreditNoteForm requires the motif, caps it at 1000, gates the refund checkbox', () => {
    expect(credit).toContain('MAX_REASON = 1000');
    expect(credit).toContain('maxLength={MAX_REASON}');
    expect(credit).toContain('reasonValid');
    expect(credit).toMatch(/origin\.refundEligible \? \(/);
    expect(credit).toContain('refundRequested: refundActive');
    expect(credit).toContain('creditNoteId');
  });
});
