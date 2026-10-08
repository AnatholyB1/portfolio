'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';
import { confirmLinkAction } from '@/app/auth/confirm/actions';

interface ConfirmFormProps {
  tokenHash: string;
  next?: string;
}

const INVALID_LINK = "Ce lien n'est plus valide.";

function ErrorState({ message }: { message: string }) {
  return (
    <div className="pt-field pt-field-start">
      <p className="pt-error" role="alert">
        <AlertCircle size={16} aria-hidden="true" className="pt-msg-icon" />
        <span>{message}</span>
      </p>
      <Link href="/connexion" className="pt-btn-primary">
        Demander un nouveau code
      </Link>
    </div>
  );
}

export default function ConfirmForm({ tokenHash, next }: ConfirmFormProps) {
  const [state, action, pending] = useActionState(confirmLinkAction, {} as { error?: string });

  // Lien sans jeton : inutile de proposer le bouton, on montre directement l'état d'erreur.
  if (!tokenHash) return <ErrorState message={INVALID_LINK} />;
  if (state.error) return <ErrorState message={state.error} />;

  return (
    <form action={action}>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="next" value={next ?? ''} />
      <button type="submit" className="pt-btn-primary" disabled={pending}>
        {pending ? 'Connexion en cours…' : 'Me connecter'}
      </button>
    </form>
  );
}
