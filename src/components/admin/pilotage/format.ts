// Formatage d'affichage du pilotage. Pur, sans React. formatEuros (PDF) reste inchangé dans money.ts.
import { NBSP, formatSignedEuros } from '@/lib/documents/money';
import { monthShortFr } from '@/lib/server/pilotage/periods';

/** Montant avec le signe moins typographique U+2212 (défini une seule fois dans money.ts). */
export { formatSignedEuros };

/** Graduation d'axe : euros entiers (« 5 000 € ») pour garder des étiquettes courtes. */
export function formatAxisEuros(cents: number): string {
  const full = formatSignedEuros(cents);
  return cents % 100 === 0 ? full.replace(',00', '') : full;
}

/** Part en points de base (1250 = 12,5 %), arithmétique entière. */
export function formatShareBp(bp: number): string {
  const whole = Math.floor(bp / 100);
  const tenth = Math.floor((bp % 100) / 10);
  return `${whole}${tenth > 0 ? `,${tenth}` : ''}${NBSP}%`;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** 'YYYY-MM-DD' -> 'JJ/MM/AAAA', midi UTC pour éviter tout décalage de jour. */
export function formatDateFr(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

/** 'YYYY-MM' -> 'oct. 2026'. */
export function formatMonthFr(month: string): string {
  return `${monthShortFr(month)} ${month.slice(0, 4)}`;
}
