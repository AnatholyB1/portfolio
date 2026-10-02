import { conversionRate, formatEuroCents, type FunnelRow, type GroupBy } from '@/lib/admin/funnel';
import CostEditor from './CostEditor';
import './funnel.css';

const nf = new Intl.NumberFormat('fr-FR');
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function monthLabel(m: string): string {
  if (!m) return '';
  const d = new Date(`${m.slice(0, 7)}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? m : monthFmt.format(d);
}

type Stage = 'simulations' | 'leads' | 'qualified' | 'rdv' | 'signed';
const STAGES: { key: Stage; label: string; prev: keyof FunnelRow }[] = [
  { key: 'simulations', label: 'Simulations', prev: 'visits' },
  { key: 'leads', label: 'Leads', prev: 'simulations' },
  { key: 'qualified', label: 'Qualifiés', prev: 'leads' },
  { key: 'rdv', label: 'RDV', prev: 'qualified' },
  { key: 'signed', label: 'Signés', prev: 'rdv' },
];

function StageCell({ row, stage }: { row: FunnelRow; stage: (typeof STAGES)[number] }) {
  const n = row[stage.key];
  const rate = conversionRate(n, row[stage.prev] as number);
  return (
    <td className="pt-funnel-num">
      {nf.format(n)}
      {rate ? <span className="pt-funnel-rate">{rate}</span> : null}
    </td>
  );
}

export default function FunnelTable({ rows, by }: { rows: FunnelRow[]; by: GroupBy }) {
  const combined = by === 'all';
  const total = rows.reduce(
    (a, r) => ({
      visits: a.visits + r.visits,
      simulations: a.simulations + r.simulations,
      leads: a.leads + r.leads,
      qualified: a.qualified + r.qualified,
      rdv: a.rdv + r.rdv,
      signed: a.signed + r.signed,
    }),
    { visits: 0, simulations: 0, leads: 0, qualified: 0, rdv: 0, signed: 0 },
  );
  const totalRow: FunnelRow = {
    source: '',
    campaign: '',
    month: '',
    costPerRdvCents: null,
    ...total,
  };

  return (
    <div className="pt-funnel-scroll" tabIndex={0} role="region" aria-label="Tableau de l'entonnoir">
      <table className="pt-admin-table pt-funnel-table">
        <thead>
          <tr>
            <th scope="col">Source</th>
            <th scope="col">Campagne</th>
            <th scope="col">Mois</th>
            <th scope="col" className="pt-funnel-num">
              Visites
            </th>
            {STAGES.map((s) => (
              <th key={s.key} scope="col" className="pt-funnel-num">
                {s.label}
              </th>
            ))}
            <th scope="col" className="pt-funnel-num">
              Coût par RDV
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.source}|${r.campaign}|${r.month}`}>
              <th scope="row">{r.source || '—'}</th>
              <td>{by === 'month' || by === 'source' ? '—' : r.campaign || '(aucune)'}</td>
              <td>{monthLabel(r.month) || '—'}</td>
              <td className="pt-funnel-num">{nf.format(r.visits)}</td>
              {STAGES.map((s) => (
                <StageCell key={s.key} row={r} stage={s} />
              ))}
              <td className="pt-funnel-num">
                {combined ? (
                  <>
                    <span className={r.costPerRdvCents === null ? 'pt-lead-dim' : undefined}>
                      {formatEuroCents(r.costPerRdvCents)}
                    </span>
                    <CostEditor
                      source={r.source}
                      campaign={r.campaign}
                      month={r.month.slice(0, 7)}
                      currentCents={r.costPerRdvCents}
                    />
                  </>
                ) : (
                  <span className="pt-lead-dim">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="pt-funnel-total">
            <th scope="row">Total</th>
            <td />
            <td />
            <td className="pt-funnel-num">{nf.format(totalRow.visits)}</td>
            {STAGES.map((s) => (
              <StageCell key={s.key} row={totalRow} stage={s} />
            ))}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
