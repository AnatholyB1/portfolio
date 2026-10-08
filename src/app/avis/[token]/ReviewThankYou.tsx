import Link from 'next/link';

// Vue de remerciement (D-10, REV-02). Volontairement SANS prop de note : le bouton Google
// est identique pour toutes les notes.
export default function ReviewThankYou({ googleUrl }: { googleUrl: string | null }) {
  return (
    <div className="rv-thanks">
      <h1 id="pt-auth-title" className="pt-display">
        Merci pour votre avis
      </h1>
      <p className="pt-helper">Votre avis est publié sur la page Avis.</p>
      <p>
        <Link href="/avis" className="rv-link">
          Voir la page Avis
        </Link>
      </p>
      {googleUrl ? (
        <div className="rv-google">
          <p className="pt-helper">
            Si vous le souhaitez, vous pouvez aussi partager votre avis sur Google. C&apos;est
            facultatif.
          </p>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pt-btn-ghost"
          >
            Publier aussi sur Google
            <span className="pt-sr-only"> (s&apos;ouvre dans un nouvel onglet)</span>
          </a>
        </div>
      ) : null}
    </div>
  );
}
