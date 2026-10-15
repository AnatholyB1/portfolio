import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import Skeleton from '@/components/ui/Skeleton';
import { PROJECT_COPY } from '@/lib/projects/copy';

// Pendant le chargement d'une page de l'espace client : l'en-tête reste en place et des squelettes
// reprennent la mise en page de la page Projet (navigation, carte titre, panneau « En attente de »,
// frise). Une seule région de statut annonce l'état ; les autres formes sont masquées aux lecteurs d'écran.
export default function EspaceClientLoading() {
  return (
    <>
      <ShellHeader variant="client" title="Espace client" />
      <ShellMain width="client">
        <div className="pt-load pt-load-nav" aria-hidden="true">
          <Skeleton variant="lines" lines={1} />
        </div>
        <section className="pt-card pt-load">
          <Skeleton variant="lines" lines={1} label={PROJECT_COPY.boundaries.loading} className="pt-load-title" />
          <div aria-hidden="true">
            <Skeleton variant="lines" lines={1} className="pt-load-sub" />
          </div>
          <div aria-hidden="true">
            <Skeleton variant="card" className="pt-load-who" />
          </div>
        </section>
        <div className="pt-card pt-load" aria-hidden="true">
          <Skeleton variant="lines" lines={6} className="pt-load-steps" />
        </div>
      </ShellMain>
    </>
  );
}
