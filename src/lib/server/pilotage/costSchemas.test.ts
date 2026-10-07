import { describe, expect, it } from 'vitest';
import {
  cashBalanceSchema,
  projectCostSchema,
  recurringCostSchema,
  stopRecurringSchema,
  toSignedCents,
  voidCostSchema,
} from './costSchemas';

const AMOUNT_MSG = 'Saisissez un montant supérieur à 0, par exemple 12,50.';
const recurring = {
  label: ' Figma ',
  category: 'outils',
  amount: '12,5',
  frequency: 'monthly',
  startsOn: '2026-10-01',
};

function messages(r: { success: boolean; error?: { issues: { message: string }[] } }) {
  return r.error?.issues.map((i) => i.message) ?? [];
}

describe('recurringCostSchema', () => {
  it('accepts and normalises a valid recurring cost', () => {
    const r = recurringCostSchema.safeParse(recurring);
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({
      label: 'Figma',
      category: 'outils',
      amountCents: 1250,
      frequency: 'monthly',
      startsOn: '2026-10-01',
      endsOn: null,
      seriesId: null,
    });
  });

  it.each(['0', '-3', 'abc', '12,345'])('rejects amount %s', (amount) => {
    const r = recurringCostSchema.safeParse({ ...recurring, amount });
    expect(r.success).toBe(false);
    expect(messages(r)).toContain(AMOUNT_MSG);
  });

  it('rejects empty and overlong labels', () => {
    for (const label of ['', ' ', 'a'.repeat(121)]) {
      const r = recurringCostSchema.safeParse({ ...recurring, label });
      expect(messages(r)).toContain('Indiquez un libellé (120 caractères maximum).');
    }
  });

  it('rejects end before start', () => {
    const r = recurringCostSchema.safeParse({ ...recurring, endsOn: '2026-09-01' });
    expect(messages(r)).toContain('La date de fin doit suivre la date de début.');
  });

  it('rejects unknown category and frequency', () => {
    expect(recurringCostSchema.safeParse({ ...recurring, category: 'x' }).success).toBe(false);
    expect(recurringCostSchema.safeParse({ ...recurring, frequency: 'weekly' }).success).toBe(false);
  });

  it('keeps a series id for a new version', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const r = recurringCostSchema.safeParse({ ...recurring, seriesId: id });
    expect(r.data?.seriesId).toBe(id);
  });
});

describe('projectCostSchema', () => {
  const base = {
    projectId: '11111111-1111-4111-8111-111111111111',
    incurredOn: '2026-10-02',
    category: 'autre',
    label: 'Photos',
    amount: '12,5',
  };
  it('requires a uuid project id', () => {
    expect(projectCostSchema.safeParse({ ...base, projectId: 'nope' }).success).toBe(false);
  });
  it('maps empty vat to null and 2,00 to 200', () => {
    expect(projectCostSchema.safeParse({ ...base, vat: '' }).data?.vatCents).toBeNull();
    expect(projectCostSchema.safeParse({ ...base, vat: '2,00' }).data?.vatCents).toBe(200);
    expect(projectCostSchema.safeParse(base).data?.amountCents).toBe(1250);
  });
});

describe('cashBalanceSchema', () => {
  const base = { amount: '-1 250,00', asOf: '2026-10-01' };
  it('accepts negative amounts, ASCII and U+2212', () => {
    expect(cashBalanceSchema.safeParse(base).data?.amountCents).toBe(-125000);
    expect(cashBalanceSchema.safeParse({ ...base, amount: '−1 250,00' }).data?.amountCents).toBe(
      -125000,
    );
    expect(cashBalanceSchema.safeParse({ ...base, amount: '0' }).data?.amountCents).toBe(0);
  });
  it('rejects a note over 200 characters', () => {
    expect(cashBalanceSchema.safeParse({ ...base, note: 'a'.repeat(201) }).success).toBe(false);
  });
});

describe('stop and void schemas', () => {
  it('maps fromMonth to the first of the month', () => {
    const r = stopRecurringSchema.safeParse({
      seriesId: '11111111-1111-4111-8111-111111111111',
      fromMonth: '2026-11',
    });
    expect(r.data?.from).toBe('2026-11-01');
  });
  it('requires a positive integer cost id', () => {
    expect(voidCostSchema.safeParse({ costId: '12' }).data?.costId).toBe(12);
    expect(voidCostSchema.safeParse({ costId: '0' }).success).toBe(false);
    expect(voidCostSchema.safeParse({ costId: '1.5' }).success).toBe(false);
  });
});

describe('toSignedCents', () => {
  it('handles signs and malformed input', () => {
    expect(toSignedCents('12')).toBe(1200);
    expect(toSignedCents('-0,5')).toBe(-50);
    expect(toSignedCents('1.2.3')).toBeNull();
  });
});
