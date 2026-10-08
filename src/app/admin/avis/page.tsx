import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';
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

export default async function AdminAvisPage() {
  // Lecture via le client RLS (politique admin), jamais service_role.
  const { supabase } = await requireAdmin();

  let reviews: AdminReview[] | null = null;
  try {
    reviews = await loadAdminReviews(supabase);
  } catch {
    reviews = null;
  }

  let openLinks: Awaited<ReturnType<typeof loadOpenReviewLinks>> | null = null;
  try {
    openLinks = await loadOpenReviewLinks(supabase);
  } catch {
    openLinks = null;
  }

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <AdminNav current="avis" />
          <section className="pt-card" aria-labelledby="avis-title">
            <h1 id="avis-title" className="pt-heading" style={{ marginBottom: 16 }}>
              Avis
            </h1>
            <p className="pt-helper" style={{ marginBottom: 24 }}>
              Un avis ne peut être masqué que pour illégalité. Il n&apos;est jamais supprimé et
              chaque action est journalisée.
            </p>
            {reviews === null ? (
              <p className="pt-error">Impossible de charger les avis.</p>
            ) : reviews.length === 0 ? (
              <div className="pt-empty">
                <p className="pt-helper">Aucun avis déposé pour l&apos;instant.</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {reviews.map((r) => (
                  <li key={r.id} className="pt-card">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'baseline' }}>
                      <span>{formatDateFr(r.publishedAt)}</span>
                      <strong>{r.projectTitle}</strong>
                      <span>{r.companyName}</span>
                      <span>{r.rating}/5</span>
                      <span
                        className="pt-helper"
                        style={r.status === 'hidden' ? { color: 'var(--warm)' } : undefined}
                      >
                        {r.status === 'hidden' ? 'Masqué' : 'Publié'}
                      </span>
                    </div>

                    <details style={{ marginTop: 16 }}>
                      <summary style={{ minHeight: 44, cursor: 'pointer' }}>Détails et historique</summary>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                        {r.title ? <strong>{r.title}</strong> : null}
                        <p style={{ whiteSpace: 'pre-wrap' }}>{r.body}</p>
                        <p className="pt-helper">Nom affiché : {r.displayName}</p>
                        <h3 className="pt-heading">Historique de modération</h3>
                        {r.history.length === 0 ? (
                          <p className="pt-helper">Aucune action de modération.</p>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
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

                    <div style={{ marginTop: 16 }}>
                      {r.status === 'published' ? (
                        <HideReviewDialog reviewId={r.id} reasons={REVIEW_HIDE_REASONS} />
                      ) : (
                        <UnhideReviewForm reviewId={r.id} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="pt-card" aria-labelledby="liens-title">
            <h2 id="liens-title" className="pt-heading" style={{ marginBottom: 16 }}>
              Liens d&apos;avis
            </h2>
            {openLinks === null ? (
              <p className="pt-error">Impossible de charger les liens d&apos;avis.</p>
            ) : openLinks.length === 0 ? (
              <div className="pt-empty">
                <p className="pt-helper">Aucun lien d&apos;avis en attente.</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {openLinks.map((l) => (
                  <li key={l.projectId}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'baseline', marginBottom: 8 }}>
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
