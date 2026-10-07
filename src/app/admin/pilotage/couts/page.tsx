import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';
import { BalanceForm, ProjectCostForm, RecurringCostForm } from '@/components/admin/pilotage/CostForms';
import RecurringRowActions from '@/components/admin/pilotage/RecurringRowActions';
import VoidCostPanel from '@/components/admin/pilotage/VoidCostPanel';
import { formatDateFr, formatSignedEuros } from '@/components/admin/pilotage/format';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { requireAdmin } from '@/lib/server/auth/dal';
import { currentBalance, projectCostRegister, recurringRegister } from '@/lib/server/pilotage/costs';
import { COST_CATEGORY_LABELS } from '@/lib/server/pilotage/costSchemas';
import { PilotageLoadError, loadCostsRegister, type CostsRegisterRows } from '@/lib/server/pilotage/load';
import { parisToday } from '@/lib/server/pilotage/periods';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';
import '@/components/admin/funnel/funnel.css';
import '@/components/admin/pilotage/pilotage.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Coûts · Pilotage' };

function categoryLabel(key: string): string {
  return Object.prototype.hasOwnProperty.call(COST_CATEGORY_LABELS, key)
    ? COST_CATEGORY_LABELS[key as keyof typeof COST_CATEGORY_LABELS]
    : key;
}

export default async function CostsPage() {
  const { supabase } = await requireAdmin();
  const today = parisToday(new Date());

  let data: CostsRegisterRows | null = null;
  try {
    data = await loadCostsRegister(supabase);
  } catch (e) {
    if (!(e instanceof PilotageLoadError)) throw e;
  }

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin pt-pilot-stack">
          <AdminNav current="pilotage" />
          {data === null ? (
            <section className="pt-card" aria-labelledby="costs-title">
              <div className="pt-empty">
                <h2 id="costs-title" className="pt-heading">
                  Chiffres indisponibles
                </h2>
                <p className="pt-helper">
                  Une lecture a échoué, aucun total n&apos;est affiché pour éviter un chiffre faux. Rechargez la page ;
                  si l&apos;erreur persiste, vérifiez la connexion à la base.
                </p>
                <a className="pt-btn-ghost" href="/admin/pilotage/couts">
                  Recharger
                </a>
              </div>
            </section>
          ) : (
            <CostsBody data={data} today={today} />
          )}
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}

