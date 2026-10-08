// Formatage d'affichage fr-FR partagé par l'admin. Pur, sans Intl (les espaces insécables fines
// de Intl sont illisibles à l'extraction, voir money.ts). Les montants restent dans money.ts.

/** Quantité en millièmes (1500 -> "1,5", 2000 -> "2", 1250 -> "1,25"), sans zéros inutiles. */
export function formatQuantityMilli(milli: number): string {
  if (!Number.isFinite(milli)) return '';
  const neg = milli < 0;
  const abs = Math.abs(Math.round(milli));
  const whole = Math.floor(abs / 1000);
  const frac = String(abs % 1000)
    .padStart(3, '0')
    .replace(/0+$/, '');
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${neg ? '−' : ''}${grouped}${frac ? `,${frac}` : ''}`;
}

/** Valeur de saisie d'un montant en euros, toujours deux décimales ("12,50"), virgule française. */
export function formatAmountInput(cents: number): string {
  if (!Number.isSafeInteger(cents)) return '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}${whole},${frac}`;
}

/** Règle française : 0 et 1 prennent le singulier. */
export function pluralFr(n: number, one: string, many: string): string {
  return Math.abs(n) >= 2 ? many : one;
}

/** "1 lead", "2 leads", "0 lead". `many` vaut `one + 's'` par défaut. */
export function countFr(n: number, one: string, many: string = `${one}s`): string {
  return `${n} ${pluralFr(n, one, many)}`;
}

const ACTOR_LABELS: Record<string, string> = {
  system: 'Système',
  admin: 'Sèvalys',
  client: 'Client',
};

/** Libellé humain d'un acteur de journal (system | admin | client). Inconnu : valeur brute. */
export function actorKindLabel(kind: string): string {
  return Object.prototype.hasOwnProperty.call(ACTOR_LABELS, kind) ? ACTOR_LABELS[kind] : kind;
}
