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
    <main className="pt-auth" id="main-content">
      <div className="pt-brand">
        <SevalysMark size={32} />
        <span>Sèvalys</span>
      </div>
      <section className="pt-card rv-card" aria-labelledby="rv-heading">
        {children}
      </section>
    </main>
  );
}

// Same wording for an unknown, used or expired link: the page never says which one it is
// (no oracle on link validity).
function InvalidLink() {
  return (
    <Shell>
      <h1 id="rv-heading" className="pt-heading">
        Ce lien n&apos;est plus valide
      </h1>
      <p className="pt-helper">
        Le lien a peut-être déjà été utilisé ou a expiré. Écrivez-nous à{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a> et nous vous en renverrons un.
      </p>
    </Shell>
  );
}

// Rate-limited view: says nothing about the link itself, so a valid link is not reported dead.
function ThrottledView() {
  return (
    <Shell>
      <h1 id="rv-heading" className="pt-heading">
        Trop de tentatives
      </h1>
      <p className="pt-helper">
        Réessayez dans quelques minutes. Si le problème persiste, écrivez-nous à{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </Shell>
  );
}

export default async function AvisTokenPage({ params }: AvisTokenPageProps) {
  const { token } = await params;

  const ip = getClientIp(await headers());
  const allowed = await hitThrottle(hashKey('review-view-ip', ip ?? 'unknown'), 600, 60);
  if (!allowed) return <ThrottledView />;

  const link = await getReviewLinkState(token);
  if (link.state !== 'valid') return <InvalidLink />;

  return (
    <Shell>
      <ReviewForm
        token={token}
        projectTitle={link.projectTitle}
        companyName={link.companyName}
        googleUrl={reviewGoogleUrl()}
      />
    </Shell>
  );
}
