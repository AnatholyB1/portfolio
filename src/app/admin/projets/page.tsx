import type { Metadata } from 'next';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import ProjectFilters from '@/components/admin/projects/ProjectFilters';
import ProjectsTable from '@/components/admin/projects/ProjectsTable';
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
import { requireAdmin } from '@/lib/server/auth/dal';
import { loadAdminProjects } from '@/lib/server/projects/read';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';
import '@/components/admin/projects/projects.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Projets' };

type SearchParams = Record<string, string | string[] | undefined>;

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

  const all = await loadAdminProjects(supabase, new Date());
  const rows = sortProjects(filterProjects(all, { etape, blocage }), tri, ordre);
  const hasFilters = Boolean(etape || blocage);
  const n = rows.length;

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <AdminNav current="projets" />
          <section className="pt-card" aria-labelledby="projets-title">
            <h1 id="projets-title" className="pt-heading" style={{ marginBottom: 8 }}>
              Projets
            </h1>
            <p className="pt-intro" style={{ marginBottom: 24 }}>
              {n} {n > 1 ? 'projets' : 'projet'}. Triez par colonne, filtrez par étape ou par
              blocage.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ProjectFilters etape={etape} blocage={blocage} />
              {n === 0 ? (
                hasFilters ? (
                  <div className="pt-empty">
                    <h2 className="pt-heading">{PROJECT_COPY.admin.noMatch}</h2>
                    <Link href="/admin/projets" className="pt-btn-text">
                      {PROJECT_COPY.admin.resetFilters}
                    </Link>
                  </div>
                ) : (
                  <div className="pt-empty">
                    <h2 className="pt-heading">{PROJECT_COPY.admin.emptyHeading}</h2>
                    <p className="pt-helper">{PROJECT_COPY.admin.emptyBody}</p>
                    <Link href="/admin/leads" className="pt-btn-text">
                      {PROJECT_COPY.admin.goToLeads}
                    </Link>
                  </div>
                )
              ) : (
                <ProjectsTable rows={rows} tri={tri} ordre={ordre} etape={etape} blocage={blocage} />
              )}
            </div>
          </section>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
