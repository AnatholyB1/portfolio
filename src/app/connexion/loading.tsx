import SevalysMark from '@/components/ui/SevalysMark';
import Skeleton from '@/components/ui/Skeleton';

// Chargement de /connexion : reprend la carte finale (titre, aide, champ, bouton) pour que
// l'arrivée du formulaire ne décale rien.
export default function ConnexionLoading() {
  return (
    <main className="pt-auth">
      <div className="pt-brand pt-load">
        <SevalysMark size={32} />
        <span>Sèvalys</span>
      </div>
      <section className="pt-card pt-load">
        <Skeleton variant="lines" lines={1} label="Chargement de la page de connexion" className="pt-load-title pt-load-title-auth" />
        <div aria-hidden="true">
          <Skeleton variant="lines" lines={2} />
        </div>
        <div aria-hidden="true" className="pt-load-field">
          <Skeleton variant="lines" lines={1} className="pt-load-label" />
          <Skeleton variant="card" className="pt-load-input" />
        </div>
        <div aria-hidden="true">
          <Skeleton variant="card" className="pt-load-button" />
        </div>
      </section>
    </main>
  );
}
