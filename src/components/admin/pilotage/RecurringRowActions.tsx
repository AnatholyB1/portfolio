'use client';

import { useActionState, useState } from 'react';
import { stopRecurringAction, type CostFormState } from '@/app/admin/pilotage/couts/actions';
import { FormMessage, RecurringCostForm, type RecurringInitial } from './CostForms';
import '../leads/leads.css';
import './pilotage.css';

const INITIAL: CostFormState = { status: 'idle' };

export default function RecurringRowActions({
  version,
  today,
}: {
  version: RecurringInitial;
  today: string;
}) {
  const [mode, setMode] = useState<'none' | 'edit' | 'stop'>('none');
  const [state, formAction, pending] = useActionState(
    async (prev: CostFormState, fd: FormData) => {
      const next = await stopRecurringAction(prev, fd);
      if (next.status === 'success') setMode('none');
      return next;
    },
    INITIAL,
  );

  return (
    <div className="pt-pilot-costs-actions">
      <div className="pt-pilot-costs-buttons">
        <button type="button" className="pt-btn-text" aria-expanded={mode === 'edit'} onClick={() => setMode('edit')}>
          Modifier
        </button>
        <button type="button" className="pt-btn-text" aria-expanded={mode === 'stop'} onClick={() => setMode('stop')}>
          Arrêter
        </button>
      </div>
      {mode === 'edit' ? (
        <RecurringCostForm today={today} initial={version} onDone={() => setMode('none')} />
      ) : null}
      {mode === 'stop' ? (
        <form action={formAction} className="pt-warning">
          <input type="hidden" name="seriesId" value={version.seriesId} />
          <p>
            Arrêter cette charge : elle ne sera plus comptée à partir du mois indiqué. L&apos;historique est conservé.
          </p>
          <div className="pt-field">
            <label htmlFor={`stop-${version.seriesId}`}>À partir du mois</label>
            <input
              id={`stop-${version.seriesId}`}
              name="fromMonth"
              type="month"
              className="pt-input"
              required
              defaultValue={today.slice(0, 7)}
            />
          </div>
          <FormMessage state={state} />
          <div className="pt-lead-panel-actions">
            <button type="submit" className="pt-btn-primary" disabled={pending}>
              {pending ? 'Enregistrement…' : 'Arrêter la charge'}
            </button>
            <button type="button" className="pt-btn-text" autoFocus onClick={() => setMode('none')}>
              Garder la charge
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
