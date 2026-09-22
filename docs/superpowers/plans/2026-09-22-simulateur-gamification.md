# Simulateur Gamification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Lucide icons to the diagnostic simulator's choice questions, render the two Likert-style questions (`presence-en-ligne`, `site-fiabilite`) as a mood scale, add a new qualitative budget question rendered as a stepped slider, and fix two mobile overflow bugs — all without touching the scoring pipeline, the Phase 5 backend, or the site's no-pricing policy.

**Architecture:** `questions.ts` gains two new optional fields (`icon` on options, `variant` on questions) that are pure data — no React, no behavior change to `scoring.ts`/`wizardSteps.ts`/`submit.ts`. A new `icons.ts` module is the only place that couples icon *names* (strings, safe in pure data files) to real `lucide-react` components. `Wizard.tsx` branches its question-rendering block on `variant` (`'cards'` default, `'mood'`, `'range'`) but keeps the exact same generic answer/scoring machinery for all three.

**Tech Stack:** Next.js 16 / React 19, `lucide-react` (already a dependency, no new packages), Vitest, plain CSS (`globals.css`).

**Design spec:** `docs/superpowers/specs/2026-09-22-simulateur-gamification-design.md` — read it once before starting; every task below traces back to it.

**Locked constraints this plan must respect (verified against the actual test files, not assumed):**
- `translations.test.ts` line ~246: no `€`/`$`/`£`/`฿`/"prix"/"tarifs"/"euros"/"price"/"pricing"/"devis"/"gratuit"/"free"/"à partir de" anywhere in `t.simulateur`, any locale. The budget question copy below was hand-checked against this regex.
- `questions.test.ts` line ~39: `QUESTIONS.length` must be between 3 and 5 (D-02). This plan deliberately bumps it to 6 and updates the test's own assertion + comment to document that as an intentional extension.
- `styles.test.ts`: every selector in `REQUIRED_SELECTORS` must literally appear in `globals.css`, and `.sim-option`'s block must contain `min-height: 44px`. New classes added by this plan get added to that array in the same task that introduces the CSS.
- `wizardContract.test.ts`: greps `Wizard.tsx` source for structural invariants (SIMU-03/04/05/06/07) — none of this plan's changes touch `handleSubmit`, the `tel:`/`mailto:` links, or introduce a price word into `Wizard.tsx`'s own source.

---

### Task 1: Extend the data model and add the budget question

**Files:**
- Modify: `src/lib/simulateur/questions.ts`
- Modify: `src/lib/simulateur/questions.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/simulateur/questions.test.ts`, replacing the existing `LOCKED_QUESTION_IDS` array (lines 10-16) and the D-02 test (lines 38-42):

```ts
const LOCKED_QUESTION_IDS = [
  'secteur',
  'presence-en-ligne',
  'site-fiabilite',
  'frictions',
  'priorite',
  'budget',
] as const;
```

```ts
  // D-02, extended deliberately (2026-09-22): the diagnostic gained a 6th
  // question (budget) by explicit product decision — see
  // docs/superpowers/specs/2026-09-22-simulateur-gamification-design.md.
  // The original Phase 7 cap was 5; this is a conscious one-time bump, not
  // a regression.
  it('D-02 (extended): has between 3 and 6 questions', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(3);
    expect(QUESTIONS.length).toBeLessThanOrEqual(6);
  });
```

Also update `FULL_PATH_ANSWERS` and `SKIPPED_PATH_ANSWERS` (lines 18-31) to include a budget answer, since `nextQuestionId` must return `null` only once every applicable question — including the new one — is answered:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/simulateur/questions.test.ts`
Expected: FAIL — `has the exact locked ids in order` fails (QUESTIONS still has 5 ids, test now expects 6), and the two path-answers fixtures reference a `'budget'` id that `getQuestionById` can't resolve yet (though that specific failure surfaces later in `nextQuestionId`/`scoring` tests, not here — this file's own assertions about `QUESTIONS.map(q => q.id)` are what fail now).

- [ ] **Step 3: Extend the types and add the budget question**

In `src/lib/simulateur/questions.ts`, replace the `QuestionOption`/`Question` interfaces (lines 47-58):

```ts
export interface QuestionOption {
  value: string;
  weights: Partial<Record<ServiceSlug, number>>;
  severity?: number;
  /** Lucide icon name (e.g. "Frown"), resolved in src/components/simulateur/icons.ts.
   *  This file imports nothing from React/lucide on purpose — icons live here only as strings. */
  icon?: string;
}

