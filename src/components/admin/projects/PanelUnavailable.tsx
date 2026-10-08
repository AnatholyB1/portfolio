import Link from 'next/link';

// État « indisponible » d'un panneau de la fiche projet : même ton que « Chiffres indisponibles »
// du pilotage. Une lecture a échoué : on n'affiche rien plutôt qu'un chiffre ou un statut faux.
export default function PanelUnavailable({
  id,
  title,
  unavailable,
  reloadHref,
}: {
  id: string;
  title: string;
  unavailable: string;
  reloadHref: string;
}) {
  return (
    <section className="pt-card" aria-labelledby={id}>
      <h2 id={id} className="pt-heading">
        {title}
      </h2>
      <div className="pt-empty">
        <h3 className="pt-heading pt-subheading">{unavailable}</h3>
        <p className="pt-helper">
          Une lecture a échoué, cette section n&apos;est pas affichée pour éviter une information fausse. Rechargez la
          page ; si l&apos;erreur persiste, vérifiez la connexion à la base.
        </p>
        <Link className="pt-btn-ghost" href={reloadHref}>
          Recharger
        </Link>
      </div>
    </section>
  );
}
