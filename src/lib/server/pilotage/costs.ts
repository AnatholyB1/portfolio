// Module pur. Coûts réels uniquement (D-05) : aucun taux journalier, aucun temps. Ajout seul : version = nouvelle ligne de la série, arrêt = ligne stopped, annulation = ligne voids_cost_id.
import type { Aggregate } from './billing';
import { monthKey, monthsOfRange, type DateRange, inRange } from './periods';

export type CostCategory = 'sous_traitance' | 'outils' | 'hebergement' | 'publicite' | 'licences' | 'autre';
export const COST_CATEGORIES: CostCategory[] = ['sous_traitance', 'outils', 'hebergement', 'publicite', 'licences', 'autre'];

export type RecurringRow = {
  id: number;
  seriesId: string;
  label: string;
  category: CostCategory;
  amountCents: number;
  frequency: 'monthly' | 'yearly';
  startsOn: string;
  endsOn: string | null;
  stopped: boolean;
  createdAt: string;
};
export type ProjectCostRow = {
  id: number;
  projectId: string;
  incurredOn: string;
  category: CostCategory;
  label: string;
  amountCents: number;
  vatCents: number | null;
  voidsCostId: number | null;
  createdAt: string;
};
export type CashBalanceRow = { id: number; asOf: string; amountCents: number; note: string | null; createdAt: string };
export type CostItem = {
  source: 'recurrent' | 'projet';
  refId: number;
  projectId: string | null;
  date: string;
  label: string;
  category: CostCategory;
  amountCents: number;
};
export type RecurringStatus = 'Active' | 'Arrêtée' | 'Remplacée';

function safe(n: number): number {
  if (!Number.isSafeInteger(n)) throw new Error(`Montant invalide: ${n}`);
  return n;
}

// Ordre (mois de starts_on, id), identique à la RPC sv_stop_recurring_cost.
function newer(a: RecurringRow, b: RecurringRow): boolean {
  const ma = monthKey(a.startsOn);
  const mb = monthKey(b.startsOn);
  return ma !== mb ? ma > mb : a.id > b.id;
}

export function effectiveVersionFor(rows: RecurringRow[], month: string): RecurringRow | null {
  let best: RecurringRow | null = null;
  for (const r of rows) {
    if (monthKey(r.startsOn) > month) continue;
    if (best === null || newer(r, best)) best = r;
  }
  return best;
}

function bySeries(rows: RecurringRow[]): Map<string, RecurringRow[]> {
  const m = new Map<string, RecurringRow[]>();
  for (const r of rows) {
    const list = m.get(r.seriesId);
    if (list) list.push(r);
    else m.set(r.seriesId, [r]);
  }
  return m;
}

export function recurringForMonth(rows: RecurringRow[], month: string): Aggregate<CostItem> {
  const items: CostItem[] = [];
  let total = 0;
  for (const series of bySeries(rows).values()) {
    const v = effectiveVersionFor(series, month);
    if (!v || v.stopped) continue;
    if (v.endsOn !== null && monthKey(v.endsOn) < month) continue;
    safe(v.amountCents);
    // Hypothèse A2 : un coût annuel tombe une seule fois, dans le mois anniversaire de son début.
    if (v.frequency === 'yearly' && month.slice(5) !== v.startsOn.slice(5, 7)) continue;
    total += v.amountCents;
    items.push({
      source: 'recurrent',
      refId: v.id,
      projectId: null,
      date: `${month}-01`,
      label: v.label,
      category: v.category,
      amountCents: v.amountCents,
    });
  }
  return { totalCents: safe(total), items };
}

export function recurringInRange(rows: RecurringRow[], range: DateRange, maxMonth?: string): Aggregate<CostItem> {
  const items: CostItem[] = [];
  let total = 0;
  for (const month of monthsOfRange(range)) {
    if (maxMonth !== undefined && month > maxMonth) continue;
    const a = recurringForMonth(rows, month);
    total += a.totalCents;
    items.push(...a.items);
  }
  return { totalCents: safe(total), items };
}

export function effectiveProjectCosts(rows: ProjectCostRow[]): ProjectCostRow[] {
  const voided = new Set<number>();
  for (const r of rows) if (r.voidsCostId !== null) voided.add(r.voidsCostId);
  return rows.filter((r) => r.voidsCostId === null && !voided.has(r.id));
}

export function projectCostsInRange(rows: ProjectCostRow[], range: DateRange): Aggregate<CostItem> {
  const items: CostItem[] = [];
  let total = 0;
  for (const r of effectiveProjectCosts(rows)) {
    if (!inRange(r.incurredOn, range)) continue;
    total += safe(r.amountCents);
    items.push({
      source: 'projet',
      refId: r.id,
      projectId: r.projectId,
      date: r.incurredOn,
      label: r.label,
      category: r.category,
      amountCents: r.amountCents,
    });
  }
  return { totalCents: safe(total), items };
}

export function currentBalance(rows: CashBalanceRow[]): CashBalanceRow | null {
  let best: CashBalanceRow | null = null;
  for (const r of rows) if (best === null || r.id > best.id) best = r;
  return best;
}

export function recurringRegister(
  rows: RecurringRow[],
  today: string,
): { seriesId: string; versions: (RecurringRow & { status: RecurringStatus })[] }[] {
  const out: { seriesId: string; versions: (RecurringRow & { status: RecurringStatus })[] }[] = [];
  for (const [seriesId, list] of bySeries(rows)) {
    const sorted = [...list].sort((a, b) => (newer(a, b) ? -1 : newer(b, a) ? 1 : 0));
    const versions = sorted.map((v, i) => {
      let status: RecurringStatus = 'Remplacée';
      if (i === 0) status = v.stopped || (v.endsOn !== null && v.endsOn < today) ? 'Arrêtée' : 'Active';
      return { ...v, status };
    });
    out.push({ seriesId, versions });
  }
  return out;
}

export function projectCostRegister(rows: ProjectCostRow[]): (ProjectCostRow & { status: 'Valide' | 'Annulé' })[] {
  const voided = new Set<number>();
  for (const r of rows) if (r.voidsCostId !== null) voided.add(r.voidsCostId);
  return rows
    .filter((r) => r.voidsCostId === null)
    .map((r) => ({ ...r, status: voided.has(r.id) ? ('Annulé' as const) : ('Valide' as const) }));
}
