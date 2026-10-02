'use client';

import { useActionState, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { eraseLeadAction, type LeadActionState } from '@/app/admin/leads/actions';
import { ERASE_REASONS } from '@/lib/admin/leadLabels';
import './leads.css';

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
  const [state, formAction, pending] = useActionState(
    async (prev: LeadActionState, fd: FormData) => eraseLeadAction(prev, fd),
    INITIAL,
  );
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const matches = email !== '' && typed.trim().toLowerCase() === email.trim().toLowerCase();

  return (
    <details className="pt-card pt-lead-disclosure">
      <summary>Effacer les données personnelles</summary>
      <form action={formAction} className="pt-lead-form">
        <input type="hidden" name="leadId" value={leadId} />
        <p className="pt-helper">
          Effacer les données personnelles : Cette action est définitive. Le nom, l&apos;e-mail, le
          téléphone et les notes de {nom} seront supprimés. La source et l&apos;historique anonymisé
          sont conservés pour l&apos;entonnoir. Saisissez {email} pour confirmer.
        </p>
        <fieldset className="pt-plain">
          <legend>Motif</legend>
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
          <label htmlFor="erase-confirm" className="pt-lead-label">Confirmer l&apos;e-mail</label>
          <input
            id="erase-confirm"
            name="confirmEmail"
            type="text"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
        <div aria-live="polite">
          {state.status === 'error' ? (
            <p className="pt-error">
              <AlertCircle size={16} aria-hidden="true" /> {state.message}
            </p>
          ) : null}
          {state.status === 'success' ? (
            <p className="pt-success">
              <CheckCircle2 size={16} aria-hidden="true" /> {state.message}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          className="pt-btn-ghost pt-lead-danger"
          disabled={!reason || !matches || pending}
        >
          Effacer définitivement
        </button>
      </form>
    </details>
  );
}
