import AdminNav from '@/components/admin/AdminNav';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';

// Chargement des pages d'administration : coque et navigation restent en place, une
// ligne d'état annonce l'attente (le contenu réel remplace ce squelette).
export default function AdminLoading() {
  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin">
          <AdminNav />
          <section className="pt-card" aria-busy="true">
            <p role="status" className="pt-status">
              Chargement…
            </p>
            <div className="pt-admin-stack pt-admin-mt-16" aria-hidden="true">
              <span className="pt-admin-skeleton" />
              <span className="pt-admin-skeleton pt-admin-skeleton-block" />
            </div>
          </section>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
