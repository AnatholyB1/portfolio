import AuthCard from '@/components/portal/AuthCard';
import ConfirmForm from '@/components/portal/ConfirmForm';

interface ConfirmPageProps {
  searchParams: Promise<{ token_hash?: string | string[]; next?: string | string[] }>;
}

// Aucune vérification au chargement (anti-scanners de liens, D-10) : seul le bouton
// « Me connecter » déclenche l'action. Le paramètre `type` de l'URL est ignoré.
export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === 'string' ? params.token_hash : '';
  const next = typeof params.next === 'string' ? params.next : undefined;
  return (
    <AuthCard
      title="Confirmer la connexion"
      helper={tokenHash ? 'Pour votre sécurité, confirmez la connexion en un clic.' : undefined}
      notes={<HelpNotes />}
    >
      <ConfirmForm tokenHash={tokenHash} next={next} />
    </AuthCard>
  );
}

function HelpNotes() {
  return (
    <p>
      Un souci pour vous connecter ? <a href="mailto:contact@sevalys.com">contact@sevalys.com</a>
    </p>
  );
}
