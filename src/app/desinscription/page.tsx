import AuthCard from '@/components/portal/AuthCard';
import {
  maskEmail,
  unsubscribeSecret,
  verifyUnsubscribeToken,
} from '@/lib/server/mail/unsubscribeToken';

// Le rendu dépend du jeton en URL : jamais mis en cache. Le GET n'écrit rien (D-11) ;
// l'écriture exige un POST explicite vers /api/unsubscribe.
export const dynamic = 'force-dynamic';

interface DesinscriptionPageProps {
  searchParams: Promise<{ t?: string | string[]; ok?: string | string[] }>;
}

const CONTACT = 'contact@sevalys.com';

export default async function DesinscriptionPage({ searchParams }: DesinscriptionPageProps) {
  const params = await searchParams;

  if (params.ok === '1') {
    return (
      <AuthCard title="Vous êtes désinscrit">
        <p className="pt-helper">
          Vous ne recevrez plus nos messages d&apos;information. Les e-mails liés à votre
          activité continuent : factures, codes de connexion et e-mails de signature.
        </p>
        <p className="pt-helper">
          Pour vous réinscrire, écrivez à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </AuthCard>
    );
  }

  const token = typeof params.t === 'string' ? params.t : '';
  const secret = unsubscribeSecret();
  const address = secret && token ? verifyUnsubscribeToken(token, secret) : null;

  if (!address) {
    return (
      <AuthCard title="Désinscription">
        <p className="pt-helper">Ce lien de désinscription est invalide ou incomplet.</p>
        <p className="pt-helper">
          Pour vous désinscrire, écrivez à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Se désinscrire">
      <p className="pt-helper">
        Confirmez la désinscription de <strong>{maskEmail(address)}</strong>. Vous ne recevrez
        plus nos messages d&apos;information (demandes d&apos;avis, nouveautés). Les e-mails
        liés à votre activité, comme les factures, les codes de connexion et les e-mails de
        signature, continuent.
      </p>
      <form method="post" action={`/api/unsubscribe?t=${encodeURIComponent(token)}`}>
        <input type="hidden" name="source" value="link" />
        <button type="submit" className="pt-btn-primary">
          Confirmer la désinscription
        </button>
      </form>
      <p className="pt-helper">
        Pour vous réinscrire ensuite, écrivez à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </AuthCard>
  );
}
