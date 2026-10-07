import { describe, expect, it } from 'vitest';
import {
  ALL_TIME,
  addMonths,
  horizonMonths,
  inRange,
  monthKey,
  monthLongFr,
  monthShortFr,
  monthsBetween,
  monthsOfRange,
  parisToday,
  periodLabel,
  periodRange,
} from './periods';

describe('periodRange', () => {
  it('mois', () => {
    expect(periodRange('mois', '2026-10-07')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(periodRange('mois', '2028-02-10').to).toBe('2028-02-29');
    expect(periodRange('mois', '2026-02-10').to).toBe('2026-02-28');
  });
  it('trimestre', () => {
    expect(periodRange('trimestre', '2026-10-07')).toEqual({ from: '2026-10-01', to: '2026-12-31' });
    expect(periodRange('trimestre', '2026-05-31')).toEqual({ from: '2026-04-01', to: '2026-06-30' });
  });
  it('annee', () => {
    expect(periodRange('annee', '2026-10-07')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
});

describe('periodLabel', () => {
  it('libellés', () => {
    expect(periodLabel('mois', '2026-10-07')).toBe('Octobre 2026');
    expect(periodLabel('trimestre', '2026-10-07')).toBe('T4 2026');
    expect(periodLabel('annee', '2026-10-07')).toBe('Année 2026');
  });
});

describe('mois', () => {
  it('monthKey', () => expect(monthKey('2026-10-07')).toBe('2026-10'));
  it('addMonths', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
  it('monthsBetween', () => {
    expect(monthsBetween('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });
  it('monthsOfRange', () => {
    expect(monthsOfRange({ from: '2026-10-01', to: '2026-12-31' })).toEqual(['2026-10', '2026-11', '2026-12']);
  });
  it('horizonMonths', () => {
    expect(horizonMonths('2026-10-31')).toEqual(['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03']);
    expect(horizonMonths('2026-10-31', 2)).toEqual(['2026-10', '2026-11']);
  });
  it('libellés courts et longs', () => {
    expect(monthShortFr('2026-10')).toBe('oct.');
    expect(monthShortFr('2026-05')).toBe('mai');
    expect(monthLongFr('2026-10')).toBe('octobre 2026');
  });
});

describe('dates', () => {
  it('parisToday bascule au jour suivant à Paris', () => {
    expect(parisToday(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01');
  });
  it('inRange inclusif', () => {
    const r = { from: '2026-10-01', to: '2026-10-31' };
    expect(inRange('2026-10-01', r)).toBe(true);
    expect(inRange('2026-10-31', r)).toBe(true);
    expect(inRange('2026-11-01', r)).toBe(false);
    expect(inRange('2026-09-30', r)).toBe(false);
  });
  it('ALL_TIME contient tout', () => {
    expect(inRange('2026-10-07', ALL_TIME)).toBe(true);
  });
});
