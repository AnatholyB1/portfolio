// src/lib/simulateur/questions.ts
//
// This module is the join spine for the diagnostic simulator: question
// `id` and option `value` are the keys that src/lib/translations.ts copy
// and src/lib/simulateur/scoring.ts weights both resolve against. Renaming
// any id here is a breaking change across all three files.
//
// `weights` feeds computeRecommendedServices only, and `severity` feeds
// computeVisualScore only — the two signals are deliberately independent
// (07-RESEARCH.md Pitfall 1). Do not conflate them.
//
// `severity` is defined as "how strongly this answer signals an UNMET
// need": 0 = no unmet need, 100 = critical unmet need. The result gauge
// inverts this (D-11: a lower displayed score means more opportunity).
//
// `secteur` options deliberately omit `severity` — D-01/D-06 make the
// sector question a weight-nudge only, never a severity or exclusion
// signal.
//
// This file must import nothing (no React, no Next, no zod, no DOM) so
// vitest's node environment and the client Wizard can both load it.

/** The 9 canonical service slugs, locked in Phase 6. Do NOT invent new ones. */
export type ServiceSlug =
  | 'site-vitrine'
  | 'rebranding-site-premium'
  | 'branding'
  | 'projet-sur-mesure'
  | 'agent-vocal-ia'
  | 'maintenance'
  | 'community-management'
  | 'meta-ads'
  | 'google-ads';

export const ALL_SLUGS: ServiceSlug[] = [
  'site-vitrine',
  'rebranding-site-premium',
  'branding',
  'projet-sur-mesure',
  'agent-vocal-ia',
  'maintenance',
  'community-management',
  'meta-ads',
  'google-ads',
];

export interface QuestionOption {
  value: string;
  weights: Partial<Record<ServiceSlug, number>>;
  severity?: number;
}

export interface Question {
  id: string;
  type: 'single' | 'multi';
  options: QuestionOption[];
  showIf?: (answers: Answer[]) => boolean;
}

export interface Answer {
  questionId: string;
  value: string | string[];
}

export const QUESTIONS: Question[] = [
  {
    id: 'secteur',
    type: 'single',
    options: [
      {
        value: 'commerce-local',
        weights: { 'site-vitrine': 1, 'meta-ads': 1, 'community-management': 1 },
      },
      {
        value: 'restauration-hotellerie',
        weights: { 'agent-vocal-ia': 2, 'site-vitrine': 1, 'community-management': 1 },
      },
      {
        value: 'artisan-btp',
        weights: { 'site-vitrine': 1, 'google-ads': 2, 'agent-vocal-ia': 1 },
      },
      {
        value: 'services-pro',
        weights: { 'rebranding-site-premium': 1, 'google-ads': 1, branding: 1 },
      },
      {
        value: 'sante-bien-etre',
        weights: { 'agent-vocal-ia': 2, 'site-vitrine': 1, maintenance: 1 },
      },
      {
        value: 'autre',
        weights: { 'site-vitrine': 1, 'projet-sur-mesure': 1 },
      },
    ],
  },
  {
    // D-03: Likert-style severity/satisfaction scale, not a yes/no gate.
    id: 'presence-en-ligne',
    type: 'single',
    options: [
      {
        value: 'inexistante',
        severity: 95,
        weights: { 'site-vitrine': 4, branding: 2, 'google-ads': 1 },
      },
      {
        value: 'datee',
        severity: 75,
        weights: { 'rebranding-site-premium': 4, branding: 2, 'site-vitrine': 1 },
      },
      {
        value: 'correcte',
        severity: 45,
        weights: { 'meta-ads': 2, 'community-management': 2, maintenance: 1 },
      },
      {
        value: 'solide',
        severity: 15,
        weights: { 'meta-ads': 2, 'google-ads': 2, 'projet-sur-mesure': 1 },
      },
    ],
  },
  {
    // SIMU-01 branch: a visitor with no online presence has no site to
    // maintain, so this question is skipped rather than shown-and-ignored.
    // D-08 (maintenance recommended standalone) is reachable through this
    // question's high maintenance weights combined with a `solide` answer
    // on `presence-en-ligne`.
    id: 'site-fiabilite',
    type: 'single',
    showIf: (answers) => {
      const presence = answers.find((a) => a.questionId === 'presence-en-ligne');
      return presence?.value !== 'inexistante';
    },
    options: [
      {
        value: 'jamais-touche',
        severity: 90,
        weights: { maintenance: 4, 'rebranding-site-premium': 2 },
      },
      {
        value: 'bugs-frequents',
        severity: 80,
        weights: { maintenance: 4, 'projet-sur-mesure': 1 },
      },
      {
        value: 'quelques-alertes',
        severity: 50,
        weights: { maintenance: 3 },
      },
      {
        value: 'suivi-regulier',
        severity: 15,
        weights: { 'projet-sur-mesure': 1 },
      },
    ],
  },
  {
    // D-04: multi-select question, stored answer value is a string array.
    id: 'frictions',
    type: 'multi',
    options: [
      {
        value: 'appels-manques',
        severity: 80,
        weights: { 'agent-vocal-ia': 4 },
      },
      {
        value: 'pas-assez-de-demandes',
        severity: 75,
        weights: { 'google-ads': 3, 'meta-ads': 3, 'site-vitrine': 1 },
      },
      {
        value: 'image-depassee',
        severity: 70,
        weights: { branding: 3, 'rebranding-site-premium': 3 },
      },
      {
        value: 'site-lent-ou-casse',
        severity: 85,
        weights: { maintenance: 3, 'rebranding-site-premium': 2 },
      },
      {
        value: 'reseaux-inactifs',
        severity: 45,
        weights: { 'community-management': 4 },
      },
      {
        value: 'taches-repetitives',
        severity: 70,
        weights: { 'projet-sur-mesure': 3, 'agent-vocal-ia': 2 },
      },
      {
        value: 'rien-de-bloquant',
        severity: 10,
        weights: { maintenance: 2, 'community-management': 1 },
      },
    ],
  },
  {
    id: 'priorite',
    type: 'single',
    options: [
      {
        value: 'etre-trouve',
        severity: 65,
        weights: { 'google-ads': 3, 'site-vitrine': 2, 'meta-ads': 1 },
      },
      {
        value: 'convertir-plus',
        severity: 60,
        weights: { 'rebranding-site-premium': 3, 'site-vitrine': 2, 'meta-ads': 1 },
      },
      {
        value: 'gagner-du-temps',
        severity: 55,
        weights: { 'agent-vocal-ia': 3, 'projet-sur-mesure': 2, maintenance: 1 },
      },
      {
        value: 'changer-d-image',
        severity: 50,
        weights: { branding: 4, 'rebranding-site-premium': 2 },
      },
    ],
  },
];

export function isQuestionApplicable(question: Question, answers: Answer[]): boolean {
  return question.showIf ? question.showIf(answers) : true;
}

export function getQuestionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

export function nextQuestionId(answers: Answer[]): string | null {
  const answeredIds = new Set(answers.map((a) => a.questionId));
  for (const question of QUESTIONS) {
    if (answeredIds.has(question.id)) continue;
    if (isQuestionApplicable(question, answers)) {
      return question.id;
    }
  }
  return null;
}
