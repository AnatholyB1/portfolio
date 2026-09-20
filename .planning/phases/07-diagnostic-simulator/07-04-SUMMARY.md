---
phase: 07-diagnostic-simulator
plan: 04
subsystem: scoring
tags: [typescript, vitest, pure-functions, tdd, zod]

# Dependency graph
requires:
  - phase: 07-diagnostic-simulator plan 01
    provides: QUESTIONS, ALL_SLUGS, getQuestionById, Answer/QuestionOption/ServiceSlug types, PRIORITY_ORDER
  - phase: 05-prospect-capture-backend
    provides: prospectSchema/ProspectSubmission (the exact POST /api/simulateur body shape)
provides:
  - "computeRecommendedServices(answers): ServiceSlug[] — weighted tag scoring (D-05), 2-4 clamp (SIMU-02), PRIORITY_ORDER tiebreak (D-07)"
  - "computeVisualScore(answers): number — severity-inverted 0-100 gauge value (SIMU-03, D-11)"
  - "scoreBand(score): 'low'|'mid'|'high' — content-contract band selector for translations.ts"
  - "canSubmit(input): boolean — Wizard submit-button disabled-state predicate (SIMU-05)"
  - "buildProspectPayload(input): ProspectSubmission — throws without consent, assembles the exact 8-key prospectSchema body"
