'use client';
// The only place in Phase 7 where every pure module meets the DOM: step
// ordering, scoring, payload assembly, copy and CSS classes already exist
// and are tested elsewhere — this component is composition, not new logic.

import { useEffect, useState, type CSSProperties } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  buildStepSequence,
  progressRatio,
  applicableQuestionIds,
} from '@/lib/simulateur/wizardSteps';
import { getQuestionById, type Answer } from '@/lib/simulateur/questions';

// Same off-screen technique as .sim-honeypot (globals.css), but WITHOUT
// aria-hidden — this text must be announced by assistive tech, so it
// cannot reuse the honeypot class itself (which is deliberately hidden
// from everyone, including screen readers).
const srOnlyStyle: CSSProperties = {
  position: 'absolute',
  left: -9999,
  width: 1,
  height: 1,
  overflow: 'hidden',
};

export default function Wizard() {
  const { t } = useLanguage();

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  // Contact/consent/status/formRenderedAt state is declared here (rather
  // than lazily added in Task 2) because formRenderedAt must be captured
  // once at wizard mount regardless of which step is showing.
  const [contact, setContact] = useState({ nom: '', email: '', telephone: '' });
  // Unticked by default; this is SIMU-05 and must never be initialised to
  // `true` or bound to `defaultChecked`.
  const [consent, setConsent] = useState(false);
  // Mirrors ContactSection.tsx's status machine, minus its 'sent' state
  // because success here advances to the result step instead of showing a
  // confirmation in place.
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  // Captured once at mount via the lazy initialiser, never at submit time,
  // never rendered into JSX — feeds the server's SPAM_MIN_ELAPSED_MS (2000ms)
  // timing check (07-RESEARCH.md Pitfall 3: avoids the hydration mismatch a
  // plain `Date.now()` call in the render body would cause).
  const [formRenderedAt] = useState(() => Date.now());

  const steps = buildStepSequence(answers);

  // A visitor can go back and change `presence-en-ligne` from `datee` to
  // `inexistante`, which removes the `site-fiabilite` step and shortens
  // `steps` out from under a `stepIndex` that pointed past its end. Clamp
  // for render, and let the effect reconcile state so it never disagrees
  // with what's on screen.
  const clampedStepIndex = Math.min(stepIndex, steps.length - 1);
  useEffect(() => {
    if (clampedStepIndex !== stepIndex) {
      setStepIndex(clampedStepIndex);
    }
  }, [clampedStepIndex, stepIndex]);

  const step = steps[clampedStepIndex];

  // Curried setter matching calculateur-roi's shape. Because `steps` is
  // recomputed from `answers` on every render, changing the
  // `presence-en-ligne` answer to/from `inexistante` automatically inserts
  // or removes the `site-fiabilite` step — no separate skip handling here.
  const setAnswer = (questionId: string) => (value: string | string[]) =>
    setAnswers((prev) => [...prev.filter((a) => a.questionId !== questionId), { questionId, value }]);

  if (!step) return null;

  // Progress bar (D-14), rendered above the current screen on question
  // steps AND on the contact step.
  const progressBar = (fillRatio: number) => (
    <div className="sim-progress-track">
      <div className="sim-progress-fill" style={{ width: `${fillRatio * 100}%` }} />
    </div>
  );

  if (step.kind === 'question') {
    const question = getQuestionById(step.questionId);
    // Defensive, mirrors the `if (!svc) return null` guard in
    // src/app/services/[slug]/page.tsx.
    if (!question) return null;

    const stored = answers.find((a) => a.questionId === question.id);
    const applicableIds = applicableQuestionIds(answers);
    const currentNumber = applicableIds.indexOf(question.id) + 1;
    const totalCount = applicableIds.length;

    const hasAnswer =
      question.type === 'multi'
        ? Array.isArray(stored?.value) && stored.value.length > 0
        : typeof stored?.value === 'string' && stored.value.length > 0;

    const isLastBeforeContact = steps[clampedStepIndex + 1]?.kind === 'contact';
    const headingId = `sim-q-${question.id}`;

    const toggleOption = (optionValue: string) => {
      if (question.type === 'multi') {
        const current = Array.isArray(stored?.value) ? stored.value : [];
        const next = current.includes(optionValue)
          ? current.filter((v) => v !== optionValue)
          : [...current, optionValue];
        setAnswer(question.id)(next);
      } else {
        setAnswer(question.id)(optionValue);
      }
    };

    const isSelected = (optionValue: string) =>
      question.type === 'multi'
        ? Array.isArray(stored?.value) && stored.value.includes(optionValue)
        : stored?.value === optionValue;

    return (
      <div className="sim-wizard">
        {progressBar(progressRatio(answers))}
        {/* sr-only text equivalent of the progress bar, built from t.simulateur.progressLabel */}
        <span style={srOnlyStyle}>
          {t.simulateur.progressLabel
            .replace('{current}', String(currentNumber))
            .replace('{total}', String(totalCount))}
        </span>
        <h2 className="sim-q-text" id={headingId}>
          {t.simulateur.questions[question.id].text}
        </h2>
        <p className="svc-body">{t.simulateur.questions[question.id].hint}</p>
        <div
          className="sim-options"
          role={question.type === 'multi' ? 'group' : 'radiogroup'}
          aria-labelledby={headingId}
        >
          {question.options.map((option) => {
            const selected = isSelected(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role={question.type === 'multi' ? 'checkbox' : 'radio'}
                aria-checked={selected}
                className={`sim-option${selected ? ' selected' : ''}`}
                onClick={() => toggleOption(option.value)}
              >
                {t.simulateur.questions[question.id].options[option.value]}
              </button>
            );
          })}
        </div>
        <div className="sim-nav">
          {clampedStepIndex > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              // In-component state only — deliberately does not touch
              // browser history (07-RESEARCH.md Pitfall 5: the browser
              // Back button is a separate, accepted gap).
              onClick={() => setStepIndex(clampedStepIndex - 1)}
            >
              {t.simulateur.back}
            </button>
          )}
          {isLastBeforeContact ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!hasAnswer}
              onClick={() => setStepIndex(clampedStepIndex + 1)}
            >
              {t.simulateur.nextFinal}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!hasAnswer}
              onClick={() => setStepIndex(clampedStepIndex + 1)}
            >
              {t.simulateur.next}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (step.kind === 'contact') {
    // Filled in by Task 2.
    return (
      <div className="sim-wizard">
        {progressBar(1)}
        {/* TODO(Task 2): contact-capture form, RGPD consent, honeypot, submission, error state */}
      </div>
    );
  }

  // step.kind === 'result' — filled in by Task 3.
  return (
    <div className="sim-wizard">
      {/* TODO(Task 3): result screen — gauge, recommended services, dual-channel CTA */}
    </div>
  );
}
