import { describe, it, expect } from 'vitest';
import {
  stripControlChars,
  parseCriteria,
  quoteInputSchema,
  specInputSchema,
  contractInputSchema,
  acceptanceInputSchema,
  invoicePreviewSchema,
  documentInputSchema,
} from './schemas';

const ids = {
  projectId: '11111111-1111-4111-8111-111111111111',
  documentId: '22222222-2222-4222-8222-222222222222',
};
const line = { designation: 'Site vitrine', quantity: 1, unitPriceCents: 150000 };
const quote = (over: Record<string, unknown> = {}) => ({
  ...ids,
  docType: 'quote',
  lines: [line],
  depositPercent: 30,
  validityDays: 30,
  leadTime: '6 semaines',
  ...over,
});

describe('stripControlChars', () => {
  it('removes control characters but keeps newline and tab', () => {
    expect(stripControlChars('a\u0000b\u0007c\u000bd\u000ce\u001ff\u007fg')).toBe('abcdefg');
    expect(stripControlChars('a\nb\tc')).toBe('a\nb\tc');
  });
});

describe('quoteInputSchema', () => {
  it('accepts a valid quote and applies defaults', () => {
    const r = quoteInputSchema.parse({ ...quote(), depositPercent: undefined, validityDays: undefined });
    expect(r.depositPercent).toBe(30);
    expect(r.validityDays).toBe(30);
  });
  it('enforces 1..30 lines', () => {
    expect(quoteInputSchema.safeParse(quote({ lines: [] })).success).toBe(false);
    expect(quoteInputSchema.safeParse(quote({ lines: Array(30).fill(line) })).success).toBe(true);
    expect(quoteInputSchema.safeParse(quote({ lines: Array(31).fill(line) })).success).toBe(false);
  });
  it('trims and strips control chars in designation, enforces 1..200', () => {
    const r = quoteInputSchema.parse(quote({ lines: [{ ...line, designation: '  Site\u0000 web  ' }] }));
    expect(r.lines[0].designation).toBe('Site web');
    expect(quoteInputSchema.safeParse(quote({ lines: [{ ...line, designation: '   ' }] })).success).toBe(false);
    expect(quoteInputSchema.safeParse(quote({ lines: [{ ...line, designation: 'x'.repeat(201) }] })).success).toBe(false);
  });
  it('bounds quantity, unit price, deposit, validity, lead time', () => {
    const bad = (o: Record<string, unknown>) => quoteInputSchema.safeParse(quote(o)).success;
    expect(bad({ lines: [{ ...line, quantity: 0 }] })).toBe(false);
    expect(bad({ lines: [{ ...line, quantity: 10001 }] })).toBe(false);
    expect(bad({ lines: [{ ...line, quantity: 1.5 }] })).toBe(false);
    expect(bad({ lines: [{ ...line, unitPriceCents: -1 }] })).toBe(false);
    expect(bad({ lines: [{ ...line, unitPriceCents: 100000001 }] })).toBe(false);
    expect(bad({ lines: [{ ...line, unitPriceCents: 0 }] })).toBe(true);
    expect(bad({ depositPercent: 101 })).toBe(false);
    expect(bad({ depositPercent: 0 })).toBe(true);
    expect(bad({ validityDays: 0 })).toBe(false);
    expect(bad({ validityDays: 366 })).toBe(false);
    expect(bad({ leadTime: '' })).toBe(false);
    expect(bad({ leadTime: 'x'.repeat(121) })).toBe(false);
  });
  it('requires uuid ids', () => {
    expect(quoteInputSchema.safeParse(quote({ projectId: 'nope' })).success).toBe(false);
    expect(quoteInputSchema.safeParse(quote({ documentId: 'nope' })).success).toBe(false);
  });
});

describe('parseCriteria', () => {
  it('splits, trims, drops empties and list markers', () => {
    expect(parseCriteria('- Un\n\n  2. Deux  \n3) Trois\nQuatre')).toEqual(['Un', 'Deux', 'Trois', 'Quatre']);
  });
});

