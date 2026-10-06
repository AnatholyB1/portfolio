'use client';

import { useActionState } from 'react';
import { liftSuppressionAction, type LiftState } from '@/app/admin/emails/actions';
import '../leads/leads.css';

const INITIAL: LiftState = { ok: false, message: null };

export default function LiftSuppressionForm({ suppressionId }: { suppressionId: number }) {
  const [state, formAction, pending] = useActionState(
    async (prev: LiftState, fd: FormData) => liftSuppressionAction(prev, fd),
    INITIAL,
  );
  const id = `lift-reason-${suppressionId}`;
  return (
    <form action={formAction} className="pt-lead-panel">
      <input type="hidden" name="suppressionId" value={suppressionId} />
      <label htmlFor={id} className="pt-lead-label">
        Motif de réactivation
      </label>
      <textarea id={id} name="reason" rows={2} required minLength={3} maxLength={300} />
      <div aria-live="polite">
        {state.message ? (
          <p className={state.ok ? 'pt-helper' : 'pt-error'}>{state.message}</p>
        ) : null}
      </div>
      <div className="pt-lead-panel-actions">
        <button type="submit" className="pt-btn-ghost" disabled={pending}>
          Réactiver
        </button>
      </div>
    </form>
  );
}
