'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';
import { confirmLinkAction } from '@/app/auth/confirm/actions';

interface ConfirmFormProps {
  tokenHash: string;
  next?: string;
}

export default function ConfirmForm({ tokenHash, next }: ConfirmFormProps) {
  const [state, action, pending] = useActionState(confirmLinkAction, {} as { error?: string });
  return (
    <form action={action}>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="next" value={next ?? ''} />
      <div aria-live="polite">
        {state.error ? (
          <>
            <p className="pt-error">
              <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 4 }} />
              <span>{state.error}</span>
            </p>
            <Link href="/connexion" className="pt-btn-text">
              Demander un nouveau code
            </Link>
          </>
        ) : null}
      </div>
      <button type="submit" className="pt-btn-primary" disabled={pending}>
        {pending ? 'Connexion en cours...' : 'Me connecter'}
      </button>
    </form>
  );
}
