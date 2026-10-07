'use client';

import { useActionState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addProjectCostAction,
  addRecurringCostAction,
  saveBalanceAction,
  type CostFormState,
} from '@/app/admin/pilotage/couts/actions';
import { COST_CATEGORY_KEYS, COST_CATEGORY_LABELS } from '@/lib/server/pilotage/costSchemas';
import '../leads/leads.css';
import './pilotage.css';

const INITIAL: CostFormState = { status: 'idle' };

function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="pt-btn-primary" disabled={pending}>
      {pending ? 'Enregistrement…' : children}
    </button>
  );
}

export function FormMessage({ state }: { state: CostFormState }) {
  if (state.status === 'error') {
    return (
      <p role="alert" className="pt-error">
        {state.message}
      </p>
    );
  }
  if (state.status === 'success') {
    return (
      <p role="status" className="pt-success">
        {state.message}
      </p>
    );
  }
  return null;
}

function CategorySelect({ id, defaultValue }: { id: string; defaultValue?: string }) {
  return (
    <select id={id} name="category" className="pt-input" required defaultValue={defaultValue ?? COST_CATEGORY_KEYS[0]}>
      {COST_CATEGORY_KEYS.map((k) => (
        <option key={k} value={k}>
          {COST_CATEGORY_LABELS[k]}
        </option>
      ))}
    </select>
  );
}

export function BalanceForm({ today }: { today: string }) {
  const [state, formAction] = useActionState(saveBalanceAction, INITIAL);
  return (
    <form action={formAction} className="pt-lead-panel pt-pilot-costs-form">
      <div className="pt-field">
        <label htmlFor="bal-amount">Solde bancaire (€)</label>
        <input id="bal-amount" name="amount" type="text" inputMode="decimal" className="pt-input" required />
        <p className="pt-field-help">Peut être négatif en cas de découvert.</p>
      </div>
      <div className="pt-field">
        <label htmlFor="bal-date">Date du solde</label>
        <input id="bal-date" name="asOf" type="date" className="pt-input" required defaultValue={today} />
      </div>
      <div className="pt-field">
        <label htmlFor="bal-note">Note (facultatif)</label>
        <input id="bal-note" name="note" type="text" className="pt-input" maxLength={200} />
      </div>
      <SubmitButton>Enregistrer le solde</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export type RecurringInitial = {
  seriesId: string;
  label: string;
  category: string;
  amountCents: number;
  frequency: 'monthly' | 'yearly';
  startsOn: string;
  endsOn: string | null;
};

export function RecurringCostForm({
  today,
  initial,
  onDone,
}: {
  today: string;
  initial?: RecurringInitial;
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(
    async (prev: CostFormState, fd: FormData) => {
      const next = await addRecurringCostAction(prev, fd);
      if (next.status === 'success') onDone?.();
      return next;
    },
    INITIAL,
  );
  const p = initial ? `rc-${initial.seriesId}` : 'rc-new';
  return (
    <form action={formAction} className="pt-lead-panel pt-pilot-costs-form">
      {initial ? <input type="hidden" name="seriesId" value={initial.seriesId} /> : null}
      <div className="pt-field">
        <label htmlFor={`${p}-label`}>Libellé</label>
        <input
          id={`${p}-label`}
          name="label"
          type="text"
          className="pt-input"
          maxLength={120}
          required
          defaultValue={initial?.label}
        />
      </div>
      <div className="pt-field">
        <label htmlFor={`${p}-cat`}>Catégorie</label>
        <CategorySelect id={`${p}-cat`} defaultValue={initial?.category} />
      </div>
      <div className="pt-field">
        <label htmlFor={`${p}-amount`}>Montant (€)</label>
        <input
          id={`${p}-amount`}
          name="amount"
          type="text"
          inputMode="decimal"
          className="pt-input"
          required
          defaultValue={initial ? String(initial.amountCents / 100).replace('.', ',') : undefined}
        />
      </div>
      <fieldset className="pt-seg">
        <legend>Fréquence</legend>
        <label>
          <input type="radio" name="frequency" value="monthly" defaultChecked={(initial?.frequency ?? 'monthly') === 'monthly'} />
          Mensuelle
        </label>
        <label>
          <input type="radio" name="frequency" value="yearly" defaultChecked={initial?.frequency === 'yearly'} />
          Annuelle
        </label>
      </fieldset>
      <div className="pt-field">
        <label htmlFor={`${p}-start`}>Début</label>
        <input
          id={`${p}-start`}
          name="startsOn"
          type="date"
          className="pt-input"
          required
          defaultValue={initial?.startsOn ?? today}
        />
      </div>
      <div className="pt-field">
        <label htmlFor={`${p}-end`}>Fin (facultatif)</label>
        <input id={`${p}-end`} name="endsOn" type="date" className="pt-input" defaultValue={initial?.endsOn ?? ''} />
      </div>
      <SubmitButton>{initial ? 'Enregistrer une nouvelle version' : 'Ajouter la charge récurrente'}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function ProjectCostForm({
  projects,
  today,
}: {
  projects: { id: string; title: string; clientName: string; isTest: boolean }[];
  today: string;
}) {
  const [state, formAction] = useActionState(addProjectCostAction, INITIAL);
  return (
    <form action={formAction} className="pt-lead-panel pt-pilot-costs-form">
      <div className="pt-field">
        <label htmlFor="pc-project">Projet</label>
        <select id="pc-project" name="projectId" className="pt-input" required defaultValue="">
          <option value="" disabled>
            Choisir un projet
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {`${p.title} · ${p.clientName}${p.isTest ? ' (test)' : ''}`}
            </option>
          ))}
        </select>
      </div>
      <div className="pt-field">
        <label htmlFor="pc-date">Date</label>
        <input id="pc-date" name="incurredOn" type="date" className="pt-input" required defaultValue={today} />
      </div>
      <div className="pt-field">
        <label htmlFor="pc-cat">Catégorie</label>
        <CategorySelect id="pc-cat" />
      </div>
      <div className="pt-field">
        <label htmlFor="pc-label">Libellé</label>
        <input id="pc-label" name="label" type="text" className="pt-input" maxLength={120} required />
      </div>
      <div className="pt-field">
        <label htmlFor="pc-amount">Montant payé TTC (€)</label>
        <input id="pc-amount" name="amount" type="text" inputMode="decimal" className="pt-input" required />
        <p className="pt-field-help">Le montant réellement payé, TVA d&apos;achat comprise.</p>
      </div>
      <div className="pt-field">
        <label htmlFor="pc-vat">TVA (facultatif)</label>
        <input id="pc-vat" name="vat" type="text" inputMode="decimal" className="pt-input" />
      </div>
      <SubmitButton>Ajouter le coût</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
