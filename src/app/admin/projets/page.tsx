import type { Metadata } from 'next';
import Link from 'next/link';
import { Inbox } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import AdminNav from '@/components/admin/AdminNav';
import ProjectFilters from '@/components/admin/projects/ProjectFilters';
import ProjectsTable from '@/components/admin/projects/ProjectsTable';
import Pager from '@/components/admin/shared/Pager';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import {
  BLOCAGE_FILTERS,
  ETAPE_FILTERS,
  SORT_KEYS,
  filterProjects,
  sortProjects,
  type SortKey,
} from '@/lib/projects/blocking';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { countFr } from '@/lib/documents/numberFormat';
import { requireAdmin } from '@/lib/server/auth/dal';
import { loadAdminProjects } from '@/lib/server/projects/read';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';
import '@/components/admin/projects/projects.css';
import '@/components/admin/shared/inline.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Projets' };

type SearchParams = Record<string, string | string[] | undefined>;

// Plafond de lignes rendues par page : la liste ne grossit pas avec le nombre de projets.
const PAGE_SIZE = 25;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function whitelist<T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined {
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

export default async function AdminProjetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Lecture via le client RLS (politique admin), jamais service_role.
  const { supabase } = await requireAdmin();
  const sp = await searchParams;

  const etape = whitelist(one(sp.etape), ETAPE_FILTERS);
  const blocage = whitelist(one(sp.blocage), BLOCAGE_FILTERS);
  const tri: SortKey | undefined = whitelist(one(sp.tri), SORT_KEYS);
  const ordre = one(sp.ordre) === 'asc' ? 'asc' : 'desc';

  const rawPage = Number.parseInt(one(sp.page) ?? '1', 10);

  const all = await loadAdminProjects(supabase, new Date());
  const sorted = sortProjects(filterProjects(all, { etape, blocage }), tri, ordre);
  const hasFilters = Boolean(etape || blocage);
  const n = sorted.length;
  const pageCount = Math.max(1, Math.ceil(n / PAGE_SIZE));
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(rawPage, 1), pageCount) : 1;
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function hrefForPage(p: number): string {
    const q = new URLSearchParams();
    if (etape) q.set('etape', etape);
    if (blocage) q.set('blocage', blocage);
    if (tri) {
      q.set('tri', tri);
      q.set('ordre', ordre);
    }
    if (p > 1) q.set('page', String(p));
    const qs = q.toString();
    return qs ? `/admin/projets?${qs}` : '/admin/projets';
  }

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin pt-stack">
          <AdminNav current="projets" />
          <section className="pt-card" aria-labelledby="projets-title">
            <h1 id="projets-title" className="pt-heading pt-mb-8">
              Projets
            </h1>
            <p className="pt-intro pt-mb-24">
              {countFr(n, 'projet')}. Triez par colonne, filtrez par étape ou par blocage.
            </p>
            <div className="pt-stack-16">
              <ProjectFilters etape={etape} blocage={blocage} tri={tri} ordre={ordre} />
              {n === 0 ? (
                hasFilters ? (
                  <EmptyState
                    headingLevel={2}
                    icon={<Inbox size={32} />}
                    title={PROJECT_COPY.admin.noMatch}
                    action={<Link href="/admin/projets" className="pt-btn-text">
                      {PROJECT_COPY.admin.resetFilters}
                    </Link>}
                  />
                ) : (
                  <EmptyState
                    headingLevel={2}
                    icon={<Inbox size={32} />}
                    title={PROJECT_COPY.admin.emptyHeading}
                    description={<>{PROJECT_COPY.admin.emptyBody}</>}
                    action={<Link href="/admin/leads" className="pt-btn-text">
                      {PROJECT_COPY.admin.goToLeads}
                    </Link>}
                  />
                )
              ) : (
                <>
                  <ProjectsTable rows={rows} tri={tri} ordre={ordre} etape={etape} blocage={blocage} />
                  <Pager page={page} pageCount={pageCount} hasNext={page < pageCount} hrefFor={hrefForPage} />
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
