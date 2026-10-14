import type { Metadata } from 'next';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import LiftSuppressionForm from '@/components/admin/mail/LiftSuppressionForm';
import Pager, { ADMIN_PAGE_SIZE, parsePage } from '@/components/admin/Pager';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { EM_DASH, formatDateFr } from '@/lib/admin/format';
import { requireAdmin } from '@/lib/server/auth/dal';
import { loadSuppressions } from '@/lib/server/mail/suppressionAdmin';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';
import TableScroll from '@/components/admin/shared/TableScroll';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'E-mails' };

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Lecture via le client RLS (politique admin), jamais service_role.
  const { supabase } = await requireAdmin();
  const page = parsePage((await searchParams).page);
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  // Une ligne de plus que la page pour savoir s'il y a une suite.
  const fetched = await loadSuppressions(supabase, { from, to: from + ADMIN_PAGE_SIZE });
  const hasNext = fetched !== null && fetched.length > ADMIN_PAGE_SIZE;
  const rows = fetched === null ? null : fetched.slice(0, ADMIN_PAGE_SIZE);
  const hrefFor = (n: number) => (n > 1 ? `/admin/emails?page=${n}` : '/admin/emails');

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin">
          <AdminNav current="emails" />
          <section className="pt-card" aria-labelledby="emails-title">
            <h1 id="emails-title" className="pt-heading pt-admin-title-tight">
              Liste de suppression
            </h1>
            <p className="pt-helper pt-admin-lede">
              Une plainte (spam) ou une désinscription bloque uniquement les e-mails
              d&apos;information (avis, actualités). Un rebond définitif bloque tous les e-mails
              vers cette adresse. Une réactivation exige un motif et reste tracée.
            </p>
            {rows === null ? (
              <div className="pt-empty">
                <h2 className="pt-heading">Liste indisponible</h2>
                <p className="pt-helper">
                  La liste n&apos;a pas pu être lue. Rechargez la page ; si l&apos;erreur persiste, vérifiez la
                  connexion à la base.
                </p>
                <Link href={hrefFor(page)} className="pt-btn-ghost">
                  Recharger
                </Link>
              </div>
            ) : rows.length === 0 ? (
              <div className="pt-empty">
                <h2 className="pt-heading">{page > 1 ? "Aucun résultat sur cette page" : "Aucune adresse bloquée"}</h2>
                <p className="pt-helper">
                  Les plaintes, désinscriptions et rebonds définitifs apparaîtront ici avec leur cause.
                </p>
                {page > 1 ? (
                  <Link href="/admin/emails" className="pt-btn-ghost">
                    Revenir à la première page
                  </Link>
                ) : null}
              </div>
            ) : (
              <>
                {/* Rôles explicites : sur mobile le CSS passe les éléments en display:block. */}
                <TableScroll label="Adresses bloquées">
<table className="pt-table pt-admin-table" role="table">
                  <caption className="pt-sr-only">Adresses de la liste de suppression</caption>
                  <thead role="rowgroup">
                    <tr role="row">
                      <th scope="col" role="columnheader">Adresse</th>
                      <th scope="col" role="columnheader">Cause</th>
                      <th scope="col" role="columnheader">Date</th>
                      <th scope="col" role="columnheader">Flux bloqués</th>
                      <th scope="col" role="columnheader">Statut</th>
                      <th scope="col" role="columnheader">Action</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {rows.map((r) => (
                      <tr key={r.id} role="row">
                        <td role="cell" data-label="Adresse">{r.email}</td>
                        <td role="cell" data-label="Cause">{r.causeLabel}</td>
                        <td role="cell" data-label="Date">{formatDateFr(r.createdAt)}</td>
                        <td role="cell" data-label="Flux bloqués">{r.flowsLabel}</td>
                        <td role="cell" data-label="Statut">
                          {r.active ? (
                            'Active'
                          ) : (
                            <>
                              Réactivée le {formatDateFr(r.liftedAt)}
                              <span className="pt-lead-sub">Motif : {r.liftReason}</span>
                            </>
                          )}
                        </td>
                        <td role="cell" data-label="Action">
                          {r.active ? <LiftSuppressionForm suppressionId={r.id} /> : EM_DASH}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
</TableScroll>
                <Pager page={page} hasNext={hasNext} hrefFor={hrefFor} label="liste de suppression" />
              </>
            )}
          </section>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