export interface Question {
  id: string;
  type: 'single' | 'multi';
  /** Controls ONLY how Wizard.tsx renders the options — never scoring. Defaults to 'cards'. */
  variant?: 'cards' | 'mood' | 'range';
  options: QuestionOption[];
  showIf?: (answers: Answer[]) => boolean;
}
```

Then append the new question at the end of the `QUESTIONS` array, right after the `priorite` entry (after line 225, before the closing `];` on line 226):

```ts
  {
    // Budget-qualifying question, added 2026-09-22 (D-02 extended). No
    // `severity` — like `secteur`, budget nudges service weight only, it
    // never measures an unmet need (07-RESEARCH.md Pitfall 1 still applies:
    // do not add a severity here later without re-reading that doc).
    //
    // Labels shown to the visitor MUST stay qualitative — never a number or
    // currency symbol. translations.test.ts enforces this site-wide
    // (SIMU-06/SIMU-08); the numbers below exist only in `value` (an
    // internal id, never rendered).
    id: 'budget',
    type: 'single',
    variant: 'range',
    options: [
      {
        value: 'budget-0-500',
        icon: 'Coins',
        weights: { 'site-vitrine': 2, maintenance: 2 },
      },
      {
        value: 'budget-500-1500',
        icon: 'Wallet',
        weights: { 'site-vitrine': 2, 'meta-ads': 1, 'community-management': 1 },
      },
      {
        value: 'budget-1500-3000',
        icon: 'CreditCard',
        weights: { 'rebranding-site-premium': 2, 'google-ads': 1, branding: 1 },
      },
      {
        value: 'budget-3000-plus',
        icon: 'Landmark',
        weights: { 'projet-sur-mesure': 3, 'rebranding-site-premium': 1 },
      },
    ],
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/simulateur/questions.test.ts`
Expected: PASS — all tests in this file green, including the new D-02 (extended) bound and the updated locked-ids list.

- [ ] **Step 5: Commit**

```bash
git add src/lib/simulateur/questions.ts src/lib/simulateur/questions.test.ts
git commit -m "feat(simulateur): add budget question, extend D-02 cap to 6 questions"
```

---

### Task 2: Assign icon and variant metadata to the existing questions

**Files:**
- Modify: `src/lib/simulateur/questions.ts`
- Modify: `src/lib/simulateur/questions.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/simulateur/questions.test.ts` (new `describe` block at the end of the file):

```ts
describe('icon and variant metadata', () => {
  it('presence-en-ligne and site-fiabilite are mood-variant Likert scales, priorite stays cards', () => {
    const moodIds = ['presence-en-ligne', 'site-fiabilite'];
    for (const id of moodIds) {
      const q = QUESTIONS.find((question) => question.id === id);
      expect(q?.variant, id).toBe('mood');
    }
    const priorite = QUESTIONS.find((question) => question.id === 'priorite');
    expect(priorite?.variant ?? 'cards').toBe('cards');
  });

  it('every option on secteur, frictions, priorite, presence-en-ligne, site-fiabilite and budget declares an icon', () => {
    const idsRequiringIcons = [
      'secteur',
      'frictions',
      'priorite',
      'presence-en-ligne',
      'site-fiabilite',
      'budget',
    ];
    for (const id of idsRequiringIcons) {
      const q = QUESTIONS.find((question) => question.id === id);
      expect(q, id).toBeDefined();
      for (const option of q!.options) {
        expect(option.icon, `${id}/${option.value}`).toBeTruthy();
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/simulateur/questions.test.ts -t "icon and variant metadata"`
Expected: FAIL — no question currently declares `variant` or `icon`.

- [ ] **Step 3: Add icon/variant metadata to the existing questions**

In `src/lib/simulateur/questions.ts`, update each existing question's options. `secteur` (lines 66-95) — add `icon` to each option:

```ts
  {
    id: 'secteur',
    type: 'single',
    options: [
      {
        value: 'commerce-local',
        icon: 'Store',
        weights: { 'site-vitrine': 1, 'meta-ads': 1, 'community-management': 1 },
      },
      {
        value: 'restauration-hotellerie',
        icon: 'UtensilsCrossed',
        weights: { 'agent-vocal-ia': 2, 'site-vitrine': 1, 'community-management': 1 },
      },
      {
        value: 'artisan-btp',
        icon: 'HardHat',
        weights: { 'site-vitrine': 1, 'google-ads': 2, 'agent-vocal-ia': 1 },
      },
      {
        value: 'services-pro',
        icon: 'Briefcase',
        weights: { 'rebranding-site-premium': 1, 'google-ads': 1, branding: 1 },
      },
      {
        value: 'sante-bien-etre',
        icon: 'HeartPulse',
        weights: { 'agent-vocal-ia': 2, 'site-vitrine': 1, maintenance: 1 },
      },
      {
        value: 'autre',
        icon: 'MoreHorizontal',
        weights: { 'site-vitrine': 1, 'projet-sur-mesure': 1 },
      },
    ],
  },
```

`presence-en-ligne` (lines 96-122) — add `variant: 'mood'` and icons (worst → best severity maps to Frown → Meh → Smile → PartyPopper):

```ts
  {
    // D-03: Likert-style severity/satisfaction scale, not a yes/no gate.
    id: 'presence-en-ligne',
    type: 'single',
    variant: 'mood',
    options: [
      {
        value: 'inexistante',
        icon: 'Frown',
        severity: 95,
        weights: { 'site-vitrine': 4, branding: 2, 'google-ads': 1 },
      },
      {
        value: 'datee',
        icon: 'Meh',
        severity: 75,
        weights: { 'rebranding-site-premium': 4, branding: 2, 'site-vitrine': 1 },
      },
      {
        value: 'correcte',
        icon: 'Smile',
        severity: 45,
        weights: { 'meta-ads': 2, 'community-management': 2, maintenance: 1 },
      },
      {
        value: 'solide',
        icon: 'PartyPopper',
        severity: 15,
        weights: { 'meta-ads': 2, 'google-ads': 2, 'projet-sur-mesure': 1 },
      },
    ],
  },
```

`site-fiabilite` (lines 129-157) — add `variant: 'mood'` and icons, same worst-to-best mapping:

```ts
  {
    id: 'site-fiabilite',
    type: 'single',
    variant: 'mood',
    showIf: (answers) => {
      const presence = answers.find((a) => a.questionId === 'presence-en-ligne');
      return presence?.value !== 'inexistante';
    },
    options: [
      {
        value: 'jamais-touche',
        icon: 'Frown',
        severity: 90,
        weights: { maintenance: 4, 'rebranding-site-premium': 2 },
      },
      {
        value: 'bugs-frequents',
        icon: 'Meh',
        severity: 80,
        weights: { maintenance: 4, 'projet-sur-mesure': 1 },
      },
      {
        value: 'quelques-alertes',
        icon: 'Smile',
        severity: 50,
        weights: { maintenance: 3 },
      },
      {
        value: 'suivi-regulier',
        icon: 'PartyPopper',
        severity: 15,
        weights: { 'projet-sur-mesure': 1 },
      },
    ],
  },
```

`frictions` (lines 158-199) — add icons only (stays `variant: 'cards'` default):

```ts
  {
    // D-04: multi-select question, stored answer value is a string array.
    id: 'frictions',
    type: 'multi',
    options: [
      {
        value: 'appels-manques',
        icon: 'PhoneMissed',
        severity: 80,
        weights: { 'agent-vocal-ia': 4 },
      },
      {
        value: 'pas-assez-de-demandes',
        icon: 'TrendingDown',
        severity: 75,
        weights: { 'google-ads': 3, 'meta-ads': 3, 'site-vitrine': 1 },
      },
      {
        value: 'image-depassee',
        icon: 'ImageOff',
        severity: 70,
        weights: { branding: 3, 'rebranding-site-premium': 3 },
      },
      {
        value: 'site-lent-ou-casse',
        icon: 'Wrench',
        severity: 85,
        weights: { maintenance: 3, 'rebranding-site-premium': 2 },
      },
      {
        value: 'reseaux-inactifs',
        icon: 'Users',
        severity: 45,
        weights: { 'community-management': 4 },
      },
      {
        value: 'taches-repetitives',
        icon: 'Repeat',
        severity: 70,
        weights: { 'projet-sur-mesure': 3, 'agent-vocal-ia': 2 },
      },
      {
        value: 'rien-de-bloquant',
        icon: 'CircleCheck',
        severity: 10,
        weights: { maintenance: 2, 'community-management': 1 },
      },
    ],
  },
```

`priorite` (lines 200-225) — add icons only (stays `variant: 'cards'` default — it's a goal choice, not a sentiment scale):

```ts
  {
    id: 'priorite',
    type: 'single',
    options: [
      {
        value: 'etre-trouve',
        icon: 'Target',
        severity: 65,
        weights: { 'google-ads': 3, 'site-vitrine': 2, 'meta-ads': 1 },
      },
      {
        value: 'convertir-plus',
        icon: 'TrendingUp',
        severity: 60,
        weights: { 'rebranding-site-premium': 3, 'site-vitrine': 2, 'meta-ads': 1 },
      },
      {
        value: 'gagner-du-temps',
        icon: 'Clock',
        severity: 55,
        weights: { 'agent-vocal-ia': 3, 'projet-sur-mesure': 2, maintenance: 1 },
      },
      {
        value: 'changer-d-image',
        icon: 'Palette',
        severity: 50,
        weights: { branding: 4, 'rebranding-site-premium': 2 },
      },
    ],
  },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/simulateur/questions.test.ts`
Expected: PASS — all tests in the file green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/simulateur/questions.ts src/lib/simulateur/questions.test.ts
git commit -m "feat(simulateur): assign icons and mood variant to existing questions"
```

---

### Task 3: Fix wizardSteps.test.ts fixtures for the 6th question

**Files:**
- Modify: `src/lib/simulateur/wizardSteps.test.ts`

- [ ] **Step 1: Run the existing suite to confirm it now fails**

Run: `npx vitest run src/lib/simulateur/wizardSteps.test.ts`
Expected: FAIL — `progressRatio(FULL_PATH_ANSWERS)` and `progressRatio(SKIPPED_PATH_ANSWERS)` no longer equal `1` (Task 1 made `budget` a 6th applicable question that these fixtures don't answer), and `contactStepIndex` assertions shift by one.

- [ ] **Step 2: Update the fixtures**

In `src/lib/simulateur/wizardSteps.test.ts`, replace `FULL_PATH_ANSWERS` and `SKIPPED_PATH_ANSWERS` (lines 7-20):

```ts
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
```

Also update the label in the `it.each` table (line 28) from `'full 5-question path'` to `'full 6-question path'` so the test description stays accurate:

```ts
    ['full 6-question path', FULL_PATH_ANSWERS],
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run src/lib/simulateur/wizardSteps.test.ts`
Expected: PASS — all tests green, no logic in `wizardSteps.ts` itself needed changing (confirms the design spec's claim that this module is fully generic over `QUESTIONS`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/simulateur/wizardSteps.test.ts
git commit -m "test(simulateur): update wizardSteps fixtures for the 6-question path"
```

---

### Task 4: Add budget translations (fr, en, th)

**Files:**
- Modify: `src/lib/translations.ts`

- [ ] **Step 1: Run the existing suite to confirm it now fails**

Run: `npx vitest run src/lib/translations.test.ts`
Expected: FAIL — `every QUESTIONS id and option value has a defined, non-empty label in every locale` fails for all three locales (`fr`, `en`, `th`) because `budget` has no entry yet in `translations[lang].simulateur.questions`. This existing test is the TDD anchor for this task — no new test needs to be written.

- [ ] **Step 2: Add the fr entry**

In `src/lib/translations.ts`, insert after the `priorite` block inside the `fr` locale's `simulateur.questions` object (after line 844, the `},` that closes `priorite`, before line 845's closing `},` of `questions`):

```ts
      'budget': {
        text: 'Quel budget avez-vous en tête pour ce projet ?',
        hint: 'Une estimation suffit — elle nous aide à cadrer une recommandation réaliste.',
        options: {
          'budget-0-500': 'Budget serré, je découvre les options',
          'budget-500-1500': 'Budget modéré, prêt à investir raisonnablement',
          'budget-1500-3000': 'Budget confortable, je veux un vrai résultat',
          'budget-3000-plus': 'Budget conséquent, sans limite stricte',
        },
      },
```

- [ ] **Step 3: Add the en entry**

Insert after the `priorite` block inside the `en` locale's `simulateur.questions` object (after line 1598's closing `},`):

```ts
      'budget': {
        text: "What budget do you have in mind for this project?",
        hint: "A rough estimate is enough — it helps us shape a realistic recommendation.",
        options: {
          'budget-0-500': "Tight budget, just exploring options",
          'budget-500-1500': "Moderate budget, ready to invest reasonably",
          'budget-1500-3000': "Comfortable budget, I want real results",
          'budget-3000-plus': "Substantial budget, no strict ceiling",
        },
      },
```

- [ ] **Step 4: Add the th entry**

Insert after the `priorite` block inside the `th` locale's `simulateur.questions` object (after line 2352's closing `},`):

```ts
      'budget': {
        text: "คุณมีงบประมาณเท่าไหร่สำหรับโปรเจกต์นี้?",
        hint: "ประมาณคร่าวๆ ก็เพียงพอ ช่วยให้เราเสนอแนะได้อย่างเหมาะสม",
        options: {
          'budget-0-500': "งบจำกัด กำลังสำรวจตัวเลือกอยู่",
          'budget-500-1500': "งบปานกลาง พร้อมลงทุนตามความเหมาะสม",
          'budget-1500-3000': "งบสบายๆ ต้องการผลลัพธ์ที่จับต้องได้จริง",
          'budget-3000-plus': "งบสูง ไม่มีเพดานตายตัว",
        },
      },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/translations.test.ts`
Expected: PASS — including `no price, tariff, currency or free-of-charge language appears in t.simulateur` (the copy above was hand-verified against `PRICE_PATTERN`/`SIMU_PRICE_PATTERN` — no `€`/`$`/`£`/`฿`, no "prix"/"tarif"/"euro"/"price"/"pricing"/"devis"/"gratuit"/"free"/"à partir de" in any locale), and `no locale declares a questions/options key absent from QUESTIONS`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/translations.ts
git commit -m "feat(simulateur): add budget question copy for fr/en/th"
```

---

### Task 5: Create the icon-name-to-component table

**Files:**
- Create: `src/components/simulateur/icons.ts`
- Create: `src/components/simulateur/icons.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/simulateur/icons.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '@/lib/simulateur/questions';
import { SIM_ICONS } from './icons';

describe('SIM_ICONS', () => {
  it('resolves every icon name referenced by any QUESTIONS option to a defined component', () => {
    for (const question of QUESTIONS) {
      for (const option of question.options) {
        if (option.icon === undefined) continue;
        expect(SIM_ICONS[option.icon], `icon "${option.icon}" on ${question.id}/${option.value}`).toBeDefined();
      }
    }
  });

  it('every icon referenced in SIM_ICONS is a function (a real Lucide component, not undefined)', () => {
    for (const [name, Icon] of Object.entries(SIM_ICONS)) {
      expect(typeof Icon, `SIM_ICONS.${name}`).toBe('object');
    }
  });
});
```

Note: `lucide-react` icon components are `forwardRef` objects, not plain functions — `typeof Icon` is `'object'` for a `forwardRef`-wrapped component, which is why the second assertion checks `'object'`, not `'function'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/simulateur/icons.test.ts`
Expected: FAIL — `./icons` module does not exist yet (import error).

- [ ] **Step 3: Create icons.ts**

Create `src/components/simulateur/icons.ts`:

```ts
// src/components/simulateur/icons.ts
//
// The ONLY file that couples the pure data in src/lib/simulateur/questions.ts
// (which imports nothing from React/lucide on purpose) to real lucide-react
// components. questions.ts references icons by string name; this table
// resolves that name at render time in Wizard.tsx. A name with no entry
// here is a no-op (no icon shown), never a crash — see icons.test.ts for
// the regression guard that keeps this table in sync with questions.ts.

import {
  Store,
  UtensilsCrossed,
  HardHat,
  Briefcase,
  HeartPulse,
  MoreHorizontal,
  PhoneMissed,
  TrendingDown,
  ImageOff,
  Wrench,
  Users,
  Repeat,
  CircleCheck,
  Target,
  TrendingUp,
  Clock,
  Palette,
  Frown,
  Meh,
  Smile,
  PartyPopper,
  Coins,
  Wallet,
  CreditCard,
  Landmark,
  type LucideIcon,
} from 'lucide-react';

export const SIM_ICONS: Record<string, LucideIcon> = {
  Store,
  UtensilsCrossed,
  HardHat,
  Briefcase,
  HeartPulse,
  MoreHorizontal,
  PhoneMissed,
  TrendingDown,
  ImageOff,
  Wrench,
  Users,
  Repeat,
  CircleCheck,
  Target,
  TrendingUp,
  Clock,
  Palette,
  Frown,
  Meh,
  Smile,
  PartyPopper,
  Coins,
  Wallet,
  CreditCard,
  Landmark,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/simulateur/icons.test.ts`
Expected: PASS.

Also run the full simulateur test slice to catch any icon-name typo introduced in Task 2 (a mismatch would fail here, not in questions.test.ts, since questions.test.ts only checks `icon` is truthy, not that it resolves to a real component):

Run: `npx vitest run src/lib/simulateur src/components/simulateur`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/simulateur/icons.ts src/components/simulateur/icons.test.ts
git commit -m "feat(simulateur): add Lucide icon name-to-component table"
```

---

### Task 6: Fix the two mobile CSS bugs and add variant styles

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/lib/simulateur/styles.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/lib/simulateur/styles.test.ts`, add the new selectors to `REQUIRED_SELECTORS` (after `'.sim-option:focus-visible',` on line 23):

```ts
  '.sim-option-icon',
  '.sim-mood-row',
  '.sim-mood-option',
  '.sim-mood-option.selected',
  '.sim-mood-option:focus-visible',
  '.sim-mood-icon',
  '.sim-range-wrap',
  '.sim-range-value',
  '.sim-range-input',
```

Also add a new test at the end of the `describe` block (after the `--warm` scoping test, before the closing `});` on line 81) asserting the two mobile-overflow fixes are actually present, not just that the selectors exist:

```ts
  // Mobile overflow fix (2026-09-22): .sim-rgpd .row must collapse to a
  // single column under 480px instead of forcing a fixed 180px key column
  // that pushes long values off-screen.
  it('collapses .sim-rgpd .row to one column under 480px', () => {
    const mediaBlocks = css.match(/@media \(max-width:\s*480px\)\s*\{[\s\S]*?\n\}/g) ?? [];
    const hasRowFix = mediaBlocks.some(
      (block) => block.includes('.sim-rgpd .row') && block.includes('grid-template-columns: 1fr')
    );
    expect(hasRowFix).toBe(true);
  });

  // Mobile overflow fix (2026-09-22): .sim-q-text must scale down instead
  // of staying fixed at 32px, which overflowed narrow viewports.
  it('scales .sim-q-text with clamp() instead of a fixed font-size', () => {
    const match = css.match(/\.sim-q-text\s*\{[^}]*\}/);
    expect(match).not.toBeNull();
    expect(match?.[0]).toMatch(/font-size:\s*clamp\(/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/simulateur/styles.test.ts`
Expected: FAIL — none of the new selectors exist yet, `.sim-q-text` still has a fixed `font-size: 32px`, and no `@media (max-width: 480px)` block exists yet.

- [ ] **Step 3: Fix the two mobile bugs**

In `src/app/globals.css`, replace line 744:

```css
.sim-q-text { font-family: var(--font-display), serif; font-weight: 500; font-size: 32px; line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 32px; }
```

with:

```css
.sim-q-text { font-family: var(--font-display), serif; font-weight: 500; font-size: clamp(22px, 6vw, 32px); line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 32px; }
```

- [ ] **Step 4: Add the icon/mood/range CSS and the 480px media query**

In `src/app/globals.css`, replace line 745:

```css
.sim-options { display: grid; gap: 16px; }
```

with:

```css
.sim-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
```

Replace line 746 (bump the icon/label gap from 4px to 8px so the icon has breathing room):

```css
.sim-option { min-height: 44px; display: flex; align-items: center; gap: 4px; width: 100%; text-align: left; padding: 8px 20px; background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; color: var(--ink); font-family: var(--font-body), sans-serif; font-size: 16px; line-height: 1.3; cursor: pointer; transition: border-color .2s, background .2s; }
```

with:

```css
.sim-option { min-height: 44px; display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 8px 20px; background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; color: var(--ink); font-family: var(--font-body), sans-serif; font-size: 16px; line-height: 1.3; cursor: pointer; transition: border-color .2s, background .2s; }
```

Then insert the new rules right after line 749 (`.sim-option:focus-visible { ... }`) and before line 750 (`.sim-nav { ... }`):

```css
.sim-option-icon { flex-shrink: 0; width: 20px; height: 20px; color: var(--ink-dim); }
.sim-option.selected .sim-option-icon { color: var(--acid); }

.sim-mood-row { display: flex; gap: 8px; }
.sim-mood-option { flex: 1; min-height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 12px 8px; background: var(--bg-2); border: 1px solid var(--line); border-radius: 12px; color: var(--ink-dim); font-family: var(--font-body), sans-serif; font-size: 12px; line-height: 1.2; text-align: center; cursor: pointer; transition: border-color .2s, color .2s; }
.sim-mood-option:hover { border-color: var(--line-strong); }
.sim-mood-option.selected { border-color: var(--acid); color: var(--ink); }
.sim-mood-option.selected .sim-mood-icon { color: var(--acid); }
.sim-mood-option:focus-visible { outline: 2px solid var(--acid); outline-offset: 2px; }
.sim-mood-icon { width: 28px; height: 28px; color: var(--ink-dim); }

.sim-range-wrap { display: grid; gap: 16px; }
.sim-range-value { font-family: var(--font-display), serif; font-weight: 500; font-size: 24px; text-align: center; color: var(--ink); margin: 0; }
.sim-range-input { width: 100%; height: 44px; accent-color: var(--acid); cursor: pointer; }
.sim-range-input:focus-visible { outline: 2px solid var(--acid); outline-offset: 2px; }
```

Finally, add the mobile overflow fix as a new `@media (max-width: 480px)` block right after the existing `.sim-*` rules end (after line 781's `.sim-section-gap { padding: 48px 0; }`, before line 782's blank line / `.o-num` rule):

```css

@media (max-width: 480px) {
  .sim-wizard { padding: 20px; }
  .sim-rgpd .row { grid-template-columns: 1fr; gap: 4px; }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/simulateur/styles.test.ts`
Expected: PASS — all selectors found, both mobile-fix assertions pass, the pre-existing `.sim-option` 44px and `--warm` scoping tests still pass unchanged.

Run the full simulateur+components slice once more:

Run: `npx vitest run src/lib/simulateur src/components/simulateur`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/lib/simulateur/styles.test.ts
git commit -m "fix(simulateur): mobile overflow on RGPD row and question heading, add variant CSS"
```

---

### Task 7: Render the three variants in Wizard.tsx

**Files:**
- Modify: `src/components/simulateur/Wizard.tsx`

This task has no new automated test of its own — `wizardContract.test.ts` (source-contract checks) and the manual dev-server check in Task 8 are the verification. `Wizard.tsx` is a `.tsx` client component excluded from Vitest's collection glob (see the comment at the top of `wizardContract.test.ts`), so there is no existing precedent in this codebase for mounting it in a test.

- [ ] **Step 1: Confirm the baseline still passes before touching Wizard.tsx**

Run: `npx vitest run src/lib/simulateur/wizardContract.test.ts`
Expected: PASS (baseline, before this task's edit).

- [ ] **Step 2: Add the icons import**

In `src/components/simulateur/Wizard.tsx`, add a new import after line 17 (`import ScoreGauge from '@/components/simulateur/ScoreGauge';`):

```tsx
import { SIM_ICONS } from '@/components/simulateur/icons';
```

- [ ] **Step 3: Compute the range-slider helpers alongside the other per-render derived values**

In the `if (step.kind === 'question') { ... }` block, right after the `isSelected` function definition (after line 161, before line 163's `return (`), add:

```tsx
    const variant = question.variant ?? 'cards';
    const selectedRangeIndex = Math.max(0, question.options.findIndex((o) => o.value === stored?.value));
    const rangeCurrentLabel =
      t.simulateur.questions[question.id].options[question.options[selectedRangeIndex].value];
```

- [ ] **Step 4: Replace the options-rendering block with the three variant branches**

Replace lines 176-196 (the single `<div className="sim-options">...</div>` block):

```tsx
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
                className={'sim-option' + (selected ? ' selected' : '')}
                onClick={() => toggleOption(option.value)}
              >
                {t.simulateur.questions[question.id].options[option.value]}
              </button>
            );
          })}
        </div>
```

with:

```tsx
        {variant === 'range' ? (
          <div className="sim-range-wrap">
            <p className="sim-range-value">{rangeCurrentLabel}</p>
            <input
              type="range"
              className="sim-range-input"
              min={0}
              max={question.options.length - 1}
              step={1}
              value={selectedRangeIndex}
              aria-labelledby={headingId}
              aria-valuetext={rangeCurrentLabel}
              onChange={(e) =>
                setAnswer(question.id)(question.options[Number(e.target.value)].value)
              }
            />
          </div>
        ) : variant === 'mood' ? (
          <div className="sim-mood-row" role="radiogroup" aria-labelledby={headingId}>
            {question.options.map((option) => {
              const selected = isSelected(option.value);
              const Icon = option.icon ? SIM_ICONS[option.icon] : null;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={'sim-mood-option' + (selected ? ' selected' : '')}
                  onClick={() => toggleOption(option.value)}
                >
                  {Icon && <Icon className="sim-mood-icon" aria-hidden="true" />}
                  <span>{t.simulateur.questions[question.id].options[option.value]}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div
            className="sim-options"
            role={question.type === 'multi' ? 'group' : 'radiogroup'}
            aria-labelledby={headingId}
          >
            {question.options.map((option) => {
              const selected = isSelected(option.value);
              const Icon = option.icon ? SIM_ICONS[option.icon] : null;
              return (
                <button
                  key={option.value}
                  type="button"
                  role={question.type === 'multi' ? 'checkbox' : 'radio'}
                  aria-checked={selected}
                  className={'sim-option' + (selected ? ' selected' : '')}
                  onClick={() => toggleOption(option.value)}
                >
                  {Icon && <Icon className="sim-option-icon" aria-hidden="true" />}
                  {t.simulateur.questions[question.id].options[option.value]}
                </button>
              );
            })}
          </div>
        )}
```

- [ ] **Step 5: Run the contract test and the type checker**

Run: `npx vitest run src/lib/simulateur/wizardContract.test.ts`
Expected: PASS — no literal `WizardStep`-shaped array was introduced, `handleSubmit` untouched, exactly one `tel:`/`mailto:` link untouched, and the new code contains no currency symbol or guarded price word (`SIM_ICONS`, `range`, `mood` etc. don't match `SIMU_PRICE_PATTERN`).

Run: `npx tsc --noEmit`
Expected: PASS — no type errors (confirms `option.icon` typed as `string | undefined`, `SIM_ICONS[option.icon]` typed as `LucideIcon | undefined`, and the JSX conditional rendering `{Icon && <Icon .../>}` type-checks).

- [ ] **Step 6: Commit**

```bash
git add src/components/simulateur/Wizard.tsx
git commit -m "feat(simulateur): render cards/mood/range variants with icons in Wizard"
```

---

### Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — every test file green, including the ones this plan didn't touch (confirms no regression outside the simulateur).

- [ ] **Step 2: Run the type checker and linter**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

Run: `npm run lint`
Expected: PASS, no errors (warnings pre-existing and unrelated to this change are acceptable — do not fix unrelated lint debt in this task).

- [ ] **Step 3: Manual browser smoke test**

Start the dev server (`npm run dev`, note the port it actually binds — 3000 may be occupied by another local project) and open `/simulateur` at a mobile viewport width (375px) in the browser:
- Confirm no horizontal scrollbar/overflow appears on any question step, the contact step (especially the RGPD block), or the result step.
- Confirm `secteur`, `frictions`, `priorite` render as a 2-column icon-card grid with a visible icon per option.
- Confirm `presence-en-ligne` and `site-fiabilite` render as a horizontal 4-icon mood row.
- Confirm `budget` renders as a single slider with a qualitative label above it that updates live while dragging, and that the label never shows a number or currency symbol.
- Complete one full run of the wizard (all 6 questions → contact → submit) and confirm the result step still renders normally.

- [ ] **Step 4: Update the design spec status**

In `docs/superpowers/specs/2026-09-22-simulateur-gamification-design.md`, no change needed — it already documents `**Statut** : Approuvé`. No action, just confirm the implemented behavior matches it (self-check, not a file edit).

- [ ] **Step 5: Final commit**

```bash
git add -A
git status
```

Review the output — this should show a clean tree (everything already committed task-by-task). If anything is unstaged (e.g. a stray build artifact), do not commit it; investigate why it changed.

---

## Self-Review Notes (completed while writing this plan)

- **Spec coverage:** every section of `2026-09-22-simulateur-gamification-design.md` maps to a task above — data model (Task 1-2), icons module (Task 5), Wizard rendering (Task 7), i18n (Task 4), mobile bug fix (Task 6), tests (woven into every task per TDD, plus Task 8's full-suite pass).
- **Placeholder scan:** no TBD/TODO; every step shows complete code, exact file/line anchors, and exact commands with expected output.
- **Type consistency:** `option.icon?: string`, `question.variant?: 'cards' | 'mood' | 'range'` (Task 1) are used identically in Task 2 (data), Task 5 (`SIM_ICONS: Record<string, LucideIcon>`), and Task 7 (`SIM_ICONS[option.icon]`, `question.variant ?? 'cards'`) — no renamed field anywhere.
- **Locked-test conflicts resolved before writing tasks, not discovered mid-implementation:** D-02 cap (Task 1) and SIMU-06/SIMU-08 price ban (Task 4) are both called out explicitly with the exact test names and line numbers, and the fix is verified against the actual regex, not assumed.
