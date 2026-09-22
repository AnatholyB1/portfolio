import { describe, expect, it, vi } from 'vitest';
import { computeRecommendedServices, computeVisualScore, scoreBand } from './scoring';
import { ALL_SLUGS, QUESTIONS, type Answer } from './questions';
import { PRIORITY_ORDER } from './priorityOrder';

// Fixtures shared across describe blocks.
const EMPTY_ANSWERS: Answer[] = [];

/** One Answer per option, across every question — SIMU-02's "every single-answer array". */
function singleAnswerArrays(): Answer[][] {
  const arrays: Answer[][] = [];
  for (const question of QUESTIONS) {
    for (const option of question.options) {
      arrays.push([{ questionId: question.id, value: option.value }]);
    }
  }
  return arrays;
}

/**
 * Derived programmatically from QUESTIONS (not hand-typed) so it stays
 * correct if an option is ever added — SIMU-02's "every option of every
 * question selected".
 */
const ALL_OPTIONS_ANSWERS: Answer[] = QUESTIONS.map((question) => ({
  questionId: question.id,
  value: question.options.map((option) => option.value),
}));

describe('computeRecommendedServices', () => {
  // SIMU-02: 2-4 clamp holds for every shape of input, including the
  // empty answers array (a fresh wizard) and the maximal fixture.
  it('SIMU-02: returns a length between 2 and 4 for the empty answers array', () => {
    const result = computeRecommendedServices(EMPTY_ANSWERS);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it('SIMU-02: returns a length between 2 and 4 for every single-answer array', () => {
    for (const answers of singleAnswerArrays()) {
      const result = computeRecommendedServices(answers);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(4);
    }
  });

  it('SIMU-02: returns a length between 2 and 4 for the all-options-selected array', () => {
    const result = computeRecommendedServices(ALL_OPTIONS_ANSWERS);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it('SIMU-02: never returns length 9 and never contains a duplicate slug', () => {
    const result = computeRecommendedServices(ALL_OPTIONS_ANSWERS);
    expect(result.length).not.toBe(9);
    expect(new Set(result).size).toBe(result.length);
  });

  it('every returned slug is a member of ALL_SLUGS', () => {
    const result = computeRecommendedServices(ALL_OPTIONS_ANSWERS);
    for (const slug of result) {
      expect(ALL_SLUGS).toContain(slug);
    }
  });

  // D-07: deterministic tiebreak via PRIORITY_ORDER, and calling twice on
  // the same input must be deeply equal.
  it('D-07: calling twice on the same input returns a deeply equal array (determinism)', () => {
    const answers: Answer[] = [{ questionId: 'secteur', value: 'commerce-local' }];
    expect(computeRecommendedServices(answers)).toEqual(computeRecommendedServices(answers));
  });

  it('D-07: when no option scores above zero, the result is exactly the first two entries of PRIORITY_ORDER', () => {
    const result = computeRecommendedServices(EMPTY_ANSWERS);
    expect(result).toEqual(PRIORITY_ORDER.slice(0, 2));
  });

  // D-08: maintenance can lead standalone — no build service is forced
  // into the top slot just because maintenance won.
  it('D-08: maintenance leads without a build service being forced in', () => {
    const answers: Answer[] = [
      { questionId: 'presence-en-ligne', value: 'solide' },
      { questionId: 'site-fiabilite', value: 'jamais-touche' },
    ];
    const result = computeRecommendedServices(answers);
    expect(result).toContain('maintenance');
    expect(['site-vitrine', 'rebranding-site-premium', 'projet-sur-mesure']).not.toContain(
      result[0]
    );
  });

  // D-06: the sector answer is a weight nudge only — it must never evict a
  // service that severity signals already put in the top 2.
  it('D-06: changing only the secteur answer never removes a top-2 service, only reorders/extends', () => {
    const base: Answer[] = [
      { questionId: 'presence-en-ligne', value: 'inexistante' },
      { questionId: 'frictions', value: ['appels-manques'] },
    ];
    const withSector: Answer[] = [...base, { questionId: 'secteur', value: 'artisan-btp' }];

    const top2Base = computeRecommendedServices(base).slice(0, 2);
    const resultWithSector = computeRecommendedServices(withSector);

    for (const slug of top2Base) {
      expect(resultWithSector).toContain(slug);
    }
  });

  // budget (added 2026-09-22, D-02 extended) must feed weights like every
  // other question — proven by comparing two runs that differ only in
  // which budget tier was selected.
  it('budget: a higher-tier answer shifts weight toward higher-tier services', () => {
    const base: Answer[] = [{ questionId: 'secteur', value: 'autre' }];
    const lowBudget = computeRecommendedServices([
      ...base,
      { questionId: 'budget', value: 'budget-0-500' },
    ]);
    const highBudget = computeRecommendedServices([
      ...base,
      { questionId: 'budget', value: 'budget-3000-plus' },
    ]);

    expect(highBudget).toContain('projet-sur-mesure');
    expect(lowBudget).not.toEqual(highBudget);
  });

  // D-04: a multi-select `frictions` answer must contribute every
  // selected option's weights, not just the first entry of the array.
  it('D-04: a multi-select frictions answer contributes every selected option, not just the first', () => {
    const singleFriction: Answer[] = [{ questionId: 'frictions', value: ['appels-manques'] }];
    const multiFriction: Answer[] = [
      { questionId: 'frictions', value: ['appels-manques', 'reseaux-inactifs'] },
    ];

    const resultSingle = computeRecommendedServices(singleFriction);
    const resultMulti = computeRecommendedServices(multiFriction);

    expect(resultMulti).toContain('community-management');
    expect(resultMulti).not.toEqual(resultSingle);
  });

  // Pitfall 1 (07-RESEARCH.md): computeRecommendedServices must read only
  // option.weights. Proven here by mocking a question whose two options
  // share an identical weight vector but wildly different severities —
  // the recommendation must be unaffected by that severity swing.
  it('Pitfall 1: severity changes never move the recommendation when weights are held constant', async () => {
    vi.resetModules();
    vi.doMock('./questions', async () => {
      const actual = await vi.importActual<typeof import('./questions')>('./questions');
      const mockQuestion = {
        id: 'mock-severity-only',
        type: 'single' as const,
        options: [
          { value: 'low-severity', weights: { 'site-vitrine': 5 }, severity: 5 },
          { value: 'high-severity', weights: { 'site-vitrine': 5 }, severity: 95 },
        ],
      };
      return {
        ...actual,
        QUESTIONS: [mockQuestion],
        getQuestionById: (id: string) => (id === mockQuestion.id ? mockQuestion : undefined),
      };
    });

    const { computeRecommendedServices: mockedCompute } = await import('./scoring');
    const resultLow = mockedCompute([{ questionId: 'mock-severity-only', value: 'low-severity' }]);
    const resultHigh = mockedCompute([
      { questionId: 'mock-severity-only', value: 'high-severity' },
    ]);

    expect(resultLow).toEqual(resultHigh);

    vi.doUnmock('./questions');
    vi.resetModules();
  });
});

describe('computeVisualScore', () => {
  function expectValidScore(answers: Answer[]) {
    const score = computeVisualScore(answers);
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  }

  it('SIMU-03: returns an integer in [0, 100] for the empty array, every single-answer array, and the all-options-selected array', () => {
    expectValidScore(EMPTY_ANSWERS);
    for (const answers of singleAnswerArrays()) {
      expectValidScore(answers);
    }
    expectValidScore(ALL_OPTIONS_ANSWERS);
  });

  // D-11 polarity: a struggling presence must score strictly lower than a
  // solid one, since a lower number signals more opportunity to improve.
  it('D-11: presence-en-ligne=inexistante scores strictly lower than presence-en-ligne=solide', () => {
    const inexistante = computeVisualScore([{ questionId: 'presence-en-ligne', value: 'inexistante' }]);
    const solide = computeVisualScore([{ questionId: 'presence-en-ligne', value: 'solide' }]);
    expect(inexistante).toBeLessThan(solide);
  });

  it('secteur answers do not move the score', () => {
    const withSector = computeVisualScore([
      { questionId: 'secteur', value: 'commerce-local' },
      { questionId: 'presence-en-ligne', value: 'solide' },
    ]);
    const withoutSector = computeVisualScore([{ questionId: 'presence-en-ligne', value: 'solide' }]);
    expect(withSector).toBe(withoutSector);
  });

  // budget (added 2026-09-22, D-02 extended) has no severity, like secteur
  // — same reasoning, same guard.
  it('budget answers do not move the score', () => {
    const withBudget = computeVisualScore([
      { questionId: 'budget', value: 'budget-3000-plus' },
      { questionId: 'presence-en-ligne', value: 'solide' },
    ]);
    const withoutBudget = computeVisualScore([{ questionId: 'presence-en-ligne', value: 'solide' }]);
    expect(withBudget).toBe(withoutBudget);
  });

  it('returns 50 when no severity-bearing option is selected', () => {
    const score = computeVisualScore([{ questionId: 'secteur', value: 'commerce-local' }]);
    expect(score).toBe(50);
  });

  // Pitfall 1 (07-RESEARCH.md): computeVisualScore must read only
  // option.severity. Proven with a fixture that changes only a
  // weights-relevant (secteur, severity-free) selection while holding
  // severity constant — the score must not move.
  it('Pitfall 1: weight changes never move the visual score when severity is held constant', () => {
    const scoreA = computeVisualScore([
      { questionId: 'presence-en-ligne', value: 'solide' },
      { questionId: 'secteur', value: 'commerce-local' },
    ]);
    const scoreB = computeVisualScore([
      { questionId: 'presence-en-ligne', value: 'solide' },
      { questionId: 'secteur', value: 'artisan-btp' },
    ]);
    expect(scoreA).toBe(scoreB);
  });
});

describe('scoreBand', () => {
  it("returns 'low' for 0 and 40", () => {
    expect(scoreBand(0)).toBe('low');
    expect(scoreBand(40)).toBe('low');
  });

  it("returns 'mid' for 41 and 65", () => {
    expect(scoreBand(41)).toBe('mid');
    expect(scoreBand(65)).toBe('mid');
  });

  it("returns 'high' for 66 and 100", () => {
    expect(scoreBand(66)).toBe('high');
    expect(scoreBand(100)).toBe('high');
  });
});