describe('specInputSchema', () => {
  const spec = (over: Record<string, unknown> = {}) => ({
    ...ids,
    docType: 'spec',
    context: 'Contexte',
    scope: 'Périmètre',
    deliverables: 'Livrables',
    acceptanceCriteria: '- A\n- B',
    ...over,
  });
  it('parses and exposes acceptanceCriteriaList, defaults optional sections', () => {
    const r = specInputSchema.parse(spec());
    expect(r.acceptanceCriteriaList).toEqual(['A', 'B']);
    expect(r.outOfScope).toBe('');
    expect(r.planning).toBe('');
  });
  it('requires the four mandatory sections and caps at 4000', () => {
    expect(specInputSchema.safeParse(spec({ context: '' })).success).toBe(false);
    expect(specInputSchema.safeParse(spec({ scope: 'x'.repeat(4001) })).success).toBe(false);
    expect(specInputSchema.safeParse(spec({ outOfScope: 'x'.repeat(4001) })).success).toBe(false);
  });
  it('caps criteria count and length', () => {
    const many = Array.from({ length: 51 }, (_, i) => `c${i}`).join('\n');
    expect(specInputSchema.safeParse(spec({ acceptanceCriteria: many })).success).toBe(false);
    const ok = Array.from({ length: 50 }, (_, i) => `c${i}`).join('\n');
    expect(specInputSchema.safeParse(spec({ acceptanceCriteria: ok })).success).toBe(true);
    expect(specInputSchema.safeParse(spec({ acceptanceCriteria: 'x'.repeat(301) })).success).toBe(false);
  });
  it('rejects input that yields no criteria', () => {
    expect(specInputSchema.safeParse(spec({ acceptanceCriteria: '- \n\n' })).success).toBe(false);
  });
});

describe('contractInputSchema', () => {
  it('accepts an optional ISO startDate and strips unknown keys', () => {
    const r = contractInputSchema.parse({ ...ids, docType: 'contract', startDate: '2026-11-02', clause: 'x' });
    expect(r.startDate).toBe('2026-11-02');
    expect('clause' in r).toBe(false);
    expect(contractInputSchema.safeParse({ ...ids, docType: 'contract' }).success).toBe(true);
    expect(contractInputSchema.safeParse({ ...ids, docType: 'contract', startDate: '02/11/2026' }).success).toBe(false);
  });
});

describe('acceptanceInputSchema', () => {
  it('requires deliveryDate and caps reservations', () => {
    const base = { ...ids, docType: 'acceptance', deliveryDate: '2026-12-01' };
    expect(acceptanceInputSchema.safeParse(base).success).toBe(true);
    expect(acceptanceInputSchema.safeParse({ ...base, deliveryDate: undefined }).success).toBe(false);
    expect(acceptanceInputSchema.safeParse({ ...base, reservations: 'x'.repeat(2001) }).success).toBe(false);
  });
});

describe('invoicePreviewSchema', () => {
  it('requires kind and serviceDate, caps orderNumber', () => {
    const base = { ...ids, docType: 'invoice', kind: 'deposit', serviceDate: '2026-12-01' };
    expect(invoicePreviewSchema.safeParse(base).success).toBe(true);
    expect(invoicePreviewSchema.safeParse({ ...base, kind: 'other' }).success).toBe(false);
    expect(invoicePreviewSchema.safeParse({ ...base, serviceDate: undefined }).success).toBe(false);
    expect(invoicePreviewSchema.safeParse({ ...base, orderNumber: 'x'.repeat(41) }).success).toBe(false);
  });
});

describe('documentInputSchema', () => {
  it('dispatches on docType and rejects unknown types', () => {
    expect(documentInputSchema.safeParse(quote()).success).toBe(true);
    expect(documentInputSchema.safeParse({ ...ids, docType: 'other' }).success).toBe(false);
  });
});
