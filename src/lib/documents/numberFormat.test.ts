import { describe, expect, it } from 'vitest';
import { formatSignedEuros, formatEuros, MINUS_SIGN, NBSP } from './money';
import { actorKindLabel, countFr, formatAmountInput, formatQuantityMilli, pluralFr } from './numberFormat';

describe('formatQuantityMilli', () => {
  it('uses the French decimal comma and drops useless zeros', () => {
    expect(formatQuantityMilli(1500)).toBe('1,5');
    expect(formatQuantityMilli(1000)).toBe('1');
    expect(formatQuantityMilli(1250)).toBe('1,25');
    expect(formatQuantityMilli(1001)).toBe('1,001');
    expect(formatQuantityMilli(0)).toBe('0');
  });
  it('groups thousands with a no-break space', () => {
    expect(formatQuantityMilli(1234500)).toBe('1 234,5');
  });
});

describe('formatAmountInput', () => {
  it('always shows two decimals', () => {
    expect(formatAmountInput(1250)).toBe('12,50');
    expect(formatAmountInput(1200)).toBe('12,00');
    expect(formatAmountInput(5)).toBe('0,05');
    expect(formatAmountInput(0)).toBe('0,00');
  });
  it('keeps the sign for overdrafts', () => {
    expect(formatAmountInput(-1250)).toBe('-12,50');
  });
});

describe('plurals', () => {
  it('follows the French rule: 0 and 1 are singular', () => {
    expect(pluralFr(0, 'lead', 'leads')).toBe('lead');
    expect(pluralFr(1, 'lead', 'leads')).toBe('lead');
    expect(pluralFr(2, 'lead', 'leads')).toBe('leads');
    expect(countFr(1, 'anomalie')).toBe('1 anomalie');
    expect(countFr(3, 'anomalie')).toBe('3 anomalies');
    expect(countFr(2, 'journal', 'journaux')).toBe('2 journaux');
  });
});

describe('actorKindLabel', () => {
  it('maps the three actor kinds to human labels', () => {
    expect(actorKindLabel('client')).toBe('Client');
    expect(actorKindLabel('admin')).toBe('Sèvalys');
    expect(actorKindLabel('system')).toBe('Système');
  });
  it('falls back to the raw value, never throws on prototype keys', () => {
    expect(actorKindLabel('robot')).toBe('robot');
    expect(actorKindLabel('constructor')).toBe('constructor');
  });
});

describe('minus sign unification', () => {
  it('screen amounts use U+2212 while PDF amounts keep the ASCII hyphen', () => {
    expect(formatSignedEuros(-123450)).toBe(`${MINUS_SIGN}1${NBSP}234,50${NBSP}€`);
    expect(formatEuros(-123450)).toBe(`-1${NBSP}234,50${NBSP}€`);
    expect(formatSignedEuros(100)).toBe(formatEuros(100));
  });
});
