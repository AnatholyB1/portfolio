// src/lib/simulateur/scoring.ts
//
// Pure scoring functions for the /simulateur wizard: must stay free of
// React, DOM and Next.js imports so both the client Wizard and vitest
// (environment: 'node') can import this module directly — the same
// constraint documented at the top of src/lib/serviceJsonLd.ts.
//
// computeRecommendedServices reads ONLY option.weights. computeVisualScore
// reads ONLY option.severity. They share no intermediate value. Any future
// change that lets severity move the recommendation (or weights move the
// gauge) is the exact defect 07-RESEARCH.md Pitfall 1 warns against — do
// not introduce a shared "score" variable between them.

import { ALL_SLUGS, getQuestionById } from './questions';
import type { Answer, QuestionOption, ServiceSlug } from './questions';
import { PRIORITY_ORDER } from './priorityOrder';

/**
 * Resolves every selected option across an answers array and invokes
 * `visit` once per resolved option. Normalises single-value answers to a
 * one-element array so multi-select answers (string[]) and single-select
 * answers (string) share the same resolution path — this is what makes
 * D-04 (multi-select contributes every selected option) work. Unknown
 * question ids and unknown option values are skipped silently rather than
 * throwing, since a stale/partial answers array is a normal wizard state.
 */
function forEachSelectedOption(
  answers: Answer[],
  visit: (option: QuestionOption) => void
): void {
  for (const answer of answers) {
    const question = getQuestionById(answer.questionId);
    if (!question) continue;

    const values = Array.isArray(answer.value) ? answer.value : [answer.value];
    for (const value of values) {
      const option = question.options.find((o) => o.value === value);
      if (!option) continue;
      visit(option);
    }
  }
}

/**
 * SIMU-02 / D-05: sums each selected option's `weights` per service, then
 * ranks all 9 services descending by that sum, breaking ties via
 * PRIORITY_ORDER (D-07) so the result is fully deterministic. Reads only
 * `option.weights` — never `option.severity` (Pitfall 1).
 */
export function computeRecommendedServices(answers: Answer[]): ServiceSlug[] {
  const scores = {} as Record<ServiceSlug, number>;
  for (const slug of ALL_SLUGS) {
    scores[slug] = 0;
  }

  forEachSelectedOption(answers, (option) => {
    for (const [slug, weight] of Object.entries(option.weights) as [ServiceSlug, number][]) {
      scores[slug] += weight;
    }
  });

  const ranked = [...ALL_SLUGS].sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a];
    return PRIORITY_ORDER.indexOf(a) - PRIORITY_ORDER.indexOf(b);
  });

  const positive = ranked.filter((slug) => scores[slug] > 0);

  // SIMU-02: never all nine — clamp to at most 4 recommendations.
  if (positive.length >= 2) {
    return positive.slice(0, 4);
  }

  // Pad to satisfy prospectSchema's servicesRecommandes.min(2): when fewer
  // than 2 services score above zero, fall back to the first 2 entries of
  // the fully-ranked list — with every score tied at 0, that ranked list
  // is exactly PRIORITY_ORDER, so this returns its first two (D-07).
  return ranked.slice(0, 2);
}

/**
 * SIMU-03 / D-11: averages every selected option's `severity` (skipping
 * options that don't carry one, e.g. every `secteur` option per D-01/D-06)
 * and INVERTS it — severity measures unmet need, the displayed value
 * measures maturity/opportunity, so a struggling business sees a LOW
 * number, framed by the result copy as opportunity rather than as a
 * compliment. Reads only `option.severity` — never `option.weights`
 * (Pitfall 1).
 */
export function computeVisualScore(answers: Answer[]): number {
  let total = 0;
  let count = 0;

  forEachSelectedOption(answers, (option) => {
    if (typeof option.severity === 'number') {
      total += option.severity;
      count += 1;
    }
  });

  if (count === 0) return 50;

  return Math.max(0, Math.min(100, 100 - Math.round(total / count)));
}

/**
 * Selects which result-copy framing to show. The three band names are a
 * content contract shared with translations.ts's
 * t.simulateur.result.framing.low/mid/high keys — renaming a band here
 * requires a matching rename there.
 */
export function scoreBand(score: number): 'low' | 'mid' | 'high' {
  if (score <= 40) return 'low';
  if (score <= 65) return 'mid';
  return 'high';
}
