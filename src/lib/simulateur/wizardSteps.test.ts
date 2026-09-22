import { describe, expect, it } from 'vitest';
import type { Answer } from './questions';
import { applicableQuestionIds, buildStepSequence, contactStepIndex, progressRatio } from './wizardSteps';

const EMPTY_ANSWERS: Answer[] = [];

const FULL_PATH_ANSWERS: Answer[] = [
  { questionId: 'secteur', value: 'commerce-local' },
  { questionId: 'presence-en-ligne', value: 'datee' },
  { questionId: 'site-fiabilite', value: 'quelques-alertes' },
  { questionId: 'frictions', value: ['appels-manques'] },
  { questionId: 'priorite', value: 'etre-trouve' },
  { questionId: 'budget', value: 'budget-500-1500' },
];

const SKIPPED_PATH_ANSWERS: Answer[] = [
  { questionId: 'secteur', value: 'commerce-local' },
  { questionId: 'presence-en-ligne', value: 'inexistante' },
  { questionId: 'frictions', value: ['appels-manques'] },
  { questionId: 'priorite', value: 'etre-trouve' },
  { questionId: 'budget', value: 'budget-500-1500' },
];

const PARTIAL_ANSWERS: Answer[] = [{ questionId: 'secteur', value: 'commerce-local' }];

describe('buildStepSequence', () => {
  // SIMU-04
  it.each([
    ['empty answers', EMPTY_ANSWERS],
    ['full 6-question path', FULL_PATH_ANSWERS],
    ['4-question skipped path', SKIPPED_PATH_ANSWERS],
  ])('SIMU-04: %s contains exactly one contact step and one result step', (_label, answers) => {
    const sequence = buildStepSequence(answers);
    expect(sequence.filter((s) => s.kind === 'contact')).toHaveLength(1);
    expect(sequence.filter((s) => s.kind === 'result')).toHaveLength(1);
  });

  it('SIMU-04: the result step is always the final element, exactly one position after contact', () => {
    for (const answers of [EMPTY_ANSWERS, FULL_PATH_ANSWERS, SKIPPED_PATH_ANSWERS, PARTIAL_ANSWERS]) {
      const sequence = buildStepSequence(answers);
      const last = sequence[sequence.length - 1];
      expect(last.kind).toBe('result');

      const contactIdx = sequence.findIndex((s) => s.kind === 'contact');
      const resultIdx = sequence.findIndex((s) => s.kind === 'result');
      expect(resultIdx).toBe(contactIdx + 1);
    }
  });

  it('places one question step per applicable question id, in order, before contact', () => {
    const sequence = buildStepSequence(FULL_PATH_ANSWERS);
    const questionIds = applicableQuestionIds(FULL_PATH_ANSWERS);
    const questionSteps = sequence.filter((s) => s.kind === 'question');
    expect(questionSteps.map((s) => (s as { questionId: string }).questionId)).toEqual(questionIds);
  });
});

describe('contactStepIndex', () => {
  // SIMU-04
  it('SIMU-04: always equals applicableQuestionIds(answers).length, never 0, never before a question step', () => {
    for (const answers of [EMPTY_ANSWERS, FULL_PATH_ANSWERS, SKIPPED_PATH_ANSWERS, PARTIAL_ANSWERS]) {
      const idx = contactStepIndex(answers);
      expect(idx).toBe(applicableQuestionIds(answers).length);
      expect(idx).not.toBe(0);
    }
  });
});

describe('progressRatio', () => {
  // D-14
  it('D-14: is 0 for the empty answer set', () => {
    expect(progressRatio(EMPTY_ANSWERS)).toBe(0);
  });

  it('D-14: is 1 when every applicable question is answered', () => {
    expect(progressRatio(FULL_PATH_ANSWERS)).toBe(1);
    expect(progressRatio(SKIPPED_PATH_ANSWERS)).toBe(1);
  });

  it('D-14: every intermediate value is strictly inside (0, 1)', () => {
    const ratio = progressRatio(PARTIAL_ANSWERS);
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(1);
  });
});
