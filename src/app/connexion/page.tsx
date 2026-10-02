import { redirect } from 'next/navigation';
import AuthCard from '@/components/portal/AuthCard';
import LoginForm from '@/components/portal/LoginForm';
import { LOGIN_COPY, loginEmailSchema } from '@/lib/auth/schemas';
import { safeNext } from '@/lib/auth/safeNext';
import { getRoleDestination, probeSession } from '@/lib/server/auth/dal';

interface ConnexionPageProps {
  searchParams: Promise<{ next?: string | string[]; expired?: string | string[];
    email?: string | string[];
  }>;
}

export default async function ConnexionPage({ searchParams }: ConnexionPageProps) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;
  const expired = params.expired === '1';
  // Pré-remplissage optionnel (liens d'invitation) : ignoré s'il n'est pas une adresse valide.
  const parsedEmail = loginEmailSchema.safeParse({
    email: typeof params.email === 'string' ? params.email : '',
  });
  const initialEmail = parsedEmail.success ? parsedEmail.data.email : '';

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
      notes={
        <>
          <p>Pas de mot de passe : un code à usage unique vous est envoyé par e-mail.</p>
          <p>
            Un souci pour vous connecter ? <a href="mailto:contact@sevalys.com">contact@sevalys.com</a>
          </p>
        </>
      }
    >
      <LoginForm
        next={next}
        initialEmail={initialEmail}
        notice={sessionExpired ? LOGIN_COPY.sessionExpired : undefined}
      />
    </AuthCard>
  );
}
