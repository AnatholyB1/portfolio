'use client';

import { useActionState, useEffect, useState } from 'react';
import { revokeFactAction, type ProjectActionState } from '@/app/admin/projets/actions';
import { PROJECT_COPY } from '@/lib/projects/copy';
import '../leads/leads.css';

const INITIAL: ProjectActionState = { status: 'idle' };
const REASON_MIN = 10;
const REASON_MAX = 500;

export default function RevokePanel({
  projectId,
  factId,
  factLabel,
  onClose,
}: {
  projectId: string;
  factId: number;
  factLabel: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: ProjectActionState, fd: FormData) => revokeFactAction(prev, fd),
    INITIAL,
  );
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (state.status === 'success') onClose();
  }, [state, onClose]);

  const id = `rv-reason-${factId}`;
  return (
    <form action={formAction} className="pt-lead-panel">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="factId" value={factId} />
      <p>
        <strong>{PROJECT_COPY.facts.revokeTitle}</strong> : {PROJECT_COPY.facts.revokeBody(factLabel)}
      </p>
      <label htmlFor={id} className="pt-lead-label">
        Motif de l&apos;annulation
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
      <div aria-live="polite">
        {state.status === 'error' ? <p className="pt-error">{state.message}</p> : null}
      </div>
      <div className="pt-lead-panel-actions">
        <button
          type="submit"
          className="pt-btn-ghost"
          style={{ color: 'var(--warm)', borderColor: 'var(--warm)' }}
          disabled={reason.trim().length < REASON_MIN || pending}
        >
          {"Confirmer l'annulation"}
        </button>
        <button type="button" className="pt-btn-text" onClick={onClose}>
          Garder ce fait
        </button>
      </div>
    </form>
  );
}
