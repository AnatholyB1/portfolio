import type { Metadata } from 'next';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import LeadFilters from '@/components/admin/leads/LeadFilters';
import LeadsTable, { type LeadRow } from '@/components/admin/leads/LeadsTable';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { STATUS_ORDER } from '@/lib/admin/leadLabels';
import { requireAdmin } from '@/lib/server/auth/dal';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Leads' };

const PAGE_SIZE = 25;

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
  const pageNum = Number.parseInt(one(sp.page) ?? '1', 10);
  const page = Number.isFinite(pageNum) && pageNum >= 1 ? pageNum : 1;
  const from = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('sv_leads_admin_v')
    .select(
      'id, status, source_source, source_medium, source_campaign, created_at, last_contact_at, unseen_return, erased_at, contact_nom, contact_email',
      { count: 'exact' },
    )
    .order('last_contact_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (statut) query = query.eq('status', statut);
  if (source) query = query.eq('source_source', source);
  if (retours) query = query.eq('unseen_return', true);

  const [{ data, count }, { count: reviewCount }, { data: sourceRows }] = await Promise.all([
    query,
    supabase
      .from('sv_leads_admin_v')
      .select('id', { count: 'exact', head: true })
      .eq('unseen_return', true),
    supabase.from('sv_leads_admin_v').select('source_source').limit(1000),
  ]);

  const rows = (data ?? []) as unknown as LeadRow[];
  const total = count ?? 0;
  const toReview = reviewCount ?? 0;
  const sources = Array.from(
    new Set(
      ((sourceRows ?? []) as { source_source: string | null }[])
        .map((r) => r.source_source)
        .filter((s): s is string => Boolean(s) && (s as string).length <= 200),
    ),
  )
    .sort()
    .slice(0, 200);

  const hasFilters = Boolean(statut || source || retours);
  const hasNext = from + PAGE_SIZE < total;

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <AdminNav current="leads" />
          <section className="pt-card" aria-labelledby="leads-title">
            <h1 id="leads-title" className="pt-heading" style={{ marginBottom: 24 }}>
              Leads
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {toReview > 0 ? (
                <div>
                  <Link href="/admin/leads?retours=1" className="pt-lead-chip">
                    {toReview} à revoir
                  </Link>
                </div>
              ) : null}
              <LeadFilters statut={statut} source={source} retours={retours} sources={sources} />
              {rows.length === 0 ? (
                hasFilters ? (
                  <div className="pt-empty">
                    <h2 className="pt-heading">Aucun lead ne correspond</h2>
                    <p className="pt-helper">
                      Modifiez ou réinitialisez les filtres pour voir plus de résultats.
                    </p>
                    <Link href="/admin/leads" className="pt-btn-text">
                      Réinitialiser
                    </Link>
                  </div>
                ) : (
                  <div className="pt-empty">
                    <h2 className="pt-heading">Aucun lead pour le moment</h2>
                    <p className="pt-helper">
                      Les demandes du simulateur et du formulaire de contact apparaîtront ici avec
                      leur source.
                    </p>
                  </div>
                )
              ) : (
                <>
                  <LeadsTable rows={rows} />
                  <nav className="pt-lead-pager" aria-label="Pagination">
                    {page > 1 ? (
                      <Link className="pt-btn-text" href={hrefFor(statut, source, retours, page - 1)}>
                        Précédent
                      </Link>
                    ) : (
                      <span />
                    )}
                    {hasNext ? (
                      <Link className="pt-btn-text" href={hrefFor(statut, source, retours, page + 1)}>
                        Suivant
                      </Link>
                    ) : null}
                  </nav>
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
