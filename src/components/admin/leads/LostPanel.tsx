'use client';

import { useActionState, useEffect, useState } from 'react';
import { markLostAction, type LeadActionState } from '@/app/admin/leads/actions';
import { LOST_REASONS } from '@/lib/admin/leadLabels';
import './leads.css';

const INITIAL: LeadActionState = { status: 'idle' };
const NOTE_MAX = 500;

// Panneau « Perdu » en ligne : motif obligatoire (liste fermée), note facultative.
export default function LostPanel({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(markLostAction, INITIAL);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (state.status === 'success') onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="pt-lead-panel">
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
      {state.status === 'error' ? (
        <p className="pt-error" aria-live="polite">
          {state.message}
        </p>
      ) : null}
      <div className="pt-lead-panel-actions">
        <button type="submit" className="pt-btn-primary" disabled={!reason || pending}>
          Marquer comme perdu
        </button>
        <button type="button" className="pt-btn-ghost" onClick={onClose}>
          Annuler la perte
        </button>
      </div>
    </form>
  );
}
