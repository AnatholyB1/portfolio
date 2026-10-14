import type { Metadata } from 'next';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import LeadFilters from '@/components/admin/leads/LeadFilters';
import LeadsTable, { type LeadRow } from '@/components/admin/leads/LeadsTable';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import Pager, { ADMIN_PAGE_SIZE, isPageOutOfRange, parsePage } from '@/components/admin/Pager';
import { STATUS_ORDER } from '@/lib/admin/leadLabels';
import { UTM_SOURCES } from '@/lib/attribution/utm';
import { requireAdmin } from '@/lib/server/auth/dal';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Leads' };

const PAGE_SIZE = ADMIN_PAGE_SIZE;
const SOURCE_SAMPLE = 200;

type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function hrefFor(statut: string | undefined, source: string | undefined, retours: boolean, page: number) {
  const q = new URLSearchParams();
  if (statut) q.set('statut', statut);
  if (source) q.set('source', source);
  if (retours) q.set('retours', '1');
  if (page > 1) q.set('page', String(page));
  const s = q.toString();
  return s ? `/admin/leads?${s}` : '/admin/leads';
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Lecture via le client RLS (politique admin), jamais service_role.
  const { supabase } = await requireAdmin();
  const sp = await searchParams;

  const rawStatut = one(sp.statut);
  const statut =
    rawStatut && (STATUS_ORDER as readonly string[]).includes(rawStatut) ? rawStatut : undefined;
  const rawSource = one(sp.source);
  const source = rawSource && rawSource.length <= 200 ? rawSource : undefined;
  const retours = one(sp.retours) === '1';
  const page = parsePage(sp.page);
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('sv_leads_admin_v')
    .select(
      'id, status, source_source, source_medium, source_campaign, created_at, last_contact_at, unseen_return, erased_at, contact_nom, contact_email, source_nonconformity',
      { count: 'exact' },
    )
    .order('last_contact_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (statut) query = query.eq('status', statut);
  if (source) query = query.eq('source_source', source);
  if (retours) query = query.eq('unseen_return', true);

  const [{ data, count, error }, { count: reviewCount }, { data: sourceRows }] = await Promise.all([
    query,
    supabase
      .from('sv_leads_admin_v')
      .select('id', { count: 'exact', head: true })
      .eq('unseen_return', true),
    // Liste déroulante des sources : les plus récentes seulement (jamais 1000 lignes),
    // complétée par la convention UTM et par la source déjà filtrée.
    supabase
      .from('sv_leads_admin_v')
      .select('source_source')
      .not('source_source', 'is', null)
      .order('created_at', { ascending: false })
      .limit(SOURCE_SAMPLE),
  ]);

  const rows = (data ?? []) as unknown as LeadRow[];
  const total = count ?? 0;
  const toReview = reviewCount ?? 0;
  const sources = Array.from(
    new Set([
      ...UTM_SOURCES,
      ...((sourceRows ?? []) as { source_source: string | null }[])
        .map((r) => r.source_source)
        .filter((s): s is string => Boolean(s) && (s as string).length <= 200),
      ...(source ? [source] : []),
    ]),
  )
    .sort()
    .slice(0, 50);

  const hasFilters = Boolean(statut || source || retours);
  const hasNext = from + PAGE_SIZE < total;
  // Page au-delà de la dernière : état vide, pas une panne de lecture.
  const pastEnd = isPageOutOfRange(error, page) || (!error && rows.length === 0 && page > 1);

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin">
          <AdminNav current="leads" />
          <section className="pt-card" aria-labelledby="leads-title">
            <h1 id="leads-title" className="pt-heading pt-admin-title">
              Leads
            </h1>
            <div className="pt-admin-stack">
              {toReview > 0 ? (
                <div>
                  <Link href="/admin/leads?retours=1" className="pt-lead-chip">
                    {toReview} à revoir
                  </Link>
                </div>
              ) : null}
              <LeadFilters statut={statut} source={source} retours={retours} sources={sources} />
              {pastEnd ? (
                <div className="pt-empty">
                  <h2 className="pt-heading">Aucun résultat sur cette page</h2>
                  <p className="pt-helper">
                    Cette page est au-delà de la dernière page de la liste.
                  </p>
                  <Link href={hrefFor(statut, source, retours, 1)} className="pt-btn-ghost">
                    Revenir à la première page
                  </Link>
                </div>
              ) : error ? (
                <div className="pt-empty">
                  <h2 className="pt-heading">Leads indisponibles</h2>
                  <p className="pt-helper">
                    La liste n&apos;a pas pu être lue. Rechargez la page ; si l&apos;erreur persiste, vérifiez la
                    connexion à la base.
                  </p>
                  <Link href={hrefFor(statut, source, retours, page)} className="pt-btn-ghost">
                    Recharger
                  </Link>
                </div>
              ) : rows.length === 0 ? (
                hasFilters ? (
                  <div className="pt-empty">
                    <h2 className="pt-heading">Aucun lead ne correspond</h2>
                    <p className="pt-helper">
                      Modifiez ou réinitialisez les filtres pour voir plus de résultats.
                    </p>
                    <Link href="/admin/leads" className="pt-btn-ghost">
                      Réinitialiser les filtres
                    </Link>
                  </div>
                ) : (
                  <div className="pt-empty">
                    <h2 className="pt-heading">Aucun lead pour le moment</h2>
                    <p className="pt-helper">
                      Les demandes du simulateur et du formulaire de contact apparaîtront ici avec
                      leur source.
                    </p>
                    <Link href="/admin/liens" className="pt-btn-ghost">
                      Préparer un lien de campagne
                    </Link>
                  </div>
                )
              ) : (
                <>
                  <LeadsTable rows={rows} />
                  <Pager
                    page={page}
                    hasNext={hasNext}
                    hrefFor={(n) => hrefFor(statut, source, retours, n)}
                    label="leads"
                  />                </>
              )}
            </div>
          </section>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
