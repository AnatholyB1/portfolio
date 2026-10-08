'use client';

import { useActionState } from 'react';
import { setReminderHoldAction, type HoldActionState } from '@/app/admin/projets/reminderHold.actions';
import ConfirmAction from '@/components/admin/shared/ConfirmAction';
import { formatDateFr } from '@/lib/admin/format';
import '../leads/leads.css';
import '@/components/admin/shared/inline.css';

const INITIAL: HoldActionState = { ok: false, message: null };

export default function ReminderHoldCard({
  projectId,
  hold,
}: {
  projectId: string;
  hold: { suspended: boolean; since: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: HoldActionState, fd: FormData) => setReminderHoldAction(prev, fd),
    INITIAL,
  );
  return (
    <section className="pt-card" aria-labelledby="proj-hold-title">
      <h2 id="proj-hold-title" className="pt-heading">
        Relances automatiques
      </h2>
      {hold === null ? (
        <p className="pt-helper">État des relances indisponible.</p>
      ) : (
        <>
          <p className="pt-lead-sub">
            {hold.suspended
              ? `Suspendues depuis le ${hold.since ? formatDateFr(hold.since) : ''}`.trim()
              : 'Actives'}
          </p>
          <p className="pt-helper">
            Concerne les relances de documents non signés et les demandes d&apos;avis. Les relances
            d&apos;acompte continuent jusqu&apos;au paiement ou à l&apos;avoir.
          </p>
          <ConfirmAction
            triggerLabel={hold.suspended ? 'Reprendre les relances…' : 'Suspendre les relances…'}
            confirmLabel={hold.suspended ? 'Confirmer la reprise' : 'Confirmer la suspension'}
            keepLabel={hold.suspended ? 'Garder la suspension' : 'Garder les relances actives'}
            action={formAction}
            pending={pending}
            result={state}
            succeeded={state.ok}
            description={
              hold.suspended
                ? "Les relances de documents non signés et les demandes d'avis reprendront pour ce projet."
                : "Plus aucune relance de document non signé ni demande d'avis ne partira pour ce projet, jusqu'à la reprise."
            }
            message={state.message ? <p className={state.ok ? 'pt-helper' : 'pt-error'}>{state.message}</p> : null}
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="action" value={hold.suspended ? 'resume' : 'suspend'} />
          </ConfirmAction>
        </>
      )}
    </section>
  );
}
