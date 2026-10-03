// Module pur, sûr côté client. Montants en centimes entiers (D-06).
// Jamais Intl fr-FR pour les montants (U+202F illisible à l'extraction).

export const NBSP = " ";

/** Parse une saisie en euros vers des centimes entiers, ou null si invalide. */
export function toCents(input: string): number | null {
  const s = input.replace(/\s/g, "").replace(",", ".");
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
  return Number.isSafeInteger(cents) ? cents : null;
}

export function lineTotalCents(
  quantity: number,
  unitPriceCents: number,
): number {
  const total = quantity * unitPriceCents;
  if (
    !Number.isSafeInteger(quantity) ||
    !Number.isSafeInteger(unitPriceCents) ||
    !Number.isSafeInteger(total)
  ) {
    throw new Error("invalid_amount");
  }
  return total;
}

export function quoteTotals(
  lines: { quantity: number; unitPriceCents: number }[],
  depositPercent: number,
): { totalCents: number; depositCents: number; balanceCents: number } {
  const totalCents = lines.reduce(
    (sum, l) => sum + lineTotalCents(l.quantity, l.unitPriceCents),
    0,
  );
  // Demi supérieur, une seule fois, sur entiers. Pas de TVA calculée (D-11).
  const depositCents = Math.floor((totalCents * depositPercent + 50) / 100);
  return { totalCents, depositCents, balanceCents: totalCents - depositCents };
}

export function formatEuros(cents: number): string {
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toString();
  const frac = (abs % 100).toString().padStart(2, "0");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${cents < 0 ? "-" : ""}${grouped},${frac}${NBSP}€`;
}

export function formatPercent(p: number): string {
  return `${p}${NBSP}%`;
}
