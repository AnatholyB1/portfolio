// État « session valide mais aucun rôle » (UI-SPEC). Le bouton de déconnexion
// est fourni par l'appelant via `action` (plan 10-05). Jamais d'impasse : une action
// de sortie (se déconnecter) et un retour au site.
import Link from 'next/link';
import SevalysMark from '@/components/ui/SevalysMark';
import './client.css';

interface NoAccessProps {
  action?: React.ReactNode;
}

export default function NoAccess({ action }: NoAccessProps) {
  return (
    <section className="pt-card pt-noaccess" aria-labelledby="pt-noaccess-title">
      <div className="pt-brand">
        <SevalysMark size={32} />
        <span>Sèvalys</span>
      </div>
      <h1 id="pt-noaccess-title" className="pt-heading">
        Ce compte n&apos;a pas d&apos;espace client
      </h1>
      <p className="pt-helper">
        Cette adresse e-mail n&apos;est associée à aucun espace. Si vous attendiez une invitation,
        écrivez-nous à <a href="mailto:contact@sevalys.com">contact@sevalys.com</a>.
      </p>
      <div className="pt-noaccess-actions">
        {action ?? null}
        <Link href="/" className="pt-back">
          Retour au site
        </Link>
      </div>
    </section>
  );
}
