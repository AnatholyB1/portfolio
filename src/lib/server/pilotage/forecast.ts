// Module pur. Projection mensuelle sur 6 mois (D-09). Entrées : factures émises impayées à échéance, retards au mois courant (D-08). Sorties : récurrents + coûts projet futurs. Le reste à facturer n'est jamais sur la courbe.
import type { UnpaidInvoice } from './billing';
import {
  effectiveProjectCosts,
  recurringForMonth,
  type CashBalanceRow,
  type ProjectCostRow,
  type RecurringRow,
} from './costs';
import { addMonths, horizonMonths, monthKey, monthsBetween } from './periods';

export type CashMonth = {
  month: string;
  openingCents: number;
  inflowCents: number;
  overdueInflowCents: number;
  outflowCents: number;
  closingCents: number;
};
export type CashProjection = { hasBalance: boolean; balanceAsOf: string | null; startCents: number; months: CashMonth[] };

function safe(n: number): number {
  if (!Number.isSafeInteger(n)) throw new Error(`Montant invalide: ${n}`);
  return n;
}

export function projectMargin(i: { signedCents: number; invoicedCents: number; costsCents: number }): number {
  return safe(Math.max(safe(i.signedCents), safe(i.invoicedCents)) - safe(i.costsCents));
}

export function remainingToInvoice(i: { signedCents: number; invoicedCents: number }): number {
  return Math.max(0, safe(safe(i.signedCents) - safe(i.invoicedCents)));
}

export function globalMargin(projectMargins: number[], recurringCents: number): number {
  return safe(projectMargins.reduce((s, m) => s + safe(m), 0) - safe(recurringCents));
}

export function realizedMargin(collectedCents: number, paidCostsCents: number): number {
  return safe(safe(collectedCents) - safe(paidCostsCents));
}

export function cashProjection(input: {
  today: string;
  balance: CashBalanceRow | null;
  unpaid: UnpaidInvoice[];
  recurring: RecurringRow[];
  projectCosts: ProjectCostRow[];
  collectedItems: { date: string; amountCents: number }[];
  months?: number;
}): CashProjection {
  const { today, balance } = input;
  const horizon = horizonMonths(today, input.months ?? 6);
  const current = monthKey(today);
  const effective = effectiveProjectCosts(input.projectCosts);

  let start = 0;
  if (balance) {
    start = safe(balance.amountCents);
    for (const c of input.collectedItems) {
      if (c.date > balance.asOf && c.date <= today) start += safe(c.amountCents);
    }
    for (const c of effective) {
      if (c.incurredOn > balance.asOf && c.incurredOn <= today) start -= safe(c.amountCents);
    }
    // Mois strictement entre le mois du solde et le mois courant : récurrents déjà échus.
    const first = addMonths(monthKey(balance.asOf), 1);
    const last = addMonths(current, -1);
    if (first <= last) {
      for (const m of monthsBetween(first, last)) start -= recurringForMonth(input.recurring, m).totalCents;
    }
  }

  const months: CashMonth[] = [];
  let opening = safe(start);
  for (const month of horizon) {
    let inflow = 0;
    let overdue = 0;
    for (const u of input.unpaid) {
      const late = u.dueDate === null || monthKey(u.dueDate) < current;
      const target = late ? current : monthKey(u.dueDate as string);
      if (target !== month) continue;
      inflow += safe(u.amountCents);
      if (late || u.overdue) overdue += u.amountCents;
    }
    let outflow = recurringForMonth(input.recurring, month).totalCents;
    for (const c of effective) {
      if (c.incurredOn > today && monthKey(c.incurredOn) === month) outflow += safe(c.amountCents);
    }
    const closing = safe(opening + inflow - outflow);
    months.push({
      month,
      openingCents: opening,
      inflowCents: inflow,
      overdueInflowCents: overdue,
      outflowCents: outflow,
      closingCents: closing,
    });
    opening = closing;
  }

  return { hasBalance: balance !== null, balanceAsOf: balance ? balance.asOf : null, startCents: start, months };
}
