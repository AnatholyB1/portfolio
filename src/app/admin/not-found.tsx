import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';

// 404 de l'administration (fiche lead ou projet introuvable) : reste dans la coque
// privée, sans navigation du site public.
export default function AdminNotFound() {
  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin">
          <AdminNav />
          <section className="pt-card" aria-labelledby="admin-404-title">
            <div className="pt-admin-state">
              <h1 id="admin-404-title" className="pt-heading">
                Élément introuvable
              </h1>
              <p className="pt-helper">
                Cette fiche n&apos;existe pas ou a été supprimée. Vérifiez l&apos;adresse ou repartez de la liste.
              </p>
            </div>
            <div className="pt-admin-meta pt-admin-mt-24">
              <Link href="/admin" className="pt-btn-ghost">
                Retour au tableau de bord
              </Link>
              <Link href="/admin/leads" className="pt-btn-text">
                Voir les leads
              </Link>
              <Link href="/admin/projets" className="pt-btn-text">
                Voir les projets
              </Link>
            </div>
          </section>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
