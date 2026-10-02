'use client';

import { useActionState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { correctSourceAction, type LeadActionState } from '@/app/admin/leads/actions';
import './leads.css';

const INITIAL: LeadActionState = { status: 'idle' };

export default function CorrectSourceForm({
  leadId,
  source,
  medium,
  campaign,
}: {
  leadId: string;
  source: string;
  medium: string;
  campaign: string;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: LeadActionState, fd: FormData) => correctSourceAction(prev, fd),
    INITIAL,
  );

  return (
    <details className="pt-card pt-lead-disclosure">
      <summary>Corriger la source</summary>
      <form action={formAction} className="pt-lead-form">
        <input type="hidden" name="leadId" value={leadId} />
        <div>
          <label htmlFor="cs-source" className="pt-lead-label">Source</label>
          <input id="cs-source" name="source" type="text" required maxLength={200} defaultValue={source} />
        </div>
        <div>
          <label htmlFor="cs-medium" className="pt-lead-label">Support (medium)</label>
          <input id="cs-medium" name="medium" type="text" required maxLength={200} defaultValue={medium} />
        </div>
        <div>
          <label htmlFor="cs-campaign" className="pt-lead-label">Campagne</label>
          <input
            id="cs-campaign"
            name="campaign"
            type="text"
            maxLength={200}
            defaultValue={campaign}
            aria-describedby="cs-campaign-help"
          />
          <p id="cs-campaign-help" className="pt-field-help">En minuscules, 200 caractères maximum.</p>
        </div>
        <div>
          <label htmlFor="cs-reason" className="pt-lead-label">Motif de la correction</label>
          <textarea id="cs-reason" name="reason" rows={3} required minLength={10} maxLength={500} />
          <p className="pt-field-help">10 à 500 caractères.</p>
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
        <button type="submit" className="pt-btn-primary" disabled={pending}>
          Enregistrer la correction
        </button>
      </form>
    </details>
  );
}
