'use client';

import { useActionState, useId } from 'react';
import { unhideReviewAction, type ModerationState } from '@/app/admin/avis/avis.actions';
import ConfirmAction from '@/components/admin/shared/ConfirmAction';
import '@/components/admin/admin.css';
import '@/components/admin/shared/inline.css';

const INITIAL: ModerationState = { ok: false, message: null };

// Levée d'un masquage (D-07) : détail obligatoire, action journalisée.
export default function UnhideReviewForm({ reviewId }: { reviewId: string }) {
  const uid = useId();
  const [state, formAction, pending] = useActionState(
    async (prev: ModerationState, fd: FormData) => unhideReviewAction(prev, fd),
    INITIAL,
  );

  return (
    <ConfirmAction
      triggerLabel="Lever le masquage…"
      triggerVariant="ghost"
      confirmLabel="Confirmer la levée"
      keepLabel="Garder l'avis masqué"
      action={formAction}
      pending={pending}
      result={state}
      succeeded={state.ok}
      description="Lever le masquage : l'avis redevient public. L'action est journalisée."
      message={state.message ? <p className={state.ok ? 'pt-helper' : 'pt-error'}>{state.message}</p> : null}
    >
      <input type="hidden" name="reviewId" value={reviewId} />
      <div>
        <label className="pt-inline-label" htmlFor={`${uid}-detail`}>
          Détail (obligatoire, 3 à 500 caractères)
        </label>
        <textarea id={`${uid}-detail`} name="detail" required minLength={3} maxLength={500} rows={3} />
      </div>
    </ConfirmAction>
  );
}
