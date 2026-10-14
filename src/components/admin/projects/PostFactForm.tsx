'use client';

import { useActionState, useState } from 'react';
import { AlertCircle, CheckCircle2, TriangleAlert } from 'lucide-react';
import { postFactAction, type ProjectActionState } from '@/app/admin/projets/actions';
import { PROJECT_COPY } from '@/lib/projects/copy';
import {
  ADMIN_POSTABLE_FACTS,
  FACT_LABELS,
  STEPS,
  deriveProjectState,
  effectiveFacts,
  isFactAhead,
  type Fact,
  type FactType,
} from '@/lib/projects/steps';
import ConfirmAction from '../shared/ConfirmAction';
import '../leads/leads.css';

const INITIAL: ProjectActionState = { status: 'idle' };
const NOTE_MAX = 500;
const EPOCH = '1970-01-01T00:00:00.000Z';

/** Conséquence de l'enregistrement : l'étape avance-t-elle (donc e-mail au client) ? */
function consequence(facts: Fact[], type: FactType): string {
  const before = deriveProjectState(facts, EPOCH);
  const after = deriveProjectState(
    [...facts, { id: Number.MAX_SAFE_INTEGER, type, targetFactId: null, actorKind: 'admin', createdAt: EPOCH }],
    EPOCH,
  );
  const copy = PROJECT_COPY.facts;
  if (after.currentStep === before.currentStep) return copy.confirmStays;
  if (after.currentStep === null) return copy.confirmDone;
  return copy.confirmAdvances(STEPS[after.currentStep - 1].name);
}

export default function PostFactForm({
  projectId,
  facts,
  signedFacts = [],
}: {
  projectId: string;
  facts: Fact[];
  signedFacts?: string[];
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: ProjectActionState, fd: FormData) => postFactAction(prev, fd),
    INITIAL,
  );
  const effective = new Set(effectiveFacts(facts).map((f) => f.type));
  const available = ADMIN_POSTABLE_FACTS.filter((t) => !effective.has(t));
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');
  // Après un succès : on vide le formulaire et on efface le message dès qu'un nouveau fait est choisi.
  const [lastState, setLastState] = useState(state);
  const [ack, setAck] = useState<ProjectActionState | null>(null);
  if (state !== lastState) {
    setLastState(state);
    if (state.status === 'success') {
      setSelected('');
      setNote('');
    }
  }

  const current = available.find((t) => t === selected) ?? '';
  const ahead = current !== '' && isFactAhead(facts, current);

  if (available.length === 0) {
    return <p className="pt-field-help">{PROJECT_COPY.facts.alreadyRecorded}</p>;
  }

  return (
    <div className="pt-lead-form">
      <div>
        <label htmlFor={`pf-type-${projectId}`} className="pt-lead-label">
          Fait à enregistrer
        </label>
        <select
          id={`pf-type-${projectId}`}
          name="type"
          required
          value={current}
          onChange={(e) => {
            setSelected(e.target.value);
            setAck(state);
          }}
        >
          <option value="">Choisir un fait</option>
          {available.map((t) => (
            <option key={t} value={t}>
              {FACT_LABELS[t]}
            </option>
          ))}
        </select>
        {current !== '' && signedFacts.includes(current) ? (
          <p className="pt-warning pt-text-14">
            {PROJECT_COPY.signature.admin.manualFactNotice}
          </p>
        ) : null}
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
      <ConfirmAction
        action={formAction}
        triggerLabel={PROJECT_COPY.facts.confirmTrigger}
        triggerVariant="ghost"
        triggerDisabled={!current || pending}
        successFocusId={`pf-type-${projectId}`}
        confirmLabel={PROJECT_COPY.facts.confirmRecord}
        keepLabel={PROJECT_COPY.facts.confirmKeep}
        pending={pending}
        description={current ? consequence(facts, current as FactType) : undefined}
        result={state}
        succeeded={state.status === 'success'}
        message={
          <>
            {state.status === 'error' ? (
              <p className="pt-error">
                <AlertCircle size={16} aria-hidden="true" /> {state.message}
              </p>
            ) : null}
            {state.status === 'success' && state !== ack ? (
              <p className="pt-success">
                <CheckCircle2 size={16} aria-hidden="true" /> {state.message}
                {state.mailLine ? <span> {state.mailLine}</span> : null}
              </p>
            ) : null}
          </>
        }
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="type" value={current} />
        <input type="hidden" name="note" value={note} />
      </ConfirmAction>
    </div>
  );
}
