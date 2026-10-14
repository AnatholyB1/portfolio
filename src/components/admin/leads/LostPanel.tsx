'use client';

import { useActionState, useEffect, useState } from 'react';
import { markLostAction, type LeadActionState } from '@/app/admin/leads/actions';
import { ConfirmPanel } from '@/components/admin/shared/ConfirmAction';
import { LOST_REASONS } from '@/lib/admin/leadLabels';
import './leads.css';
import '@/components/admin/shared/inline.css';

const INITIAL: LeadActionState = { status: 'idle' };
const NOTE_MAX = 500;

export const LOST_PANEL_COPY = {
  description:
    'Le lead passe au statut « Perdu » avec le motif choisi. Vous pourrez le rouvrir en changeant son statut.',
  confirmLabel: 'Confirmer la perte',
  keepLabel: 'Garder le statut actuel',
} as const;

// Panneau « Perdu » en ligne : motif obligatoire (liste fermée), note facultative.
// Reprend le motif de confirmation partagé (contour --warm, issue sûre en premier) et prend le focus à l'ouverture.
export default function LostPanel({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(markLostAction, INITIAL);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (state.status === 'success') onClose();
  }, [state, onClose]);

  return (
    <ConfirmPanel
      className="pt-lead-panel"
      autoFocus
      action={formAction}
      pending={pending}
      confirmDisabled={!reason}
      confirmLabel={LOST_PANEL_COPY.confirmLabel}
      keepLabel={LOST_PANEL_COPY.keepLabel}
      onKeep={onClose}
      description={LOST_PANEL_COPY.description}
    >
      <input type="hidden" name="leadId" value={leadId} />
      <fieldset className="pt-plain">
        <legend>Motif de perte</legend>
        {LOST_REASONS.map((r) => (
          <label key={r.code} className="pt-lead-radio">
            <input
              type="radio"
              name="reason"
              value={r.code}
              checked={reason === r.code}
              onChange={() => setReason(r.code)}
              required
            />
            <span>{r.label}</span>
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor={`lost-note-${leadId}`} className="pt-lead-label">
          Note
        </label>
        <textarea
          id={`lost-note-${leadId}`}
          name="note"
          maxLength={NOTE_MAX}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="pt-field-help">
          {note.length} / {NOTE_MAX}
        </p>
      </div>
      <p className="pt-error" aria-live="polite">
        {state.status === 'error' ? state.message : ''}
      </p>
    </ConfirmPanel>
  );
}
