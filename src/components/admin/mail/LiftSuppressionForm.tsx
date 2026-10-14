'use client';

import { useActionState, useEffect, useRef } from 'react';
import { liftSuppressionAction, type LiftState } from '@/app/admin/emails/actions';
import ConfirmAction from '@/components/admin/shared/ConfirmAction';
import '@/components/admin/shared/inline.css';

const INITIAL: LiftState = { ok: false, message: null };

/**
 * `active` vient de la ligne rendue par le serveur. Le composant reste monté après la réussite (la ligne passe
 * à « Réactivée » dans la même passe) : le message de succès vit dans une région live qui existait déjà, et le
 * focus se pose sur ce message au lieu de tomber sur <body>.
 */
export default function LiftSuppressionForm({
  suppressionId,
  active = true,
}: {
  suppressionId: number;
  active?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: LiftState, fd: FormData) => liftSuppressionAction(prev, fd),
    INITIAL,
  );
  const doneRef = useRef<HTMLParagraphElement>(null);
  const id = `lift-reason-${suppressionId}`;

  useEffect(() => {
    if (state.ok) doneRef.current?.focus();
  }, [state]);

  return (
    <div className="pt-confirm">
      {active ? (
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
          message={!state.ok && state.message ? <p className="pt-error">{state.message}</p> : null}
        >
          <input type="hidden" name="suppressionId" value={suppressionId} />
          <div>
            <label htmlFor={id} className="pt-inline-label">
              Motif de réactivation
            </label>
            <textarea id={id} name="reason" rows={2} required minLength={3} maxLength={300} />
          </div>
        </ConfirmAction>
      ) : state.ok ? null : (
        <span>Aucune action</span>
      )}
      <div className="pt-confirm-live" aria-live="polite">
        {state.ok && state.message ? (
          <p ref={doneRef} tabIndex={-1} className="pt-helper">
            {state.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