function CostsBody({ data, today }: { data: CostsRegisterRows; today: string }) {
  const projectTitles = new Map(data.projects.map((p) => [p.id, `${p.title} · ${p.clientName}`]));
  const balances = [...data.balances].sort((a, b) => b.id - a.id);
  const inForce = currentBalance(data.balances);
  const series = recurringRegister(data.recurring, today);
  const projectCosts = projectCostRegister(data.projectCosts).sort((a, b) => b.id - a.id);

  return (
    <section className="pt-card pt-pilot-stack" aria-labelledby="costs-title">
      <div>
        <a href="/admin/pilotage" className="pt-back">
          Retour au pilotage
        </a>
        <h1 id="costs-title" className="pt-heading" style={{ marginBottom: 24 }}>
          Coûts et solde de départ
        </h1>
        <p className="pt-helper">
          Les saisies ne se modifient pas. Pour corriger, ajoutez une nouvelle ligne ; l&apos;historique est conservé.
        </p>
      </div>

      <section id="solde" className="pt-pilot-stack" aria-labelledby="solde-title">
        <h2 id="solde-title" className="pt-heading">
          Solde de départ
        </h2>
        <BalanceForm today={today} />
        {balances.length > 0 ? (
          <table className="pt-table pt-admin-table pt-pilot-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Montant</th>
                <th scope="col">Note</th>
                <th scope="col">Saisi le</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.id}>
                  <td data-label="Date">
                    {formatDateFr(b.asOf)}
                    {inForce && inForce.id === b.id ? (
                      <span className="pt-pilot-costs-badge">En vigueur</span>
                    ) : null}
                  </td>
                  <td data-label="Montant" className="pt-pilot-num">
                    {formatSignedEuros(b.amountCents)}
                  </td>
                  <td data-label="Note">{b.note ?? '—'}</td>
                  <td data-label="Saisi le">{formatDateFr(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section className="pt-pilot-stack pt-pilot-costs-zone" aria-labelledby="rec-title">
        <h2 id="rec-title" className="pt-heading">
          Charges récurrentes
        </h2>
        <RecurringCostForm today={today} />
        {series.length === 0 ? (
          <div className="pt-empty">
            <p className="pt-helper">
              Aucune charge récurrente. Ajoutez vos abonnements et outils pour projeter la trésorerie.
            </p>
          </div>
        ) : (
          <table className="pt-table pt-admin-table pt-pilot-table">
            <thead>
              <tr>
                <th scope="col">Libellé</th>
                <th scope="col">Catégorie</th>
                <th scope="col">Montant</th>
                <th scope="col">Fréquence</th>
                <th scope="col">Début</th>
                <th scope="col">Fin</th>
                <th scope="col">Statut</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {series.flatMap((s) =>
                s.versions.map((v, i) => (
                  <tr key={v.id}>
                    <td data-label="Libellé">{v.label}</td>
                    <td data-label="Catégorie">{categoryLabel(v.category)}</td>
                    <td data-label="Montant" className="pt-pilot-num">
                      {formatSignedEuros(v.amountCents)}
                    </td>
                    <td data-label="Fréquence">{v.frequency === 'monthly' ? 'Mensuelle' : 'Annuelle'}</td>
                    <td data-label="Début">{formatDateFr(v.startsOn)}</td>
                    <td data-label="Fin">{v.endsOn ? formatDateFr(v.endsOn) : '—'}</td>
                    <td data-label="Statut">{v.status}</td>
                    <td data-label="Action">
                      {i === 0 && v.status !== 'Remplacée' ? (
                        <RecurringRowActions
                          today={today}
                          version={{
                            seriesId: v.seriesId,
                            label: v.label,
                            category: v.category,
                            amountCents: v.amountCents,
                            frequency: v.frequency,
                            startsOn: v.startsOn,
                            endsOn: v.endsOn,
                          }}
                        />
                      ) : null}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        )}
      </section>

      <section className="pt-pilot-stack pt-pilot-costs-zone" aria-labelledby="pc-title">
        <h2 id="pc-title" className="pt-heading">
          Coûts de projet
        </h2>
        <ProjectCostForm projects={data.projects} today={today} />
        {projectCosts.length === 0 ? (
          <div className="pt-empty">
            <p className="pt-helper">
              Aucun coût de projet. Ajoutez la sous-traitance ou les licences payées pour un projet.
            </p>
          </div>
        ) : (
          <table className="pt-table pt-admin-table pt-pilot-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Projet</th>
                <th scope="col">Catégorie</th>
                <th scope="col">Libellé</th>
                <th scope="col">Montant</th>
                <th scope="col">Statut</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {projectCosts.map((c) => (
                <tr key={c.id}>
                  <td data-label="Date">{formatDateFr(c.incurredOn)}</td>
                  <td data-label="Projet">{projectTitles.get(c.projectId) ?? '—'}</td>
                  <td data-label="Catégorie">{categoryLabel(c.category)}</td>
                  <td data-label="Libellé">{c.label}</td>
                  <td data-label="Montant" className="pt-pilot-num">
                    {formatSignedEuros(c.amountCents)}
                  </td>
                  <td data-label="Statut">{c.status}</td>
                  <td data-label="Action">{c.status === 'Valide' ? <VoidCostPanel costId={c.id} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="pt-helper">
        Le coût par rendez-vous se saisit dans l&apos;entonnoir. <a href="/admin/entonnoir">Ouvrir l&apos;entonnoir</a>
      </p>
    </section>
  );
}
