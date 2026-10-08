'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TriangleAlert } from 'lucide-react';
import AdminNav, { adminNavKeyForPath } from '@/components/admin/AdminNav';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';

// Erreur imprévue dans une page d'administration : message en français, nouvelle
// tentative et retour au tableau de bord. La navigation reste disponible.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" />
      <ShellMain width="admin">
        <div className="pt-admin">
          <AdminNav current={adminNavKeyForPath(pathname)} />
          <section className="pt-card" aria-labelledby="admin-error-title">
            <div className="pt-admin-state" role="alert">
              <h1 id="admin-error-title" className="pt-heading">
                Cette page n&apos;a pas pu s&apos;afficher
              </h1>
              <p className="pt-error">
                <TriangleAlert size={16} aria-hidden="true" />
                Une erreur est survenue pendant le chargement. Vos données ne sont pas modifiées.
              </p>
              <p className="pt-helper">
                Réessayez. Si l&apos;erreur persiste, revenez au tableau de bord
                {error.digest ? ` et indiquez la référence ${error.digest}` : ''}.
              </p>
            </div>
            <div className="pt-admin-meta pt-admin-mt-24">
              <button type="button" className="pt-btn-ghost" onClick={() => reset()}>
                Réessayer
              </button>
              <Link href="/admin" className="pt-btn-text">
                Retour au tableau de bord
              </Link>
            </div>
          </section>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
