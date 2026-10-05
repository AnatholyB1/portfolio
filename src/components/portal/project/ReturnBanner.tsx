'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock } from 'lucide-react';
import { formatEuros } from '@/lib/documents/money';
import { PROJECT_COPY } from '@/lib/projects/copy';

import PayButton, { type PayResult } from './PayButton';
import type { PortalInvoiceView } from './types';
import './project.css';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10; // 30 s au total

type Props = {
  retour: 'succes' | 'annule';
  invoice: PortalInvoiceView;
  pay: (invoiceId: string) => Promise<PayResult>;
};

// Le paramètre ?retour ne choisit que le texte : l'état « confirmé » vient uniquement du statut
// dérivé du webhook vérifié, lu côté serveur via RLS (PAY-02, T-15-50).
export default function ReturnBanner({ retour, invoice, pay }: Props) {
  const copy = PROJECT_COPY.payments.returnBanner;
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const polls = useRef(0);
  const [gaveUp, setGaveUp] = useState(false);

  const waiting = retour === 'succes' && invoice.status !== 'paid' && invoice.status !== 'processing';

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => {
      polls.current += 1;
      if (polls.current >= MAX_POLLS) {
        clearInterval(timer);
        setGaveUp(true);
      }
      router.refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [waiting, router]);

  let title: string;
  let body: string;
  let icon: 'clock' | 'check' | null = null;
  if (retour === 'annule') {
    title = copy.cancelledTitle;
    body = copy.cancelledBody;
  } else if (invoice.status === 'paid') {
    title = copy.confirmedTitle;
    body = copy.confirmedBody(invoice.number);
    icon = 'check';
  } else if (invoice.status === 'processing') {
    title = copy.transferTitle;
    body = copy.transferBody;
    icon = 'clock';
  } else {
    title = copy.confirmingTitle;
    body = gaveUp ? copy.slowBody : copy.confirmingBody;
    icon = 'clock';
  }

  function close() {
    router.replace('/espace-client/paiements');
  }

  const showDepositNext = retour === 'succes' && invoice.status === 'paid' && invoice.kind === 'deposit';

  return (
    <section className="pt-pay-banner" aria-labelledby={`return-${invoice.id}`}>
      <h2 id={`return-${invoice.id}`} ref={titleRef} tabIndex={-1} className="pt-pay-banner-title">
        {icon === 'clock' ? <Clock size={16} aria-hidden="true" /> : null}
        {icon === 'check' ? <Check size={16} aria-hidden="true" /> : null}
        {title}
      </h2>
      <div aria-live="polite">
        <p>{body}</p>
        {showDepositNext ? <p>{copy.depositNext}</p> : null}
      </div>
      {retour === 'annule' && invoice.status === 'to_pay' ? (
        <p className="pt-doc-meta">{formatEuros(invoice.amountDueCents)}</p>
      ) : null}
      <div className="pt-pay-banner-actions">
        {retour === 'annule' && invoice.status === 'to_pay' ? (
          <PayButton invoiceId={invoice.id} label={copy.resume} variant="ghost" pay={pay} />
        ) : null}
        <button type="button" className="pt-btn-text pt-file-action" onClick={close}>
          {copy.close}
        </button>
      </div>
    </section>
  );
}
