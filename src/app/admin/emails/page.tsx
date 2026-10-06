import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';
import LiftSuppressionForm from '@/components/admin/mail/LiftSuppressionForm';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { formatDateFr } from '@/lib/admin/format';
import { requireAdmin } from '@/lib/server/auth/dal';
import { loadSuppressions } from '@/lib/server/mail/suppressionAdmin';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'E-mails' };

export default async function AdminEmailsPage() {
  // Lecture via le client RLS (politique admin), jamais service_role.
  const { supabase } = await requireAdmin();
  const rows = await loadSuppressions(supabase);

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <AdminNav current="emails" />
          <section className="pt-card" aria-labelledby="emails-title">
            <h1 id="emails-title" className="pt-heading" style={{ marginBottom: 16 }}>
              Liste de suppression
            </h1>
            <p className="pt-helper" style={{ marginBottom: 24 }}>
              Une plainte (spam) ou une désinscription bloque uniquement les e-mails
              d&apos;information (avis, actualités). Un rebond définitif bloque tous les e-mails
              vers cette adresse. Une réactivation exige un motif et reste tracée.
            </p>
            {rows === null ? (
              <p className="pt-error">Impossible de charger la liste.</p>
            ) : rows.length === 0 ? (
              <div className="pt-empty">
                <p className="pt-helper">Aucune adresse dans la liste de suppression.</p>
              </div>
            ) : (
              <table className="pt-table pt-admin-table">
                <thead>
                  <tr>
                    <th scope="col">Adresse</th>
                    <th scope="col">Cause</th>
                    <th scope="col">Date</th>
                    <th scope="col">Flux bloqués</th>
                    <th scope="col">Statut</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.email}</td>
                      <td>{r.causeLabel}</td>
                      <td>{formatDateFr(r.createdAt)}</td>
                      <td>{r.flowsLabel}</td>
                      <td>{r.active ? 'Active' : 'Réactivée'}</td>
                      <td>
                        {r.active ? (
                          <LiftSuppressionForm suppressionId={r.id} />
                        ) : (
                          <span>
                            Réactivée le {formatDateFr(r.liftedAt)} : {r.liftReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
