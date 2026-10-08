import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';
import FunnelKpis from '@/components/admin/funnel/FunnelKpis';
import FunnelTable from '@/components/admin/funnel/FunnelTable';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import {
  attachNonconforming,
  averageCostPerRdv,
  groupFunnelRows,
  monthEndExclusive,
  monthRange,
  type FunnelRow,
  type GroupBy,
} from '@/lib/admin/funnel';
import { requireAdmin } from '@/lib/server/auth/dal';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';
import '@/components/admin/funnel/funnel.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Entonnoir' };

type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const PAR: Record<string, GroupBy> = {
  source: 'source',
  campagne: 'campaign',
  mois: 'month',
  tout: 'all',
};

const OPTIONS: { value: string; label: string }[] = [
  { value: 'source', label: 'Source' },
  { value: 'campagne', label: 'Campagne' },
  { value: 'mois', label: 'Mois' },
  { value: 'tout', label: 'Source + campagne + mois' },
];

type DbRow = {
  source: string;
  campaign: string | null;
  month: string;
  visits: number | string;
  simulations: number | string;
  leads: number | string;
  qualified: number | string;
  rdv: number | string;
  signed: number | string;
  cost_per_rdv_cents: number | null;
};

export default async function AdminFunnelPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Lecture via le client RLS (politique admin), jamais service_role.
  const { supabase } = await requireAdmin();
  const sp = await searchParams;

  const parKey = one(sp.par) ?? 'tout';
  const parKeyValid = Object.prototype.hasOwnProperty.call(PAR, parKey) ? parKey : 'tout';
  const by = PAR[parKeyValid];
  const range = monthRange(one(sp.du), one(sp.au));

  const { data } = await supabase
    .from('sv_funnel_v')
    .select(
      'source, campaign, month, visits, simulations, leads, qualified, rdv, signed, cost_per_rdv_cents',
    )
    .gte('month', `${range.from}-01`)
    .lte('month', `${range.to}-01`)
    .order('month', { ascending: false })
    .order('source', { ascending: true });

  // Leads dont la source est hors convention (D-04) : lecture RLS directe de
  // sv_leads, sans toucher à la vue. En cas d'erreur, l'entonnoir s'affiche quand même.
  const { data: flaggedData, error: flaggedError } = await supabase
    .from('sv_leads')
    .select('source_source, source_campaign, created_at')
    .not('source_nonconformity', 'is', null)
    .gte('created_at', `${range.from}-01`)
    .lt('created_at', monthEndExclusive(range.to));
  const flagged = flaggedError
    ? []
    : (
        (flaggedData ?? []) as unknown as {
          source_source: string | null;
          source_campaign: string | null;
          created_at: string;
        }[]
      ).map((f) => ({
        source: f.source_source ?? '',
        campaign: f.source_campaign,
        createdAt: f.created_at,
      }));

  const baseRows: FunnelRow[] = ((data ?? []) as unknown as DbRow[]).map((r) => ({
    source: r.source,
    campaign: r.campaign ?? '',
    month: r.month,
    visits: Number(r.visits),
    simulations: Number(r.simulations),
    leads: Number(r.leads),
    qualified: Number(r.qualified),
    rdv: Number(r.rdv),
    signed: Number(r.signed),
    costPerRdvCents: r.cost_per_rdv_cents,
  }));

  const rows = attachNonconforming(baseRows, flagged);
  const nonconformingTotal = rows.reduce((a, r) => a + (r.nonconformingLeads ?? 0), 0);
  const grouped = groupFunnelRows(rows, by);
  const totals = rows.reduce(
    (a, r) => ({ leads: a.leads + r.leads, rdv: a.rdv + r.rdv, signed: a.signed + r.signed }),
    { leads: 0, rdv: 0, signed: 0 },
  );

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <AdminNav current="entonnoir" />
          <section className="pt-card" aria-labelledby="funnel-title">
            <h1 id="funnel-title" className="pt-heading" style={{ marginBottom: 24 }}>
              Entonnoir
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <form method="get" className="pt-funnel-controls">
                <fieldset className="pt-seg">
                  <legend>Regrouper par</legend>
                  {OPTIONS.map((o) => (
                    <label key={o.value}>
                      <input
                        type="radio"
                        name="par"
                        value={o.value}
                        defaultChecked={o.value === parKeyValid}
                      />
                      {o.label}
                    </label>
                  ))}
                </fieldset>
                <div>
                  <label htmlFor="funnel-du" className="pt-lead-label">
                    Du
                  </label>
                  <input id="funnel-du" type="month" name="du" defaultValue={range.from} />
                </div>
                <div>
                  <label htmlFor="funnel-au" className="pt-lead-label">
                    Au
                  </label>
                  <input id="funnel-au" type="month" name="au" defaultValue={range.to} />
                </div>
                <button type="submit" className="pt-btn-ghost">
                  Appliquer
                </button>
              </form>
              {grouped.length === 0 ? (
                <div className="pt-empty">
                  <h2 className="pt-heading">Pas encore de données</h2>
                  <p className="pt-helper">
                    L&apos;entonnoir se remplit dès les premières visites avec source et les
                    premières demandes. Revenez après la prochaine campagne.
                  </p>
                </div>
              ) : (
                <>
                  {nonconformingTotal > 0 ? (
                    <p className="pt-helper">
                      {nonconformingTotal} lead(s) hors convention sur la période. Ouvrez la fiche
                      du lead pour corriger la source.
                    </p>
                  ) : null}
                  <FunnelKpis
                    leads={totals.leads}
                    rdv={totals.rdv}
                    signed={totals.signed}
                    avgCostCents={averageCostPerRdv(rows)}
                  />
                  <FunnelTable rows={grouped} by={by} />
                </>
              )}
            </div>
          </section>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
