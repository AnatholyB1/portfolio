// Cadence de relance partagee (D-01, D-16). Module pur : aucune I/O.
// Le chemin acompte reste en SQL ; seule la logique de paliers est partagee.
import { parisDateOf } from '@/lib/documents/dates';

export type CadenceStep = { stage: string; day: number };
export type Cadence = {
  client: readonly CadenceStep[];
  admin: CadenceStep | null;
};

export const STANDARD_REMINDER_CADENCE = {
  client: [
    { stage: 'd3', day: 3 },
    { stage: 'd7', day: 7 },
  ],
  admin: { stage: 'd14', day: 14 },
} as const satisfies Cadence;

export const REVIEW_REQUEST_CADENCE = {
  client: [
    { stage: 'd7', day: 7 },
    { stage: 'd21', day: 21 },
  ],
  admin: null,
} as const satisfies Cadence;

/** Au-dela, plus aucune relance (decision A3, Pitfall 4). */
export const REMINDER_MAX_AGE_DAYS = 60;

const utcMidnight = (ymd: string): number => {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Jours calendaires Europe/Paris entre deux instants (jamais negatif). */
export function parisElapsedDays(from: Date, now: Date): number {
  const diff = utcMidnight(parisDateOf(now)) - utcMidnight(parisDateOf(from));
  return Math.max(0, Math.round(diff / 86_400_000));
}

/** Palier le plus eleve atteint, ou null (aucun palier, ou au-dela de 60 jours). */
export function reminderStage(
  elapsedDays: number,
  steps: readonly CadenceStep[],
): string | null {
  if (elapsedDays > REMINDER_MAX_AGE_DAYS) return null;
  let best: CadenceStep | null = null;
  for (const s of steps) if (s.day <= elapsedDays && (!best || s.day > best.day)) best = s;
  return best ? best.stage : null;
}
