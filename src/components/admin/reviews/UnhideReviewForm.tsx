'use client';

import { useActionState, useId } from 'react';
import { unhideReviewAction, type ModerationState } from '@/app/admin/avis/avis.actions';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';

const INITIAL: ModerationState = { ok: false, message: null };

// Levée d'un masquage (D-07) : détail obligatoire, action journalisée.
export default function UnhideReviewForm({ reviewId }: { reviewId: string }) {
  const uid = useId();
  const [state, formAction, pending] = useActionState(
    async (prev: ModerationState, fd: FormData) => unhideReviewAction(prev, fd),
    INITIAL,
  );

  return (
    <form action={formAction} className="pt-lead-panel">
      <input type="hidden" name="reviewId" value={reviewId} />
      <div className="pt-field">
        <label className="pt-label" htmlFor={`${uid}-detail`}>
          Détail (obligatoire, 3 à 500 caractères)
        </label>
        <textarea
          id={`${uid}-detail`}
          name="detail"
          className="pt-input"
          required
          minLength={3}
          maxLength={500}
          rows={3}
        />
      </div>
      <p className="pt-helper">
        Lever le masquage : l&apos;avis redevient public. L&apos;action est journalisée.
      </p>
      <div role="status" aria-live="polite">
        {state.message ? <p className={state.ok ? 'pt-helper' : 'pt-error'}>{state.message}</p> : null}
      </div>
      <div className="pt-lead-panel-actions">
        <button type="submit" className="pt-btn-ghost" style={{ minHeight: 44 }} disabled={pending}>
          Lever le masquage
        </button>
      </div>
    </form>
  );
}
