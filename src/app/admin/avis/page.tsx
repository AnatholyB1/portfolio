import type { Metadata } from 'next';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import Pager, { ADMIN_PAGE_SIZE, parsePage } from '@/components/admin/Pager';
import HideReviewDialog from '@/components/admin/reviews/HideReviewDialog';
import ReissueReviewLinkCard from '@/components/admin/reviews/ReissueReviewLinkCard';
import UnhideReviewForm from '@/components/admin/reviews/UnhideReviewForm';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { formatDateFr } from '@/lib/admin/format';
import { requireAdmin } from '@/lib/server/auth/dal';
import { loadOpenReviewLinks } from '@/lib/server/reviews/linksAdmin';
import { REVIEW_HIDE_REASONS, loadAdminReviews, type AdminReview } from '@/lib/server/reviews/admin';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Avis' };

export default async function AdminAvisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Lecture via le client RLS (politique admin), jamais service_role.
  const { supabase } = await requireAdmin();
  const page = parsePage((await searchParams).page);
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const hrefFor = (n: number) => (n > 1 ? `/admin/avis?page=${n}` : '/admin/avis');

  // Les deux lectures sont indépendantes : en parallèle, chacune tolère son propre échec.
  const [fetched, openLinks] = await Promise.all([
    // Une ligne de plus que la page pour savoir s'il y a une suite.
    loadAdminReviews(supabase, { from, to: from + ADMIN_PAGE_SIZE }).catch((): AdminReview[] | null => null),
    loadOpenReviewLinks(supabase).catch(() => null),
  ]);
  const hasNext = fetched !== null && fetched.length > ADMIN_PAGE_SIZE;
  const reviews = fetched === null ? null : fetched.slice(0, ADMIN_PAGE_SIZE);

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin">
          <AdminNav current="avis" />
          <section className="pt-card" aria-labelledby="avis-title">
            <h1 id="avis-title" className="pt-heading pt-admin-title-tight">
              Avis
            </h1>
            <p className="pt-helper pt-admin-lede">
              Un avis ne peut être masqué que pour illégalité. Il n&apos;est jamais supprimé et
              chaque action est journalisée.
            </p>
            {reviews === null ? (
              <div className="pt-empty">
                <h2 className="pt-heading">Avis indisponibles</h2>
                <p className="pt-helper">
                  Les avis n&apos;ont pas pu être lus. Rechargez la page ; si l&apos;erreur persiste, vérifiez la
                  connexion à la base.
                </p>
                <Link href={hrefFor(page)} className="pt-btn-ghost">
                  Recharger
                </Link>
              </div>
            ) : reviews.length === 0 ? (
              <div className="pt-empty">
                <h2 className="pt-heading">{page > 1 ? "Aucun résultat sur cette page" : "Aucun avis déposé"}</h2>
                <p className="pt-helper">
                  Les avis apparaîtront ici dès qu&apos;un client en aura publié un depuis son lien d&apos;avis.
                </p>
                {page > 1 ? (
                  <Link href="/admin/avis" className="pt-btn-ghost">
                    Revenir à la première page
                  </Link>
                ) : null}
              </div>
            ) : (
              <>
                <ul className="pt-admin-list">
                  {reviews.map((r) => (
                    <li key={r.id} className="pt-card">
                      <div className="pt-admin-meta">
                        <span>{formatDateFr(r.publishedAt)}</span>
                        <strong>{r.projectTitle}</strong>
                        <span>{r.companyName}</span>
                        <span>{r.rating}/5</span>
                        <span className={r.status === 'hidden' ? 'pt-helper pt-admin-hidden' : 'pt-helper'}>
                          {r.status === 'hidden' ? 'Masqué' : 'Publié'}
                        </span>
                      </div>

                      <p className="pt-admin-clamp pt-admin-mt-16">{r.body}</p>

                      <details className="pt-admin-mt-16">
                        <summary className="pt-admin-summary">Détails et historique</summary>
                        <div className="pt-admin-stack pt-admin-mt-8">
                          {r.title ? <strong>{r.title}</strong> : null}
                          <p className="pt-admin-prewrap">{r.body}</p>
                          <p className="pt-helper">Nom affiché : {r.displayName}</p>
                          <h3 className="pt-heading">Historique de modération</h3>
                          {r.history.length === 0 ? (
                            <p className="pt-helper">Aucune action de modération.</p>
                          ) : (
                            <ul className="pt-admin-bullets">
                              {r.history.map((h) => (
                                <li key={h.id}>
                                  {h.action === 'hide' ? 'Masquage' : 'Levée du masquage'}
                                  {h.reasonLabel ? ` · Motif : ${h.reasonLabel}` : ''}
                                  {` · Détail : ${h.detail}`}
                                  {` · ${h.actorEmail ?? 'Administrateur'}`}
                                  {` · ${formatDateFr(h.createdAt)}`}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </details>

                      <div className="pt-admin-mt-16">
                        {r.status === 'published' ? (
                          <HideReviewDialog reviewId={r.id} reasons={REVIEW_HIDE_REASONS} />
                        ) : (
                          <UnhideReviewForm reviewId={r.id} />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <Pager page={page} hasNext={hasNext} hrefFor={hrefFor} label="avis" />
              </>
            )}
          </section>
          <section className="pt-card" aria-labelledby="liens-title">
            <h2 id="liens-title" className="pt-heading pt-admin-title-tight">
              Liens d&apos;avis
            </h2>
            {openLinks === null ? (
              <div className="pt-empty">
                <p className="pt-heading">Liens d&apos;avis indisponibles</p>
                <p className="pt-helper">
                  Les liens en attente n&apos;ont pas pu être lus. Rechargez la page pour réessayer.
                </p>
                <Link href={hrefFor(page)} className="pt-btn-ghost">
                  Recharger
                </Link>
              </div>
            ) : openLinks.length === 0 ? (
              <div className="pt-empty">
                <p className="pt-heading">Aucun lien d&apos;avis en attente</p>
                <p className="pt-helper">
                  Les liens d&apos;avis non utilisés apparaîtront ici tant que le client n&apos;a pas déposé son avis.
                </p>
                <Link href="/admin/projets" className="pt-btn-ghost">
                  Voir les projets
                </Link>
              </div>
            ) : (
              <ul className="pt-admin-list">
                {openLinks.map((l) => (
                  <li key={l.projectId}>
                    <div className="pt-admin-meta pt-admin-mb-8">
                      <strong>{l.projectTitle}</strong>
                      <span>{l.companyName}</span>
                    </div>
                    <ReissueReviewLinkCard projectId={l.projectId} status={l.status} reviewFiled={false} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
