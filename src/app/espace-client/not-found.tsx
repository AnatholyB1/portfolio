import Link from 'next/link';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { PROJECT_COPY } from '@/lib/projects/copy';

const COPY = PROJECT_COPY.boundaries;

// 404 de l'espace client (ex. document à signer inconnu) : jamais la 404 publique avec la barre de
// navigation et le pied de page marketing. Le client garde la déconnexion et un retour utile.
export default function EspaceClientNotFound() {
  return (
    <>
      <ShellHeader variant="client" title="Espace client" actions={<SignOutButton />} />
      <ShellMain width="client">
        <section className="pt-card" aria-labelledby="portal-notfound-title">
          <h1 id="portal-notfound-title" className="pt-heading">
            {COPY.notFoundTitle}
          </h1>
          <p className="pt-helper">{COPY.notFoundBody}</p>
          <div className="pt-actions-row">
            <Link href="/espace-client/documents" className="pt-btn-primary">
              {COPY.backToDocuments}
            </Link>
            <Link href="/espace-client" className="pt-btn-text">
              {COPY.backToProject}
            </Link>
          </div>
        </section>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
