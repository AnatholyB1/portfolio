import { headers } from 'next/headers';
import SevalysMark from '@/components/ui/SevalysMark';
import { getClientIp } from '@/lib/leads/ipHash';
import { reviewGoogleUrl } from '@/lib/reviews/googleUrl';
import { getReviewLinkState } from '@/lib/reviews/linkState';
import { hashKey, hitThrottle } from '@/lib/throttle';
import ReviewForm from './ReviewForm';

// Le rendu dépend du jeton en URL : jamais mis en cache. Le GET ne consomme ni n'écrit rien
// (D-09) ; la consommation du jeton n'a lieu que dans le POST /api/avis.
export const dynamic = 'force-dynamic';

const CONTACT = 'contact@sevalys.com';

interface AvisTokenPageProps {
  params: Promise<{ token: string }>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="pt-auth">
      <div className="pt-brand">
        <SevalysMark size={32} />
        <span>Sèvalys</span>
      </div>
      <section className="pt-card rv-card" aria-labelledby="pt-auth-title">
        {children}
      </section>
    </main>
  );
}

function InvalidLink() {
  return (
    <Shell>
      <h1 id="pt-auth-title" className="pt-heading">
        Ce lien n&apos;est plus valide
      </h1>
      <p className="pt-helper">
        Le lien a peut-être déjà été utilisé ou a expiré. Écrivez-nous à{' '}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a> et nous vous en renverrons un.
      </p>
    </Shell>
  );
}

export default async function AvisTokenPage({ params }: AvisTokenPageProps) {
  const { token } = await params;

  const ip = getClientIp(await headers());
  const allowed = await hitThrottle(hashKey('review-view-ip', ip ?? 'unknown'), 600, 60);
  if (!allowed) return <InvalidLink />;

  const link = await getReviewLinkState(token);
  if (link.state !== 'valid') return <InvalidLink />;

  return (
    <Shell>
      <h1 id="pt-auth-title" className="pt-heading">
        Votre avis sur votre projet
      </h1>
      <p className="pt-helper">
        Votre avis est publié tel que vous l&apos;écrivez, sans validation préalable. Vous recevez
        ce lien parce que votre projet a été livré.
      </p>
      <ReviewForm
        token={token}
        projectTitle={link.projectTitle}
        companyName={link.companyName}
        googleUrl={reviewGoogleUrl()}
      />
    </Shell>
  );
}
