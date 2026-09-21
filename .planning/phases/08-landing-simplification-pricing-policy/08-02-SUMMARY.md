---
phase: 08-landing-simplification-pricing-policy
plan: 02
subsystem: ui
tags: [nextjs, react, jsonld, pricing-policy, calculateur-roi]

# Dependency graph
requires:
  - phase: 08-landing-simplification-pricing-policy (plan 01)
    provides: "src/app/calculateur-roi/page.test.ts and src/app/layout.test.ts — the FORBIDDEN/REQUIRED token guards this plan turns green"
provides:
  - "Price-free /calculateur-roi: pure recovered-capacity + optional recovered-revenue calculator, no cost-vs-price comparison, no amortization claim"
  - "Site-wide ProfessionalService JSON-LD with priceRange removed (D-09), closing PRIX-01's structured-data clause"
affects: [08-03-landing-problems-services-copy, 08-06-page-composition-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Whole-token regex match (/\\broi-card(?!-)/g) instead of a bare substring lastIndexOf when a test needs to distinguish a CSS class from sibling classes sharing its prefix (roi-card vs roi-card-label/-note/-bonus)"

key-files:
  created: []
  modified:
    - src/app/calculateur-roi/page.tsx
    - src/app/calculateur-roi/page.test.ts
    - src/app/layout.tsx

key-decisions:
  - "Fixed a plan-01 test bug (Rule 1) rather than restructuring valid JSX to dodge it: the D-01 positional check's bare lastIndexOf('roi-card') matched inside 'roi-card-label', which must legitimately sit inside the promoted card per the plan's own instructions and 08-UI-SPEC.md Section Spec 8"
  - "Carte 3's closing line rewritten to 'Bénéfice total récupéré : {fmtEur(beneficeTotal)}/mois (capacité + CA additionnel)' — absolute value framing, no ratio/multiplier"
  - "roi-mention upside-ON copy: 'Le temps d'équipe récupéré est la donnée mesurée. Le CA récupéré sur les appels manqués vient par-dessus.' — drops the 'rentabilise' framing that implied a cost comparison"
  - "Final CTA label: 'Découvrir l'agent vocal IA →' targeting /services/agent-vocal-ia (D-02, unchanged destination)"

patterns-established: []

requirements-completed: [PRIX-01, PRIX-02]

# Metrics
duration: 15min
completed: 2026-09-21
---

# Phase 8 Plan 2: ROI Calculator & Global JSON-LD Price Strip Summary

**Price-free value calculator at /calculateur-roi (recovered capacity + optional revenue upside + single agent-vocal CTA) and priceRange deleted from the site-wide ProfessionalService JSON-LD**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-21T20:08:41+02:00 (worktree base)
- **Completed:** 2026-09-21T20:21:26+02:00
- **Tasks:** 2
- **Files modified:** 3 (2 production, 1 test-bug fix)

## Accomplishments
- `/calculateur-roi` no longer shows any price, cost, or cost-vs-price ratio — only recovered capacity (`capaciteRecuperee`) and optional recovered revenue (`caRecupere`/`margeRecuperee`/`beneficeTotal`)
- The capacity card ("Capacité opérationnelle récupérée") is now the sole `roi-card-main` (visually primary) card
- Page closes on a single CTA to `/services/agent-vocal-ia`
- Global `ProfessionalService` JSON-LD in `layout.tsx` no longer declares `priceRange` anywhere on the site — `areaServed`/`openingHours` and every other field survive untouched
- Both plan-01 guard files (`layout.test.ts`, `calculateur-roi/page.test.ts`) are green; full suite failures remain confined to `translations.test.ts` and `page.test.ts` (RED-by-design, owned by plans 03/05/06)

## Task Commits

Each task was committed atomically:

1. **Task 1: Turn /calculateur-roi into a price-free value calculator** - `2cb8703` (feat)
2. **Task 2: Delete priceRange from the site-wide ProfessionalService JSON-LD** - `ce9621a` (fix)

_Note: Task 1's commit also carries the plan-01 test-bug fix (Rule 1), bundled in since it's the same file's test and required to prove Task 1's own acceptance criteria green._

## Files Created/Modified
- `src/app/calculateur-roi/page.tsx` - Deleted `prixMensuel`/`setup` DEFAULTS, `gainNetSocle`/`ratioSocle`/`amortissementMois`/`ratioTotal`/`amortLabel`/`amortNeg` derivations, `fmtMult` helper, the two price ControlRows, and the entire Carte 2 price-ratio block; promoted Carte 1 to `roi-card-main`; rewrote Carte 3's closing line and the `roi-mention` copy; added the final CTA to `/services/agent-vocal-ia`
- `src/app/calculateur-roi/page.test.ts` - Fixed the D-01 positional check's whole-token matching (see Deviations)
- `src/app/layout.tsx` - Deleted `priceRange: "€€",` from the `ProfessionalService` JSON-LD object

## Decisions Made
- Chose absolute-value phrasing (`{fmtEur(beneficeTotal)}/mois`) for Carte 3's closing line per 08-UI-SPEC.md's Copywriting Contract, replacing the deleted `fmtMult(ratioTotal)` multiplier framing
- Kept euro-denominated values throughout (fmtEur on capacity/revenue/margin) per D-01 — PRIX-02 forbids showing the *price of the solution*, not value expressed in currency
- Did not touch the pre-existing `no-html-link-for-pages` ESLint findings (26 occurrences codebase-wide, including the untouched breadcrumb `<a href="/services">` at the top of this same file) — a systemic, pre-existing convention, out of this task's scope per the Scope Boundary rule; the acceptance criterion only required no *unused-variable* error for the file, which is satisfied

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a false-negative in plan-01's D-01 positional test**
- **Found during:** Task 1 verification (`vitest run src/app/calculateur-roi/page.test.ts`)
- **Issue:** The test's "nearest preceding roi-card class" check used `precedingSource.lastIndexOf('roi-card')` — a bare substring search. Since `roi-card-label` (a legitimate, unrelated CSS class that must sit inside the promoted card per this plan's own Task 1 step 7 and 08-UI-SPEC.md Section Spec 8) also starts with the literal characters `roi-card`, the substring search always matched inside `roi-card-label` instead of the intended `roi-card roi-card-main` wrapper class — making the assertion fail regardless of implementation correctness.
- **Fix:** Replaced the bare substring search with a whole-token regex match (`/\broi-card(?!-)/g`) that excludes prefix matches like `roi-card-label`/`roi-card-note`/`roi-card-bonus`, preserving the test's original intent (verify the capacity card itself carries the `-main` styling) without weakening the assertion.
- **Files modified:** `src/app/calculateur-roi/page.test.ts`
- **Verification:** `npx vitest run src/app/calculateur-roi/page.test.ts` — 28/28 tests pass, including the fixed assertion
- **Committed in:** `2cb8703` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 test-bug fix)
**Impact on plan:** No scope creep — the fix only corrects a test's own matching logic to reflect its stated intent; it does not weaken, remove, or add any coverage. All other plan-01 guard assertions (mainOccurrences count, FORBIDDEN/REQUIRED token lists, D-02 CTA check) are untouched.

