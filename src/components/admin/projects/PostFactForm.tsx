'use client';

import { useActionState, useState } from 'react';
import { AlertCircle, CheckCircle2, TriangleAlert } from 'lucide-react';
import { postFactAction, type ProjectActionState } from '@/app/admin/projets/actions';
import { PROJECT_COPY } from '@/lib/projects/copy';
import {
  ADMIN_POSTABLE_FACTS,
  FACT_LABELS,
  effectiveFacts,
  isFactAhead,
  type Fact,
} from '@/lib/projects/steps';
import '../leads/leads.css';

const INITIAL: ProjectActionState = { status: 'idle' };
const NOTE_MAX = 500;

export default function PostFactForm({ projectId, facts }: { projectId: string; facts: Fact[] }) {
  const [state, formAction, pending] = useActionState(
    async (prev: ProjectActionState, fd: FormData) => postFactAction(prev, fd),
    INITIAL,
  );
  const effective = new Set(effectiveFacts(facts).map((f) => f.type));
  const available = ADMIN_POSTABLE_FACTS.filter((t) => !effective.has(t));
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');

  const current = available.find((t) => t === selected) ?? '';
  const ahead = current !== '' && isFactAhead(facts, current);

  if (available.length === 0) {
    return <p className="pt-field-help">{PROJECT_COPY.facts.alreadyRecorded}</p>;
  }

  return (
    <form action={formAction} className="pt-lead-form">
      <input type="hidden" name="projectId" value={projectId} />
      <div>
        <label htmlFor={`pf-type-${projectId}`} className="pt-lead-label">
          Fait à enregistrer
        </label>
        <select
          id={`pf-type-${projectId}`}
          name="type"
          required
          value={current}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Choisir un fait</option>
          {available.map((t) => (
            <option key={t} value={t}>
              {FACT_LABELS[t]}
            </option>
          ))}
        </select>
        {ahead ? (
          <p className="pt-warn">
            <TriangleAlert size={16} aria-hidden="true" /> {PROJECT_COPY.facts.ahead}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor={`pf-note-${projectId}`} className="pt-lead-label">
          Motif ou note (interne, 500 caractères max)
        </label>
        <textarea
          id={`pf-note-${projectId}`}
          name="note"
          rows={3}
          maxLength={NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="pt-field-help">
          {note.length} / {NOTE_MAX}
        </p>
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
            {state.mailLine ? <span> {state.mailLine}</span> : null}
          </p>
        ) : null}
      </div>
      <button type="submit" className="pt-btn-primary" disabled={!current || pending}>
        Enregistrer le fait
      </button>
    </form>
  );
}
