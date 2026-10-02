import { redirect } from 'next/navigation';
import AuthCard from '@/components/portal/AuthCard';
import LoginForm from '@/components/portal/LoginForm';
import { LOGIN_COPY } from '@/lib/auth/schemas';
import { safeNext } from '@/lib/auth/safeNext';
import { getRoleDestination, probeSession } from '@/lib/server/auth/dal';

interface ConnexionPageProps {
  searchParams: Promise<{ next?: string | string[]; expired?: string | string[] }>;
}

export default async function ConnexionPage({ searchParams }: ConnexionPageProps) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;
  const expired = params.expired === '1';

  // Sonde non redirigeante : une session périmée ou sans rôle voit le formulaire,
  // jamais de redirection retour (pas de boucle /connexion <-> page gardée).
  const session = await probeSession();
  let sessionExpired = expired;
  if (session) {
    if (session.fresh) {
      const destination = await getRoleDestination(session.supabase, session.user.id);
      if (destination) redirect(safeNext(next ?? null, destination));
    } else {
      sessionExpired = true;
    }
  }

  return (
    <AuthCard
      title="Connexion"
      helper="Saisissez l'adresse e-mail avec laquelle vous avez été invité."
    >
      {sessionExpired ? (
        <p className="pt-status" role="status">
          {LOGIN_COPY.sessionExpired}
        </p>
      ) : null}
      <LoginForm next={next} />
    </AuthCard>
  );
}
