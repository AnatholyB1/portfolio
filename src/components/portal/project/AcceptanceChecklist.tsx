'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check } from 'lucide-react';
import type { SubmitAcceptanceResult } from '@/app/espace-client/documents/[id]/signer/actions';
import { PROJECT_COPY } from '@/lib/projects/copy';
import {
  ACCEPTANCE_NOTE_MAX,
  ACCEPTANCE_NOTE_MIN,
  acceptanceAnswersSchema,
  type AcceptanceAnswer,
  type AcceptanceStatus,
} from '@/lib/signature/acceptance';
import SigningFlow, { type SigningFlowProps } from './SigningFlow';
import './project.css';

const CL = PROJECT_COPY.signature.checklist;

type Draft = { status?: AcceptanceStatus; note: string };

type Props = {
  documentId: string;
  criteria: string[];
  submitAcceptanceAction: (id: string, answers: unknown) => Promise<SubmitAcceptanceResult>;
  /** Props du flux de signature affiché après « Continuer vers la signature ». */
  flow: Omit<SigningFlowProps, 'stepOffset' | 'recap' | 'onEditAnswers'>;
};

const OPTIONS: { status: AcceptanceStatus; label: string }[] = [
  { status: 'delivered', label: CL.delivered },
  { status: 'reserved', label: CL.reserve },
  { status: 'refused', label: CL.refused },
];

export default function AcceptanceChecklist({ documentId, criteria, submitAcceptanceAction, flow }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>(() => criteria.map(() => ({ note: '' })));
  const [stage, setStage] = useState<'form' | 'flow' | 'feedback'>('form');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const feedbackRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (stage === 'feedback') feedbackRef.current?.focus();
  }, [stage]);

  function setDraft(i: number, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }

  const incomplete = drafts.filter(
    (d) => !d.status || (d.status !== 'delivered' && d.note.trim().length < ACCEPTANCE_NOTE_MIN),
  ).length;
  const counts = { delivered: 0, reserved: 0, refused: 0 };
  for (const d of drafts) if (d.status) counts[d.status] += 1;
  const validated = counts.delivered + counts.reserved;
  const hasRefusal = counts.refused > 0;

  function buildAnswers(): AcceptanceAnswer[] {
    return drafts.map((d, i) => ({
      index: i + 1,
      status: d.status as AcceptanceStatus,
      ...(d.status === 'delivered' ? {} : { note: d.note.trim() }),
    }));
  }

  function onSubmit() {
    setError(null);
    if (incomplete > 0) return;
    const answers = buildAnswers();
    // Validation côté client pour les messages ; le serveur revalide.
    if (!acceptanceAnswersSchema(criteria.length).safeParse(answers).success) {
      setError(CL.feedbackFailed);
      return;
    }
    startTransition(async () => {
      try {
        const res = await submitAcceptanceAction(documentId, answers);
        if (!res.ok) {
          setError(res.message);
        } else if (res.outcome === 'refused') {
          setStage('feedback');
        } else {
          setStage('flow');
        }
      } catch {
        setError(CL.feedbackFailed);
      }
    });
  }

  if (stage === 'feedback') {
    return (
      <section className="pt-card pt-sign-success" aria-labelledby="sign-feedback-title">
        <h2 id="sign-feedback-title" className="pt-heading" ref={feedbackRef} tabIndex={-1}>
          {CL.sendFeedback}
        </h2>
        <p className="pt-success">
          <Check size={16} aria-hidden="true" />
          <span>{CL.feedbackSent}</span>
        </p>
        <Link href="/espace-client/documents" className="pt-btn-text pt-file-action">
          {PROJECT_COPY.signature.back}
        </Link>
      </section>
    );
  }

  if (stage === 'flow') {
    return (
      <SigningFlow
        {...flow}
        stepOffset={1}
        recap={CL.recap(validated, counts.reserved)}
        onEditAnswers={() => setStage('form')}
      />
    );
  }

  return (
    <div className="pt-sign">
      <h1 className="pt-heading">{PROJECT_COPY.signature.titles.acceptanceChecklist}</h1>
      <p>{CL.intro}</p>
      <ol className="pt-sign-criteria">
        {criteria.map((text, i) => {
          const d = drafts[i];
          const noteId = `crit-note-${i}`;
          const tooShort = d.status && d.status !== 'delivered' && d.note.trim().length < ACCEPTANCE_NOTE_MIN;
          return (
            <li key={i} className="pt-sign-criterion" data-status={d.status ?? 'none'}>
              <p className="pt-sign-criterion-text">
                <span className="pt-sign-num">{i + 1}.</span> {text}
              </p>
              <fieldset className="pt-sign-radios">
                <legend className="pt-sr-only">{CL.criterionLegend(i + 1, text)}</legend>
                {OPTIONS.map((o) => (
                  <label key={o.status} className="pt-sign-radio">
                    <input
                      type="radio"
                      name={`criterion-${i}`}
                      value={o.status}
                      checked={d.status === o.status}
                      onChange={() => setDraft(i, { status: o.status })}
                    />
                    <span>{o.label}</span>
                    {o.status !== 'delivered' && d.status === o.status ? (
                      <AlertTriangle size={16} aria-hidden="true" />
                    ) : null}
                  </label>
                ))}
              </fieldset>
              {d.status === 'reserved' || d.status === 'refused' ? (
                <div className={d.status === 'refused' ? 'pt-sign-note pt-sign-note-refused' : 'pt-sign-note pt-sign-note-reserved'}>
                  <label className="pt-label" htmlFor={noteId}>
                    {d.status === 'refused' ? CL.refusedLabel : CL.reserveLabel}
                  </label>
                  <textarea
                    id={noteId}
                    className="pt-input pt-sign-textarea"
                    rows={3}
                    required
                    maxLength={ACCEPTANCE_NOTE_MAX}
                    value={d.note}
                    aria-invalid={tooShort ? 'true' : undefined}
                    aria-describedby={`${noteId}-help`}
                    onChange={(e) => setDraft(i, { note: e.target.value })}
                  />
                  <p id={`${noteId}-help`} className="pt-sign-counter">
                    {CL.counter(d.note.length)}
                  </p>
                  {d.status === 'refused' ? <p className="pt-helper">{CL.refusedHelper}</p> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="pt-card pt-sign-summary" aria-live="polite">
        <p>{CL.summary(validated, criteria.length, counts.reserved, counts.refused)}</p>
      </div>

      <div className="pt-sign-bar">
        {counts.reserved > 0 && !hasRefusal ? (
          <p className="pt-warning">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{CL.reservesNote}</span>
          </p>
        ) : null}
        {incomplete > 0 ? (
          <p id="sign-checklist-helper" className="pt-helper">
            {CL.remaining(incomplete)}
          </p>
        ) : null}
        <button
          type="button"
          className="pt-btn-primary"
          disabled={incomplete > 0 || pending}
          aria-describedby={incomplete > 0 ? 'sign-checklist-helper' : undefined}
          onClick={onSubmit}
        >
          {hasRefusal ? CL.sendFeedback : CL.continue}
        </button>
        <p className="pt-error" aria-live="polite">
          {error}
        </p>
      </div>
    </div>
  );
}
