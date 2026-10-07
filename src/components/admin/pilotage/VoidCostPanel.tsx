'use client';

import { useActionState, useState } from 'react';
import { voidProjectCostAction, type CostFormState } from '@/app/admin/pilotage/couts/actions';
import { FormMessage } from './CostForms';
import '../leads/leads.css';
import './pilotage.css';

const INITIAL: CostFormState = { status: 'idle' };

export default function VoidCostPanel({ costId }: { costId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: CostFormState, fd: FormData) => {
      const next = await voidProjectCostAction(prev, fd);
      if (next.status === 'success') setOpen(false);
      return next;
    },
    INITIAL,
  );

  if (!open) {
    return (
      <button type="button" className="pt-btn-text" aria-expanded={false} onClick={() => setOpen(true)}>
        Annuler ce coût
      </button>
    );
  }
  return (
    <form action={formAction} className="pt-warning">
      <input type="hidden" name="costId" value={costId} />
      <p>
        Annuler ce coût : il sort des marges et de la trésorerie, mais reste visible dans l&apos;historique avec le
        statut Annulé. Cette action ne peut pas être annulée.
      </p>
      <FormMessage state={state} />
      <div className="pt-lead-panel-actions">
        <button type="submit" className="pt-btn-primary" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Annuler ce coût'}
        </button>
        <button type="button" className="pt-btn-text" autoFocus onClick={() => setOpen(false)}>
          Garder le coût
        </button>
      </div>
    </form>
  );
}
