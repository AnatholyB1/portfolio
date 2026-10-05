'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import './project.css';

export type PayResult = { ok: true; url: string } | { ok: false; message: string; settled?: boolean };

type Props = {
  invoiceId: string;
  label: string;
  variant: 'primary' | 'ghost';
  pay: (invoiceId: string) => Promise<PayResult>;
};

// Seul l'identifiant de facture part du navigateur : le serveur résout le montant (D-05).
export default function PayButton({ invoiceId, label, variant, pay }: Props) {
  const copy = PROJECT_COPY.payments.portal;
  const router = useRouter();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setBusy(true);
    try {
      const res = await pay(invoiceId);
      if (res.ok) {
        // Le bouton reste désactivé pendant la redirection.
        window.location.assign(res.url);
        return;
      }
      setError(res.settled ? copy.alreadySettled : res.message);
      if (res.settled) router.refresh();
    } catch {
      setError(copy.payFailed);
    }
    inFlight.current = false;
    setBusy(false);
  }

  return (
    <div className="pt-pay-action">
      <button
        type="button"
        className={`${variant === 'primary' ? 'pt-btn-primary' : 'pt-btn-ghost'} pt-pay-btn`}
        onClick={onClick}
        disabled={busy}
      >
        <CreditCard size={16} aria-hidden="true" />
        {busy ? copy.redirecting : label}
      </button>
      <p className="pt-error" aria-live="polite">
        {error}
      </p>
    </div>
  );
}
