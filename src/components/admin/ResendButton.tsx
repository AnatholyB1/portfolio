'use client';

import { useState, useTransition } from 'react';
import { resendInvitationAction, type InviteState } from '@/app/admin/actions';

// Bouton « Renvoyer l'invitation » par ligne. L'autorisation reste dans la Server Action.
export default function ResendButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<InviteState>({ status: 'idle' });

  function onClick() {
    startTransition(async () => {
      try {
        setResult(await resendInvitationAction(clientId));
      } catch {
        setResult({ status: 'error', message: 'Une erreur est survenue. Réessayez dans un instant.' });
      }
    });
  }

  return (
    <div className="pt-resend">
      <button
        type="button"
        className="pt-btn-text"
        onClick={onClick}
        disabled={pending}
        aria-label={pending ? undefined : `Renvoyer l'invitation à ${clientName}`}
      >
        {pending ? 'Envoi en cours…' : "Renvoyer l'invitation"}
      </button>
      <div aria-live="polite" className="pt-resend-msg">
        {result.status !== 'idle' && !pending ? (
          <span className={result.status === 'error' ? 'pt-resend-error' : undefined}>{result.message}</span>
        ) : null}
      </div>
    </div>
  );
}
