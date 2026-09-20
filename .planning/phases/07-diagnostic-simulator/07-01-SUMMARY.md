---
phase: 07-diagnostic-simulator
plan: 01
subsystem: data
tags: [typescript, vitest, pure-functions, state-machine]

# Dependency graph
requires:
  - phase: 06-service-pages-template-content
    provides: The 9 finalized ServiceSlug values (src/data/services.ts) that questions.ts's weights key against
  - phase: 05-prospect-capture-backend
    provides: prospects-schema.ts's reponsesDiagnostic Answer shape that questions.ts's Answer type must match
provides:
  - "QUESTIONS: 5-question bank (secteur, presence-en-ligne, site-fiabilite, frictions, priorite) with weights + severity"
  - "isQuestionApplicable/nextQuestionId: branching predicate skipping site-fiabilite when presence-en-ligne is 'inexistante'"
  - "PRIORITY_ORDER: fixed 9-slug tiebreak order (D-07)"
  - "buildStepSequence/applicableQuestionIds/progressRatio/contactStepIndex: wizard step machine (SIMU-04, D-14)"
affects: [07-diagnostic-simulator plan 03 (scoring), plan 04 (Wizard component), plan 05 (translations copy)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zero-import pure data modules (mirrors src/data/services.ts convention) so vitest node env and client Wizard share the same source without bundler shims"
    - "showIf predicate on Question, evaluated via isQuestionApplicable, drives branching without a separate decision tree"
    - "Step-sequence machine (buildStepSequence) centralizes contact/result placement so the Wizard component never hardcodes gate position"

key-files:
  created:
    - src/lib/simulateur/questions.ts
    - src/lib/simulateur/priorityOrder.ts
    - src/lib/simulateur/wizardSteps.ts
    - src/lib/simulateur/questions.test.ts
    - src/lib/simulateur/wizardSteps.test.ts
  modified: []

key-decisions:
  - "Followed plan's explicit task split: Task 1/2 implement modules (verified via tsc), Task 3 writes tests for both (verified via vitest) — not a per-file RED/GREEN split, per the plan's own task boundaries"

patterns-established:
  - "Pattern: severity (0-100, unmet-need strength) and weights (per-ServiceSlug score contribution) are stored on the same QuestionOption but consumed by two independent downstream functions — never conflate them in scoring.ts"
  - "Pattern: LOCKED_* exact-array assertion idiom (from src/data/services.test.ts) reused for LOCKED_QUESTION_IDS"

requirements-completed: [SIMU-01, SIMU-04]

# Metrics
duration: ~15min
completed: 2026-09-20
---

# Phase 7 Plan 01: Question Bank & Wizard Step Machine Summary

**Pure, framework-free question bank (5 questions, Likert-branching) plus a wizard step machine that guarantees contact-capture always sits between the last applicable question and the result screen.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-09-20T21:03:35Z
- **Tasks:** 3
- **Files modified:** 5 (all created)

## Accomplishments

- `src/lib/simulateur/questions.ts`: 5-entry `QUESTIONS` bank (`secteur`, `presence-en-ligne`, `site-fiabilite`, `frictions`, `priorite`) with exact ids/values/weights/severities per the plan spec; `nextQuestionId` skips `site-fiabilite` when `presence-en-ligne` is `'inexistante'` (SIMU-01)
- `src/lib/simulateur/priorityOrder.ts`: `PRIORITY_ORDER` — the fixed 9-slug agency lead-with tiebreak order (D-07)
- `src/lib/simulateur/wizardSteps.ts`: `buildStepSequence`, `applicableQuestionIds`, `progressRatio`, `contactStepIndex` — SIMU-04 contact-after-questions-before-result guarantee and D-14 progress-bar fraction, all unit-testable without React
- 25 new unit tests (questions.test.ts + wizardSteps.test.ts), full suite stays green at 95/95 across 7 files

## Task Commits

Each task was committed atomically:

1. **Task 1: Question bank, types, and branching predicate** - `707661f` (feat)
2. **Task 2: Priority tiebreak order and wizard step machine** - `b922dbf` (feat)
3. **Task 3: Unit tests for the question bank and step machine** - `f538ff1` (test)

**Plan metadata:** (this SUMMARY.md commit, made by orchestrator after worktree merge)

## Files Created/Modified

- `src/lib/simulateur/questions.ts` - ServiceSlug/QuestionOption/Question/Answer types, QUESTIONS bank (5 questions), isQuestionApplicable, getQuestionById, nextQuestionId
- `src/lib/simulateur/priorityOrder.ts` - PRIORITY_ORDER (9-slug fixed tiebreak order, D-07)
- `src/lib/simulateur/wizardSteps.ts` - WizardStep union, applicableQuestionIds, buildStepSequence, progressRatio, contactStepIndex
- `src/lib/simulateur/questions.test.ts` - D-02/D-06/SIMU-01 assertions on the question bank and branching (14 tests)
- `src/lib/simulateur/wizardSteps.test.ts` - SIMU-04/D-14 step-order assertions (11 tests)

## Reference: Final Question Ids, Option Values, and PRIORITY_ORDER

For downstream plans (07-03 scoring, 07-04 Wizard component, 07-05 translations) to join against without re-reading source:

**Question order and ids:** `secteur` → `presence-en-ligne` → `site-fiabilite` (conditional) → `frictions` → `priorite`

1. `secteur` (single): `commerce-local`, `restauration-hotellerie`, `artisan-btp`, `services-pro`, `sante-bien-etre`, `autre`
2. `presence-en-ligne` (single, Likert): `inexistante`, `datee`, `correcte`, `solide`
3. `site-fiabilite` (single, shown unless `presence-en-ligne === 'inexistante'`): `jamais-touche`, `bugs-frequents`, `quelques-alertes`, `suivi-regulier`
4. `frictions` (multi): `appels-manques`, `pas-assez-de-demandes`, `image-depassee`, `site-lent-ou-casse`, `reseaux-inactifs`, `taches-repetitives`, `rien-de-bloquant`
5. `priorite` (single): `etre-trouve`, `convertir-plus`, `gagner-du-temps`, `changer-d-image`

**PRIORITY_ORDER (tiebreak, D-07):** `site-vitrine`, `agent-vocal-ia`, `rebranding-site-premium`, `maintenance`, `projet-sur-mesure`, `branding`, `meta-ads`, `google-ads`, `community-management`

**Wizard step API:** `buildStepSequence(answers)` → `[...question steps in QUESTIONS order for applicable ids..., { kind: 'contact' }, { kind: 'result' }]`. `contactStepIndex(answers) === applicableQuestionIds(answers).length` always. `progressRatio(answers)` is answered-applicable-count / applicable-count, clamped [0,1], 0 when denominator is 0.

## Decisions Made

- Followed the plan's explicit task boundaries (Task 1/2 = implementation verified by `tsc`, Task 3 = tests verified by `vitest`) rather than forcing a per-module RED/GREEN split within Task 1/2, since the plan itself sequences test-writing as a distinct, later task covering both modules.

## Deviations from Plan

None - plan executed exactly as written. All ids, option values, weights, and severities match the plan's task 1/2 action blocks verbatim.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/lib/simulateur/questions.ts`, `priorityOrder.ts`, and `wizardSteps.ts` are stable, fully-tested join points for plan 07-03 (scoring: `computeRecommendedServices`/`computeVisualScore`), 07-04 (Wizard component consuming `buildStepSequence`/`progressRatio`/`contactStepIndex`), and 07-05 (translations keying off question/option ids).
- No blockers. `src/lib/simulateur/` contains exactly the 5 files specified in the plan's success criteria and nothing else.

---
*Phase: 07-diagnostic-simulator*
*Completed: 2026-09-20*

## Self-Check: PASSED

All 5 created source/test files and the SUMMARY.md verified present on disk. All 4 commit hashes (707661f, b922dbf, f538ff1, be8e1ac) verified present in `git log --oneline --all`.
