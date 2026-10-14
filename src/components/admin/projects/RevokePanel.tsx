'use client';

import { useActionState, useEffect, useState } from 'react';
import { revokeFactAction, type ProjectActionState } from '@/app/admin/projets/actions';
import { ConfirmPanel } from '@/components/admin/shared/ConfirmAction';
import { PROJECT_COPY } from '@/lib/projects/copy';
import '../leads/leads.css';
import '@/components/admin/shared/inline.css';

const INITIAL: ProjectActionState = { status: 'idle' };
const REASON_MIN = 10;
const REASON_MAX = 500;

// Panneau d'invalidation d'un fait : le déclencheur (« Invalider ce fait ») vit dans FactJournal.
export default function RevokePanel({
  projectId,
  factId,
  factLabel,
  onClose,
}: {
  projectId: string;
  factId: number;
  factLabel: string;
  /** `done` : le fait vient d'être invalidé (le panneau se ferme parce que l'action a réussi). */
  onClose: (done: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: ProjectActionState, fd: FormData) => revokeFactAction(prev, fd),
    INITIAL,
  );
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (state.status === 'success') onClose(true);
  }, [state, onClose]);

  const id = `rv-reason-${factId}`;
  return (
    <ConfirmPanel
      action={formAction}
      confirmLabel="Confirmer l'invalidation"
      keepLabel="Garder ce fait"
      pending={pending}
      confirmDisabled={reason.trim().length < REASON_MIN}
      autoFocus
      onKeep={() => onClose(false)}
      description={
        <>
          <strong>Invalider ce fait</strong> : {PROJECT_COPY.facts.revokeBody(factLabel)}
        </>
      }
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="factId" value={factId} />
      <div>
        <label htmlFor={id} className="pt-inline-label">
          Motif de l&apos;invalidation
        </label>
        <textarea
          id={id}
          name="reason"
          rows={3}
          required
          minLength={REASON_MIN}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <p className="pt-field-help">
          {reason.length} / {REASON_MAX}
        </p>
      </div>
      <div aria-live="polite">
        {state.status === 'error' ? <p className="pt-error">{state.message}</p> : null}
      </div>
    </ConfirmPanel>
  );
}
