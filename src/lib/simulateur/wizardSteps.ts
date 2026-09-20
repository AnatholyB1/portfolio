// src/lib/simulateur/wizardSteps.ts
//
// This module owns SIMU-04 — the contact-capture step's position in the
// sequence is computed here, never hardcoded in JSX, so the "never before
// the first question, always before the result" guarantee is
// unit-testable without mounting React.

import { QUESTIONS, isQuestionApplicable, type Answer } from './questions';

export type WizardStep =
  | { kind: 'question'; questionId: string }
  | { kind: 'contact' }
  | { kind: 'result' };

export function applicableQuestionIds(answers: Answer[]): string[] {
  return QUESTIONS.filter((question) => isQuestionApplicable(question, answers)).map(
    (question) => question.id
  );
}

export function buildStepSequence(answers: Answer[]): WizardStep[] {
  const questionSteps: WizardStep[] = applicableQuestionIds(answers).map((questionId) => ({
    kind: 'question',
    questionId,
  }));

  return [...questionSteps, { kind: 'contact' }, { kind: 'result' }];
}

export function progressRatio(answers: Answer[]): number {
  const applicableIds = applicableQuestionIds(answers);
  const denominator = applicableIds.length;
  if (denominator === 0) return 0;

  const applicableIdSet = new Set(applicableIds);
  const numerator = answers.filter((a) => applicableIdSet.has(a.questionId)).length;

  const ratio = numerator / denominator;
  return Math.min(1, Math.max(0, ratio));
}

export function contactStepIndex(answers: Answer[]): number {
  return buildStepSequence(answers).findIndex((step) => step.kind === 'contact');
}
