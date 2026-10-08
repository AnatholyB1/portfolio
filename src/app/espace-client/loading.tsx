import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import { PROJECT_COPY } from '@/lib/projects/copy';

// Pendant le chargement d'une page de l'espace client : l'en-tête reste en place et une carte
// d'attente annonce l'état (région de statut déjà montée, texte unique).
export default function EspaceClientLoading() {
  return (
    <>
      <ShellHeader variant="client" title="Espace client" />
      <ShellMain width="client">
        <section className="pt-card" role="status" aria-busy="true">
          <p className="pt-helper">{PROJECT_COPY.boundaries.loading}</p>
        </section>
      </ShellMain>
    </>
  );
}
