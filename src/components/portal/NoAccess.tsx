// État « session valide mais aucun rôle » (UI-SPEC). Le bouton de déconnexion
// est fourni par l'appelant via `action` (plan 10-05).
interface NoAccessProps {
  action?: React.ReactNode;
}

export default function NoAccess({ action }: NoAccessProps) {
  return (
    <section className="pt-card pt-empty" aria-labelledby="pt-noaccess-title">
      <h1 id="pt-noaccess-title" className="pt-heading">
        Accès non autorisé
      </h1>
      <p className="pt-helper">
        Ce compte n&apos;est associé à aucun espace client. Si vous pensez qu&apos;il s&apos;agit
        d&apos;une erreur, contactez <a href="mailto:contact@sevalys.com">contact@sevalys.com</a>.
      </p>
      {action ?? null}
    </section>
  );
}