affects: [07-diagnostic-simulator plan 05 (Wizard component wiring), plan 06 (result screen / gauge UI)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two independent pure functions with zero shared intermediate value (Pitfall 1 firewall): computeRecommendedServices reads only option.weights, computeVisualScore reads only option.severity"
    - "forEachSelectedOption module-private helper normalises string|string[] answer values to a uniform iteration path, shared by both scoring functions"
    - "vi.doMock + vi.importActual module-mock technique used to prove severity/weight independence at runtime without needing naturally-matching production data"
    - "buildProspectPayload never hand-types a payload interface — always prospectSchema.parse() the assembled object, so client and server can never silently drift"

key-files:
  created:
    - src/lib/simulateur/scoring.ts
    - src/lib/simulateur/scoring.test.ts
    - src/lib/simulateur/submit.ts
    - src/lib/simulateur/submit.test.ts
  modified: []

key-decisions:
  - "Did not import QUESTIONS into scoring.ts itself (only ALL_SLUGS/getQuestionById) since the implementation never needs the raw array directly — kept scoring.ts's import list minimal to avoid an unused-import lint warning; QUESTIONS is imported in scoring.test.ts where fixtures are derived from it"
  - "Implemented the Pitfall-1 severity-independence regression test via vi.doMock of ./questions with a synthetic two-option question sharing identical weights but wildly different severities — the real QUESTIONS dataset has no natural pair of options with identical weight vectors and differing severity, so a data-only fixture could not prove this invariant without mocking"

requirements-completed: [SIMU-02, SIMU-03, SIMU-05]

# Metrics
duration: ~25min
completed: 2026-09-20
---

# Phase 7 Plan 04: Scoring & Submit Summary

**Two independent pure functions (weighted-tag recommendation, severity-inverted gauge) plus a consent-gated payload assembler that turns wizard answers into a valid `POST /api/simulateur` body — full TDD RED/GREEN cycle, zero shared intermediate value between recommendation and score.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-20T23:27Z
- **Tasks:** 2
- **Files modified:** 4 (all created)

## Accomplishments

- `src/lib/simulateur/scoring.ts`: `computeRecommendedServices` (weighted tag scoring summed from `option.weights`, PRIORITY_ORDER tiebreak, 2-4 clamp), `computeVisualScore` (severity average inverted for opportunity framing, defaults to 50), `scoreBand` (low/mid/high framing selector) — 19 unit tests, including two Pitfall-1 independence regression tests (one using real `secteur` data, one using a `vi.doMock`-injected synthetic question to prove severity changes never move the recommendation)
- `src/lib/simulateur/submit.ts`: `canSubmit` (submit-button disabled predicate), `buildProspectPayload` (throws without consent, assembles the exact 8 `prospectSchema` keys via `computeRecommendedServices` + `prospectSchema.parse`) — 15 unit tests
- Full TDD gate sequence followed for both tasks: RED commit (failing test importing a not-yet-created module) → GREEN commit (implementation, tests pass)
- Full suite stays green: 176/176 tests across 11 files, `tsc --noEmit` clean

## Task Commits

Each task followed the RED/GREEN TDD cycle with its own commits:

1. **Task 1: scoring.ts — recommendation, visual score, and score band**
   - RED: `09ed7ee` (test) — 19 failing assertions, `Cannot find module './scoring'`
   - GREEN: `2424c66` (feat) — all 19 pass
2. **Task 2: submit.ts — consent gate and exact-shape payload assembly**
   - RED: `e9087e8` (test) — 15 failing assertions, `Cannot find module './submit'`
   - GREEN: `d8b6c78` (feat) — all 15 pass

**Plan metadata:** (this SUMMARY.md commit, made by orchestrator after worktree merge)

## Files Created/Modified

- `src/lib/simulateur/scoring.ts` — `computeRecommendedServices`, `computeVisualScore`, `scoreBand`; module-private `forEachSelectedOption` helper
- `src/lib/simulateur/scoring.test.ts` — 19 tests: SIMU-02 2-4 clamp (empty/single/all-options fixtures), D-07 tiebreak + determinism + empty-answers fallback, D-08 standalone maintenance, D-06 sector-never-evicts, D-04 multi-select accumulation, SIMU-03 range, D-11 polarity, secteur no-op, default-50, scoreBand boundaries, two Pitfall-1 regression tests
- `src/lib/simulateur/submit.ts` — `ContactDetails` interface, `canSubmit`, `buildProspectPayload`
- `src/lib/simulateur/submit.test.ts` — 15 tests: SIMU-05 consent gate variations, exact-key-set assertion (`EXPECTED_PAYLOAD_KEYS`), `website`/`consentementRgpd` literal checks, `reponsesDiagnostic`/`formRenderedAt` pass-through, contact-string trimming, `prospectSchema.safeParse` round-trip

## Reference: Exported Signatures

For plan 07-05 (Wizard component) to wire against without re-reading source:

```ts
// src/lib/simulateur/scoring.ts
export function computeRecommendedServices(answers: Answer[]): ServiceSlug[];
export function computeVisualScore(answers: Answer[]): number; // integer 0-100
export function scoreBand(score: number): 'low' | 'mid' | 'high'; // <=40 low, <=65 mid, else high

// src/lib/simulateur/submit.ts
export interface ContactDetails { nom: string; email: string; telephone: string; }
export function canSubmit(input: { contact: ContactDetails; consent: boolean; answers: Answer[] }): boolean;
export function buildProspectPayload(input: {
  contact: ContactDetails;
  consent: boolean;
  answers: Answer[];
  formRenderedAt: number;
}): ProspectSubmission; // throws if consent !== true
```

`buildProspectPayload` is the ONLY function the Wizard's final submit step should call to construct the `POST /api/simulateur` body — it already runs `prospectSchema.parse` internally, so callers do not need to re-validate.

## Decisions Made

- Kept `scoring.ts`'s import list to `ALL_SLUGS` + `getQuestionById` (skipping an unused `QUESTIONS` import) since the module never iterates the raw question bank directly — `QUESTIONS` is only needed in the test file to derive fixtures.
- Proved the severity-independence half of Pitfall 1 via a `vi.doMock('./questions', ...)` + `vi.importActual` synthetic fixture, because the real production question bank has no two options sharing an identical weight vector with differing severity (every real severity-bearing option's weights are unique) — a data-only test could not isolate this invariant.

## Deviations from Plan

None — plan executed as written. The one implementation detail (omitting the unused `QUESTIONS` import from `scoring.ts` itself, keeping it only in `scoring.test.ts`) is a Rule-1-adjacent code-quality choice (avoiding a dead unused-import) with zero behavioral impact; all specified exports, behaviors, and acceptance criteria are met exactly.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. `zod` was already present in `package.json` (Phase 5); this plan installed zero new packages.

## Next Phase Readiness

- `src/lib/simulateur/scoring.ts` and `submit.ts` are stable, fully-tested join points for plan 07-05 (Wizard component: calls `computeRecommendedServices`/`computeVisualScore`/`scoreBand` for the result screen, `canSubmit`/`buildProspectPayload` for the contact step) and plan 07-06 (result screen gauge UI keys off `scoreBand`'s three framing names).
- No blockers. `src/lib/simulateur/scoring.ts` and `submit.ts` exist alongside the plan 07-01/07-02 files with no `.tsx` extension anywhere in the directory.

---
*Phase: 07-diagnostic-simulator*
*Completed: 2026-09-20*
