// Aides pures pour l'écran entonnoir (LEAD-08). Aucune dépendance serveur.

export type FunnelRow = {
  source: string;
  campaign: string;
  month: string;
  visits: number;
  simulations: number;
  leads: number;
  qualified: number;
  rdv: number;
  signed: number;
  costPerRdvCents: number | null;
  nonconformingLeads?: number;
};

export type GroupBy = 'source' | 'campaign' | 'month' | 'all';

const STAGES = ['visits', 'simulations', 'leads', 'qualified', 'rdv', 'signed'] as const;

export function groupFunnelRows(rows: FunnelRow[], by: GroupBy): FunnelRow[] {
  if (by === 'all') return rows;
  const map = new Map<string, FunnelRow>();
  for (const r of rows) {
    const key = by === 'source' ? r.source : by === 'campaign' ? r.campaign : r.month;
    const acc = map.get(key);
    if (!acc) {
      map.set(key, {
        source: by === 'source' ? r.source : '',
        campaign: by === 'campaign' ? r.campaign : '',
        month: by === 'month' ? r.month : '',
        visits: r.visits,
        simulations: r.simulations,
        leads: r.leads,
        qualified: r.qualified,
        rdv: r.rdv,
        signed: r.signed,
        costPerRdvCents: null,
        nonconformingLeads: r.nonconformingLeads ?? 0,
      });
    } else {
      for (const s of STAGES) acc[s] += r[s];
      acc.nonconformingLeads = (acc.nonconformingLeads ?? 0) + (r.nonconformingLeads ?? 0);
    }
  }
  return Array.from(map.values());
}

export function conversionRate(n: number, prev: number): string | null {
  if (!prev) return null;
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format((n / prev) * 100)} %`;
}

export function formatEuroCents(c: number | null): string {
  if (c === null || c === undefined) return 'Non saisi';
  const euros = c / 100;
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(euros)} €`;
}

export function averageCostPerRdv(rows: FunnelRow[]): number | null {
  let weighted = 0;
  let rdv = 0;
  for (const r of rows) {
    if (r.costPerRdvCents !== null && r.rdv > 0) {
      weighted += r.costPerRdvCents * r.rdv;
      rdv += r.rdv;
    }
  }
  return rdv > 0 ? Math.round(weighted / rdv) : null;
}

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const MAX_MONTHS = 36;

function toIndex(m: string): number {
  const [y, mo] = m.split('-').map(Number);
  return y * 12 + (mo - 1);
}
function fromIndex(i: number): string {
  const y = Math.floor(i / 12);
  return `${y}-${String((i % 12) + 1).padStart(2, '0')}`;
}

export function monthRange(
  from?: string,
  to?: string,
  now: Date = new Date(),
): { from: string; to: string } {
  const cur = now.getUTCFullYear() * 12 + now.getUTCMonth();
  let a = from && MONTH_RE.test(from) ? toIndex(from) : cur - 5;
  let b = to && MONTH_RE.test(to) ? toIndex(to) : cur;
  if (a > b) [a, b] = [b, a];
  if (b - a + 1 > MAX_MONTHS) a = b - (MAX_MONTHS - 1);
  return { from: fromIndex(a), to: fromIndex(b) };
}

export function monthEndExclusive(month: string): string {
  return `${fromIndex(toIndex(month) + 1)}-01`;
}

export function attachNonconforming(
  rows: FunnelRow[],
  flagged: { source: string; campaign: string | null; createdAt: string }[],
): FunnelRow[] {
  const counts = new Map<string, number>();
  for (const f of flagged) {
    const d = new Date(f.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
    const key = `${f.source}|${f.campaign ?? ''}|${month}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return rows.map((r) => ({
    ...r,
    nonconformingLeads: counts.get(`${r.source}|${r.campaign}|${r.month.slice(0, 7)}-01`) ?? 0,
  }));
}
