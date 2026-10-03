'use client';

import { useState } from 'react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import type { DocumentInput } from '@/lib/documents/schemas';
import type { DocumentActions, FieldErrors } from './types';
import PreviewIssuePanel from './PreviewIssuePanel';

const COPY = PROJECT_COPY.documents.admin;
const MAX = 4000;

type BaseFormProps = {
  projectId: string;
  replacingRevision: number | null;
  canIssue: boolean;
  blockedReason?: string;
  actions: Pick<DocumentActions, 'preview' | 'issue'>;
  onIssued?: () => void;
};

type Values = {
  context: string;
  scope: string;
  deliverables: string;
  outOfScope: string;
  planning: string;
  acceptanceCriteria: string;
};

const FIELDS: { name: keyof Values; label: string; required: boolean; helper?: string }[] = [
  { name: 'context', label: 'Contexte et objectif', required: true, helper: COPY.specGoalHelper },
  { name: 'scope', label: 'Périmètre', required: true },
  { name: 'deliverables', label: 'Livrables', required: true },
  { name: 'outOfScope', label: 'Hors périmètre (facultatif)', required: false },
  { name: 'planning', label: 'Planning (facultatif)', required: false },
  {
    name: 'acceptanceCriteria',
    label: "Critères d'acceptation",
    required: true,
    helper: COPY.specCriteriaHelper,
  },
];

export default function SpecForm({
  projectId,
  replacingRevision,
  canIssue,
  blockedReason,
  actions,
  onIssued,
  projectGoal,
}: BaseFormProps & { projectGoal: string | null }) {
  const [values, setValues] = useState<Values>({
    context: projectGoal ?? '',
    scope: '',
    deliverables: '',
    outOfScope: '',
    planning: '',
    acceptanceCriteria: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  function buildInput(): DocumentInput | null {
    const next: FieldErrors = {};
    for (const f of FIELDS) {
      if (f.required && values[f.name].trim() === '') next[f.name] = 'Champ requis.';
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return null;
    }
    setErrors({});
    return { docType: 'spec', projectId, documentId: '', ...values } as unknown as DocumentInput;
  }

  const dirtyKey = JSON.stringify(values);

  return (
    <div className="pt-lead-form">
      {FIELDS.map((f) => {
        const id = `sf-${f.name}`;
        const e = errors[f.name];
        const describedBy = [f.helper ? `${id}-help` : null, `${id}-count`, e ? `${id}-err` : null]
          .filter(Boolean)
          .join(' ');
        return (
          <div key={f.name}>
            <label htmlFor={id} className="pt-lead-label">
              {f.label}
            </label>
            <textarea
              id={id}
              rows={4}
              maxLength={MAX}
              value={values[f.name]}
              onChange={(ev) => setValues((v) => ({ ...v, [f.name]: ev.target.value }))}
              aria-invalid={e ? true : undefined}
              aria-describedby={describedBy}
            />
            {f.helper ? (
              <p className="pt-field-help" id={`${id}-help`}>
                {f.helper}
              </p>
            ) : null}
            <p className="pt-field-help" id={`${id}-count`}>
              {`${values[f.name].length} / ${MAX}`}
            </p>
            {e ? (
              <p className="pt-error" id={`${id}-err`}>
                {e}
              </p>
            ) : null}
          </div>
        );
      })}

      {Object.keys(errors).length > 0 ? <p className="pt-error">{COPY.validationSummary}</p> : null}

      <PreviewIssuePanel
        docType="spec"
        replacingRevision={replacingRevision}
        canIssue={canIssue}
        blockedReason={blockedReason}
        buildInput={buildInput}
        dirtyKey={dirtyKey}
        actions={actions}
        onFieldErrors={setErrors}
        onIssued={onIssued}
      />
    </div>
  );
}
