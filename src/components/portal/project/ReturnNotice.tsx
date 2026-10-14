'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PROJECT_COPY } from '@/lib/projects/copy';
import './project.css';

// Retour de paiement dont la facture n'est pas retrouvée dans la liste du client (lien ancien, facture
// d'un autre compte, paramètre falsifié) : sans ce message la page restait muette. Aucun état de paiement
// n'est déduit de l'URL ici : le texte reste neutre, le statut réel est dans la liste.
export default function ReturnNotice({ retour }: { retour: 'succes' | 'annule' }) {
  const copy = PROJECT_COPY.payments.returnBanner;
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const title = retour === 'annule' ? copy.cancelledTitle : copy.unknownSuccessTitle;
  const body = retour === 'annule' ? copy.unknownCancelledBody : copy.unknownSuccessBody;

  return (
    <section className="pt-pay-banner" aria-labelledby="return-notice-title">
      <h2 id="return-notice-title" ref={titleRef} tabIndex={-1} className="pt-subheading pt-pay-banner-title">
        {title}
      </h2>
      <div aria-live="polite">
        <p>{body}</p>
      </div>
      <div className="pt-pay-banner-actions">
        <button
          type="button"
          className="pt-btn-text pt-file-action"
          onClick={() => router.replace('/espace-client/paiements')}
        >
          {copy.close}
        </button>
      </div>
    </section>
  );
}
