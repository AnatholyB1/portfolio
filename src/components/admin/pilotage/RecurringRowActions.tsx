'use client';

import { useActionState, useId, useState } from 'react';
import { stopRecurringAction, type CostFormState } from '@/app/admin/pilotage/couts/actions';
import ConfirmAction from '@/components/admin/shared/ConfirmAction';
import { FormMessage, RecurringCostForm, type RecurringInitial } from './CostForms';
import './pilotage.css';

const INITIAL: CostFormState = { status: 'idle' };

export default function RecurringRowActions({
  version,
  today,
}: {
  version: RecurringInitial;
  today: string;
}) {
  const uid = useId();
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(stopRecurringAction, INITIAL);

  return (
    <div className="pt-pilot-costs-actions">
      <div className="pt-pilot-costs-buttons">
        <button type="button" className="pt-btn-text" aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
          Modifier
        </button>
      </div>
      {editing ? <RecurringCostForm today={today} initial={version} onDone={() => setEditing(false)} /> : null}
      <ConfirmAction
        triggerLabel="Arrêter cette charge…"
        confirmLabel="Confirmer l'arrêt"
        keepLabel="Garder la charge"
        action={formAction}
        pending={pending}
        result={state}
        succeeded={state.status === 'success'}
        description="Arrêter cette charge : elle ne sera plus comptée à partir du mois indiqué. L'historique est conservé."
        message={<FormMessage state={state} />}
      >
        <input type="hidden" name="seriesId" value={version.seriesId} />
        <div>
          <label htmlFor={`${uid}-stop`} className="pt-inline-label">
            À partir du mois
          </label>
          <input id={`${uid}-stop`} name="fromMonth" type="month" required defaultValue={today.slice(0, 7)} />
        </div>
      </ConfirmAction>
    </div>
  );
}
