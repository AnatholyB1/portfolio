'use client';

import { useActionState, useRef, useState } from 'react';
import { saveCostAction, type CostActionState } from '@/app/admin/entonnoir/actions';
import './funnel.css';

const INITIAL: CostActionState = { status: 'idle' };

type Props = {
  source: string;
  campaign: string;
  /** 'YYYY-MM' */
  month: string;
  currentCents: number | null;
};

// Saisie manuelle du coût par RDV (en euros, stocké en centimes côté serveur).
export default function CostEditor({ source, campaign, month, currentCents }: Props) {
  const [state, formAction, pending] = useActionState(saveCostAction, INITIAL);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [lastSeen, setLastSeen] = useState(state);

  // Ferme l'éditeur quand une action réussit (dérivé du changement d'état, sans effet).
  if (state !== lastSeen) {
    setLastSeen(state);
    if (state.status === 'success') setOpen(false);
  }

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  const inputId = `cost-${source}-${campaign}-${month}`.replace(/[^a-zA-Z0-9_-]/g, '_');

  return (
    <div className="pt-funnel-cost-editor">
      <button
        ref={triggerRef}
        type="button"
        className="pt-btn-text"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {currentCents === null ? 'Saisir' : 'Modifier'}
      </button>
      {open ? (
        <form action={formAction} className="pt-lead-panel">
          <input type="hidden" name="source" value={source} />
          <input type="hidden" name="campaign" value={campaign} />
          <input type="hidden" name="month" value={month} />
          <label htmlFor={inputId} className="pt-lead-label">
            Coût par RDV (€)
          </label>
          <input
            id={inputId}
            name="amount"
            type="text"
            inputMode="decimal"
            required
            autoFocus
            defaultValue={currentCents === null ? '' : String(currentCents / 100).replace('.', ',')}
            aria-invalid={state.status === 'error'}
          />
          <div className="pt-lead-panel-actions">
            <button type="submit" className="pt-btn-primary" disabled={pending}>
              Enregistrer le coût
            </button>
            <button type="button" className="pt-btn-ghost" onClick={close}>
              Annuler la saisie
            </button>
          </div>
        </form>
      ) : null}
      <p aria-live="polite" className={state.status === 'error' ? 'pt-error' : 'pt-success'}>
        {state.message ?? ''}
      </p>
    </div>
  );
}