## Issues Encountered
- `npm run build` fails during unrelated `/api/crm/products` and `/api/crm/stock` page-data collection with `Error: supabaseUrl is required.` — this worktree has no `.env.local`, a pre-existing environment gap already documented in `.planning/phases/08-landing-simplification-pricing-policy/deferred-items.md` by plan 08-01 (PROJECT.md forbids touching CRM API routes, and this plan's changes don't touch that code path). TypeScript compilation itself succeeded (`✓ Compiled successfully`) before the unrelated CRM route error, confirming this plan's changes are type-correct and buildable.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness
- Both plan-01 guard files for this plan (`layout.test.ts`, `calculateur-roi/page.test.ts`) are green; `npm run test` confirms zero regressions outside the already-known RED-by-design `translations.test.ts`/`page.test.ts` failures owned by plans 03/05/06
- PRIX-02 (`/calculateur-roi` price-free) and PRIX-01's structured-data clause (`priceRange` gone site-wide) are both closed
- No blockers for plan 03 (landing problems/services copy) or plan 06 (final page-composition verification)

---
*Phase: 08-landing-simplification-pricing-policy*
*Completed: 2026-09-21*

## Self-Check: PASSED

- FOUND: src/app/calculateur-roi/page.tsx
- FOUND: src/app/calculateur-roi/page.test.ts
- FOUND: src/app/layout.tsx
- FOUND: commit 2cb8703 (Task 1)
- FOUND: commit ce9621a (Task 2)
