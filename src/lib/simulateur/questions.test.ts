import { describe, expect, it } from 'vitest';
import {
  ALL_SLUGS,
  QUESTIONS,
  isQuestionApplicable,
  nextQuestionId,
  type Answer,
} from './questions';

const LOCKED_QUESTION_IDS = [
  'secteur',
  'presence-en-ligne',
  'site-fiabilite',
  'frictions',
  'priorite',
] as const;

const FULL_PATH_ANSWERS: Answer[] = [
  { questionId: 'secteur', value: 'commerce-local' },
  { questionId: 'presence-en-ligne', value: 'datee' },
  { questionId: 'site-fiabilite', value: 'quelques-alertes' },
  { questionId: 'frictions', value: ['appels-manques'] },
  { questionId: 'priorite', value: 'etre-trouve' },
];

const SKIPPED_PATH_ANSWERS: Answer[] = [
  { questionId: 'secteur', value: 'commerce-local' },
  { questionId: 'presence-en-ligne', value: 'inexistante' },
  { questionId: 'frictions', value: ['appels-manques'] },
  { questionId: 'priorite', value: 'etre-trouve' },
];

describe('QUESTIONS', () => {
  it('has the exact locked ids in order (SIMU-01)', () => {
    expect(QUESTIONS.map((q) => q.id)).toEqual([...LOCKED_QUESTION_IDS]);
  });

  // D-02
  it('D-02: has between 3 and 5 questions', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(3);
    expect(QUESTIONS.length).toBeLessThanOrEqual(5);
  });

  it('every question id is unique', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every option value within a question is unique', () => {
    for (const question of QUESTIONS) {
      const values = question.options.map((o) => o.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  // D-05/D-06
  it('D-06: every key in any option weights is a member of ALL_SLUGS, and every weight is a positive finite number', () => {
    for (const question of QUESTIONS) {
      for (const option of question.options) {
        for (const [slug, weight] of Object.entries(option.weights)) {
          expect(ALL_SLUGS).toContain(slug);
          expect(typeof weight).toBe('number');
          expect(Number.isFinite(weight)).toBe(true);
          expect((weight as number) > 0).toBe(true);
        }
      }
    }
  });

  it('every severity present is a finite number in [0, 100]', () => {
    for (const question of QUESTIONS) {
      for (const option of question.options) {
        if (option.severity !== undefined) {
          expect(Number.isFinite(option.severity)).toBe(true);
          expect(option.severity).toBeGreaterThanOrEqual(0);
          expect(option.severity).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('every secteur option has severity === undefined', () => {
    const secteur = QUESTIONS.find((q) => q.id === 'secteur');
    expect(secteur).toBeDefined();
    for (const option of secteur!.options) {
      expect(option.severity).toBeUndefined();
    }
  });

  it('exactly one question declares a showIf property', () => {
    const withShowIf = QUESTIONS.filter((q) => q.showIf !== undefined);
    expect(withShowIf).toHaveLength(1);
    expect(withShowIf[0].id).toBe('site-fiabilite');
  });
});

describe('nextQuestionId', () => {
  // SIMU-01
  it('SIMU-01: returns secteur for the empty answer set', () => {
    expect(nextQuestionId([])).toBe('secteur');
  });

  // SIMU-01 branch
  it('SIMU-01: skips site-fiabilite and yields frictions when presence-en-ligne is inexistante', () => {
    const answers: Answer[] = [
      { questionId: 'secteur', value: 'commerce-local' },
      { questionId: 'presence-en-ligne', value: 'inexistante' },
    ];
    expect(nextQuestionId(answers)).toBe('frictions');
  });

  // SIMU-01 branch
  it('SIMU-01: yields site-fiabilite when presence-en-ligne is datee', () => {
    const answers: Answer[] = [
      { questionId: 'secteur', value: 'commerce-local' },
      { questionId: 'presence-en-ligne', value: 'datee' },
    ];
    expect(nextQuestionId(answers)).toBe('site-fiabilite');
  });

  it('yields site-fiabilite when presence-en-ligne is correcte or solide', () => {
    for (const value of ['correcte', 'solide']) {
      const answers: Answer[] = [
        { questionId: 'secteur', value: 'commerce-local' },
        { questionId: 'presence-en-ligne', value },
      ];
      expect(nextQuestionId(answers)).toBe('site-fiabilite');
    }
  });

  it('returns null once every applicable question is answered (skipped path)', () => {
    expect(nextQuestionId(SKIPPED_PATH_ANSWERS)).toBeNull();
  });

  it('returns null once every applicable question is answered (full path)', () => {
    expect(nextQuestionId(FULL_PATH_ANSWERS)).toBeNull();
  });
});

describe('isQuestionApplicable', () => {
  const siteFiabilite = QUESTIONS.find((q) => q.id === 'site-fiabilite')!;

  it('does not throw when presence-en-ligne is absent', () => {
    expect(() => isQuestionApplicable(siteFiabilite, [])).not.toThrow();
    expect(isQuestionApplicable(siteFiabilite, [])).toBe(true);
  });

  it('does not throw when presence-en-ligne holds an array value', () => {
    const answers: Answer[] = [{ questionId: 'presence-en-ligne', value: ['inexistante'] }];
    expect(() => isQuestionApplicable(siteFiabilite, answers)).not.toThrow();
    expect(isQuestionApplicable(siteFiabilite, answers)).toBe(true);
  });
});
