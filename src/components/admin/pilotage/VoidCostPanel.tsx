'use client';

import { useActionState } from 'react';
import { voidProjectCostAction, type CostFormState } from '@/app/admin/pilotage/couts/actions';
import ConfirmAction from '@/components/admin/shared/ConfirmAction';
import { FormMessage } from './CostForms';
import './pilotage.css';

const INITIAL: CostFormState = { status: 'idle' };

export default function VoidCostPanel({ costId }: { costId: number }) {
  const [state, formAction, pending] = useActionState(voidProjectCostAction, INITIAL);

  return (
    <ConfirmAction
      triggerLabel="Invalider ce coût…"
      confirmLabel="Confirmer l'invalidation"
      keepLabel="Garder le coût"
      action={formAction}
      pending={pending}
      result={state}
      succeeded={state.status === 'success'}
      description="Le coût sort des marges et de la trésorerie, mais reste visible dans l'historique avec le statut Annulé. Cette action est définitive."
      message={<FormMessage state={state} />}
    >
      <input type="hidden" name="costId" value={costId} />
    </ConfirmAction>
  );
}
