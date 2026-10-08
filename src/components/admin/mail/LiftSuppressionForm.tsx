'use client';

import { useActionState } from 'react';
import { liftSuppressionAction, type LiftState } from '@/app/admin/emails/actions';
import ConfirmAction from '@/components/admin/shared/ConfirmAction';
import '@/components/admin/shared/inline.css';

const INITIAL: LiftState = { ok: false, message: null };

export default function LiftSuppressionForm({ suppressionId }: { suppressionId: number }) {
  const [state, formAction, pending] = useActionState(
    async (prev: LiftState, fd: FormData) => liftSuppressionAction(prev, fd),
    INITIAL,
  );
  const id = `lift-reason-${suppressionId}`;
  return (
    <ConfirmAction
      triggerLabel="Réactiver cette adresse…"
      confirmLabel="Réactiver l'envoi"
      keepLabel="Garder la suppression"
      pendingLabel="Réactivation…"
      action={formAction}
      pending={pending}
      result={state}
      succeeded={state.ok}
      description="Cette adresse pourra de nouveau recevoir nos e-mails. L'action est journalisée avec votre motif."
      message={state.message ? <p className={state.ok ? 'pt-helper' : 'pt-error'}>{state.message}</p> : null}
    >
      <input type="hidden" name="suppressionId" value={suppressionId} />
      <div>
        <label htmlFor={id} className="pt-inline-label">
          Motif de réactivation
        </label>
        <textarea id={id} name="reason" rows={2} required minLength={3} maxLength={300} />
      </div>
    </ConfirmAction>
  );
}
