'use client';

import { useActionState, useId, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { eraseLeadAction, type LeadActionState } from '@/app/admin/leads/actions';
import { ERASE_REASONS } from '@/lib/admin/leadLabels';
import ConfirmAction from '@/components/admin/shared/ConfirmAction';
import './leads.css';
import '@/components/admin/shared/inline.css';

const INITIAL: LeadActionState = { status: 'idle' };

export default function EraseLeadForm({
  leadId,
  nom,
  email,
}: {
  leadId: string;
  nom: string;
  email: string;
}) {
  const uid = useId();
  const [state, formAction, pending] = useActionState(
    async (prev: LeadActionState, fd: FormData) => eraseLeadAction(prev, fd),
    INITIAL,
  );
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const matches = email !== '' && typed.trim().toLowerCase() === email.trim().toLowerCase();

  return (
    <section className="pt-card" aria-labelledby={`${uid}-title`}>
      <h2 id={`${uid}-title`} className="pt-heading">
        Données personnelles
      </h2>
      <ConfirmAction
        triggerLabel="Effacer les données personnelles…"
        confirmLabel="Effacer définitivement"
        keepLabel="Garder les données"
        pendingLabel="Effacement…"
        action={formAction}
        pending={pending}
        confirmDisabled={!reason || !matches}
        result={state}
        succeeded={state.status === 'success'}
        description={
          <>
            Cette action est définitive. Le nom, l&apos;e-mail, le téléphone et les notes de {nom} seront
            supprimés. La source et l&apos;historique anonymisé sont conservés pour l&apos;entonnoir. Saisissez{' '}
            {email} pour confirmer.
          </>
        }
        message={
          state.status === 'error' ? (
            <p className="pt-error">
              <AlertCircle size={16} aria-hidden="true" /> {state.message}
            </p>
          ) : state.status === 'success' ? (
            <p className="pt-success">
              <CheckCircle2 size={16} aria-hidden="true" /> {state.message}
            </p>
          ) : null
        }
      >
        <input type="hidden" name="leadId" value={leadId} />
        <fieldset className="pt-plain">
          <legend className="pt-inline-label">Motif</legend>
          {ERASE_REASONS.map((r) => (
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
          <label htmlFor={`${uid}-confirm`} className="pt-inline-label">
            Confirmer l&apos;e-mail
          </label>
          <input
            id={`${uid}-confirm`}
            name="confirmEmail"
            type="text"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
      </ConfirmAction>
    </section>
  );
}
