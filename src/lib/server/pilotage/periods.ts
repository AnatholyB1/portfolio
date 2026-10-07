// Module pur, sûr côté client. Dates civiles Europe/Paris en chaînes 'YYYY-MM-DD', mois 'YYYY-MM'. Aucune horloge.
import { parisDateOf } from '@/lib/documents/dates';

export type PeriodKind = 'mois' | 'trimestre' | 'annee';
export type DateRange = { from: string; to: string };

export const ALL_TIME: DateRange = { from: '0001-01-01', to: '9999-12-31' };

const SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const LONG = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function parts(date: string): { y: number; m: number } {
  const [y, m] = date.split('-').map(Number);
  return { y, m };
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function addMonths(month: string, n: number): string {
  const { y, m } = parts(month);
  const idx = y * 12 + (m - 1) + n;
  return `${pad(Math.floor(idx / 12), 4)}-${pad((idx % 12) + 1)}`;
}

export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = monthKey(from); k <= monthKey(to); k = addMonths(k, 1)) out.push(k);
  return out;
}

export function monthsOfRange(r: DateRange): string[] {
  return monthsBetween(r.from, r.to);
}

export function horizonMonths(today: string, count = 6): string[] {
  const start = monthKey(today);
  return Array.from({ length: count }, (_, i) => addMonths(start, i));
}

export function periodRange(kind: PeriodKind, today: string): DateRange {
  const { y, m } = parts(today);
  let m1: number;
  let m2: number;
  if (kind === 'mois') {
    m1 = m;
    m2 = m;
  } else if (kind === 'trimestre') {
    m1 = Math.floor((m - 1) / 3) * 3 + 1;
    m2 = m1 + 2;
  } else {
    m1 = 1;
    m2 = 12;
  }
  return { from: `${pad(y, 4)}-${pad(m1)}-01`, to: `${pad(y, 4)}-${pad(m2)}-${pad(daysInMonth(y, m2))}` };
}

export function periodLabel(kind: PeriodKind, today: string): string {
  const { y, m } = parts(today);
  if (kind === 'mois') return `${LONG[m - 1][0].toUpperCase()}${LONG[m - 1].slice(1)} ${y}`;
  if (kind === 'trimestre') return `T${Math.floor((m - 1) / 3) + 1} ${y}`;
  return `Année ${y}`;
}

export function inRange(date: string, r: DateRange): boolean {
  return r.from <= date && date <= r.to;
}

export function monthShortFr(month: string): string {
  return SHORT[parts(month).m - 1];
}

export function monthLongFr(month: string): string {
  const { y, m } = parts(month);
  return `${LONG[m - 1]} ${y}`;
}

export function parisToday(now: Date): string {
  return parisDateOf(now);
}
