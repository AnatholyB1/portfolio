import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';
import DetailPanel from '@/components/admin/pilotage/DetailPanel';
import PilotageKpis from '@/components/admin/pilotage/PilotageKpis';
import ProjectMarginTable from '@/components/admin/pilotage/ProjectMarginTable';
import SourceTable from '@/components/admin/pilotage/SourceTable';
import TreasuryChart from '@/components/admin/pilotage/TreasuryChart';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { requireAdmin } from '@/lib/server/auth/dal';
import { buildPilotageView, type PilotageView } from '@/lib/server/pilotage/dashboard';
import { PilotageLoadError, loadPilotageRows } from '@/lib/server/pilotage/load';
import { parsePilotageParams, pilotageHref } from '@/lib/server/pilotage/params';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';
import '@/components/admin/funnel/funnel.css';
import '@/components/admin/pilotage/pilotage.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pilotage' };

type SearchParams = Record<string, string | string[] | undefined>;

const PERIODES = [
  { value: 'mois', label: 'Mois' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'annee', label: 'Année' },
] as const;

const BASES = [
  { value: 'ht', label: 'HT' },
  { value: 'ttc', label: 'TTC' },
] as const;

const ANOMALY_LABELS: Record<string, string> = {
  contract_without_quote: 'Contrat signé sans devis actif',
  quote_invalid_amount: 'Devis sans montant valide',
  credit_exceeds_net: 'Avoir supérieur au net de la facture',
  invoice_without_due: 'Facture sans échéance',
};

function anomalyLabel(kind: string): string {
  return Object.prototype.hasOwnProperty.call(ANOMALY_LABELS, kind) ? ANOMALY_LABELS[kind] : kind;
}

export default async function AdminPilotagePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // Lecture via le client RLS (politique admin), jamais service_role.
  const { supabase } = await requireAdmin();
  const params = parsePilotageParams(await searchParams);

  let view: PilotageView | null = null;
  try {
    const rows = await loadPilotageRows(supabase);
    view = buildPilotageView(rows, params, new Date());
  } catch (e) {
    if (!(e instanceof PilotageLoadError)) throw e;
  }

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin pt-pilot-stack">
          <AdminNav current="pilotage" />
          <section className="pt-card" aria-labelledby="pilot-title">
            <div className="pt-pilot-stack">
              <div>
                <h1 id="pilot-title" className="pt-heading" style={{ marginBottom: 16 }}>
                  Pilotage
                </h1>
                <a className="pt-btn-ghost" href="/admin/pilotage/couts">
                  Gérer les coûts
                </a>
              </div>

              {view === null ? (
                <div className="pt-empty">
                  <h2 className="pt-heading">Chiffres indisponibles</h2>
                  <p className="pt-helper">
                    Une lecture a échoué, aucun total n&apos;est affiché pour éviter un chiffre faux. Rechargez la page ;
                    si l&apos;erreur persiste, vérifiez la connexion à la base.
                  </p>
                  <a className="pt-btn-ghost" href={pilotageHref(params, {})}>
                    Recharger
                  </a>
                </div>
              ) : (
                <>
                  <form method="get" className="pt-funnel-controls">
                    <fieldset className="pt-seg">
                      <legend>Période</legend>
                      {PERIODES.map((o) => (
                        <label key={o.value}>
                          <input type="radio" name="periode" value={o.value} defaultChecked={o.value === params.periode} />
                          {o.label}
                        </label>
                      ))}
                    </fieldset>
                    <p className="pt-helper">{view.periodLabel}</p>
                    <fieldset className="pt-seg">
                      <legend>Montants</legend>
                      {BASES.map((o) => (
                        <label key={o.value}>
                          <input type="radio" name="base" value={o.value} defaultChecked={o.value === params.base} />
                          {o.label}
                        </label>
                      ))}
                    </fieldset>
                    {view.allFranchise ? (
                      <p className="pt-helper">
                        Sans TVA (art. 293 B du CGI), HT et TTC sont identiques tant que le régime reste en franchise.
                      </p>
                    ) : null}
                    <label>
                      <input type="checkbox" name="tests" value="1" defaultChecked={params.tests} />
                      Inclure les données de test (séries TFA et TAV)
                    </label>
                    <button type="submit" className="pt-btn-ghost">
                      Appliquer
                    </button>
                  </form>

                  {params.tests ? (
                    <div className="pt-warning">
                      <span aria-hidden="true">!</span>
                      <p>Les données de test sont incluses dans tous les chiffres.</p>
                    </div>
                  ) : null}

                  {view.anomalies.length > 0 ? (
                    <div className="pt-warning">
                      <span aria-hidden="true">!</span>
                      <div>
                        <p>{view.anomalies.length} anomalie(s) de réconciliation</p>
                        <ul>
                          {view.anomalies.map((a, i) => (
                            <li key={`${a.kind}-${a.ref}-${i}`}>
                              {anomalyLabel(a.kind)} · {a.ref}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}

                  {view.isEmpty ? (
                    <div className="pt-empty">
                      <h2 className="pt-heading">Rien à piloter pour l&apos;instant</h2>
                      <p className="pt-helper">
                        Les chiffres apparaissent dès le premier devis émis ou la première facture. Les données de test
                        sont masquées : cochez « Inclure les données de test » pour les voir.
                      </p>
                    </div>
                  ) : (
                    <>
                      <PilotageKpis tiles={view.tiles} params={params} />
                      <SourceTable sources={view.sources} />
                      <ProjectMarginTable
                        projects={view.projects}
                        globalMarginCents={view.globalMarginCents}
                        params={params}
                      />
                      {view.detail ? <DetailPanel detail={view.detail} params={params} /> : null}
                      <TreasuryChart
                        cash={view.cash}
                        balanceLink={<a href="/admin/pilotage/couts#solde">Saisir le solde de départ</a>}
                      />
                    </>
                  )}
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
