---
phase: 08-landing-simplification-pricing-policy
plan: 01
subsystem: testing
tags: [vitest, i18n, source-string-audit, regression-guard, translations, jsonld]

# Dependency graph
requires:
  - phase: 06-service-pages-template-content
    provides: src/data/services.ts (9-service data spine, slug/index join keys) and the readFileSync + .not.toContain source-string audit pattern in src/data/services.test.ts
  - phase: 07-diagnostic-simulator
    provides: PRICE_PATTERN/SIMU_PRICE_PATTERN regex constants and collectStringLeaves helper already in src/lib/translations.test.ts
provides:
  - Wave 0 regression guards for all of Phase 8's requirements (PRIX-01, PRIX-02, LANDING-01, LANDING-02, LANDING-03), deliberately RED where the underlying production code hasn't shipped yet
  - Exact failing-test-name manifest (55 tests) that plans 02-06 must turn green, one by one
affects: [08-02-calculateur-roi, 08-03-landing-problems-services-copy, 08-04-services-preview-fonctionnement-enjeux, 08-05-phoneagent-teaser-realisations-bridge, 08-06-page-composition-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Source-string audit via readFileSync(new URL(relative, import.meta.url), 'utf8') for client/server components that can't be imported under environment:'node' (mirrors src/data/services.test.ts)"
    - "readIfExists() wrapper returning '' on ENOENT so Vitest collection never crashes on files a later plan hasn't created yet"
    - "Local structural type + 'as unknown as Partial<T>' cast to assert against translation keys not yet declared on the Translations interface, avoiding both tsc failures and 'any'"

key-files:
  created:
    - src/app/layout.test.ts
    - src/app/calculateur-roi/page.test.ts
    - src/app/page.test.ts
    - .planning/phases/08-landing-simplification-pricing-policy/deferred-items.md
  modified:
    - src/lib/translations.test.ts

key-decisions:
  - "Kept the euro-value exception (D-01) explicit in calculateur-roi/page.test.ts's FORBIDDEN list — no blanket '€' ban, matching 08-CONTEXT.md D-01 over 08-VALIDATION.md/08-RESEARCH.md's superseded suggestion"
  - "ALLOWED_HREFS/ALLOWED_HREF_PREFIXES/SLUG_TEMPLATE_HREF in page.test.ts encode D-11 (class B exceptions) and D-12 (class C service-preview links) verbatim, not a literal simulateur/contact-only check"
  - "Logged the pre-existing 'npm run build' Supabase-env failure to deferred-items.md instead of fixing it — out of scope (CRM API routes are explicitly untouchable per PROJECT.md) and unrelated to this plan's test-only file changes"

patterns-established:
  - "Every new Phase 8 test file for a not-yet-existing production file uses readIfExists()/try-catch around readFileSync, never a bare import, to keep collection green across the whole phase"

requirements-completed: [PRIX-01, PRIX-02, LANDING-01, LANDING-02]

# Metrics
duration: 45min
completed: 2026-09-21
---

# Phase 8 Plan 1: Wave 0 Regression Guards Summary

**Four Vitest source-string/JSON audit files (one extended, three new) encoding PRIX-01, PRIX-02, LANDING-01 and LANDING-02 as 55 currently-failing assertions that plans 02-06 turn green one at a time.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-09-21T19:45:00Z
- **Completed:** 2026-09-21T20:05:00Z
- **Tasks:** 3
- **Files modified:** 4 (1 extended, 3 created), plus 1 deferred-items note

## Accomplishments
- Extended `src/lib/translations.test.ts` with a `translations.landing + translations.services — Phase 8 pricing policy (PRIX-01)` describe block asserting the full target shape of `t.landing.problems/servicesPreview/method/enjeux/work.bridge_*`, the trimmed `t.landing.phone`, and the 01/07..07/07 section-counter sequence
- Created `src/app/layout.test.ts` asserting `priceRange` is gone from the global JSON-LD (D-09) while `ProfessionalService`/`areaServed`/`openingHours` survive
- Created `src/app/calculateur-roi/page.test.ts` with a 17-token FORBIDDEN list, a 9-token REQUIRED list, the D-02 CTA-destination check, and a D-01 "roi-card-main belongs to the capacity card" positional check
- Created `src/app/page.test.ts` with the LANDING-01 section-order assertion, the LANDING-02 CTA allowlist (encoding D-11/D-12's class B/C exceptions) across 9 landing components, and the ServicesPreview data-driven-cards contract
- Confirmed `rtk npm run test` (full suite) fails with exactly 55 failures, all confined to the 4 Phase 8 test targets — every Phase 5/6/7 test still passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend translations.test.ts with the PRIX-01 landing/services guards and the new-key shape contract** - `e9063d2` (test)
2. **Task 2: Source-string audits for the global JSON-LD and the ROI calculator** - `424e50b` (test)
3. **Task 3: Landing composition and CTA-destination guard** - `03cb3f4` (test)

_Note: this is a test-only plan — no feat/fix commits; all three tasks are `test(08-01):` commits by design._

## Files Created/Modified
- `src/lib/translations.test.ts` - extended with the Phase 8 PRIX-01 landing/services describe block (structural type + `landingOf` helper, no `any`)
- `src/app/layout.test.ts` - new, `global JSON-LD (PRIX-01)` describe, source-string audit of `layout.tsx`
- `src/app/calculateur-roi/page.test.ts` - new, `calculateur-roi source audit (PRIX-02)` describe, FORBIDDEN/REQUIRED token lists + D-01/D-02 checks
- `src/app/page.test.ts` - new, three describes (`landing composition`, `landing CTA destinations`, `ServicesPreview cards`) covering LANDING-01/02/03
- `.planning/phases/08-landing-simplification-pricing-policy/deferred-items.md` - new, documents the pre-existing Supabase-env `npm run build` failure

## Decisions Made
- Reused `PRICE_PATTERN`/`collectStringLeaves` from the existing `translations.test.ts` verbatim per the plan's explicit instruction not to touch them or add `ราคา`/`prices` alternatives.
- For the D-01 "roi-card-main belongs to the capacity card" check, used a nearest-preceding-class-token technique (documented inline) rather than parsing JSX, matching the plan's `<action>` guidance.
- Used `readIfExists()` (try/catch around `readFileSync`) everywhere a referenced production file does not exist yet, so collection never throws for files plans 02-06 haven't created.

## Deviations from Plan

None — plan executed exactly as written. One out-of-scope, pre-existing issue was discovered and documented (not fixed) per the SCOPE BOUNDARY rule:

### Deferred (not auto-fixed — out of scope)

**1. `npm run build` fails during page-data collection on `/api/crm/products` (missing Supabase env vars)**
- **Found during:** Task 1 self-check (`npm run build` acceptance criterion)
- **Issue:** This worktree has no `.env.local`; `next build` compiles and typechecks successfully ("Compiled successfully") but then throws `Error: supabaseUrl is required.` while collecting page data for an unrelated CRM API route.
- **Why not fixed:** PROJECT.md explicitly forbids changes to `src/app/api/crm/*` routes, and none of this plan's file changes touch that code path — this is an environment/secrets provisioning gap in the worktree, not a code regression.
- **Documented in:** `.planning/phases/08-landing-simplification-pricing-policy/deferred-items.md`

---

**Total deviations:** 0 auto-fixed, 1 logged-and-deferred (out of scope, environment gap)
**Impact on plan:** None on this plan's deliverables — TypeScript compilation (the actual concern for test-file correctness) passed cleanly in every `npm run build` run during this plan.

## Issues Encountered
None beyond the deferred build-environment item above.

## User Setup Required

None - no external service configuration required for this plan's test-only changes. (The pre-existing Supabase env-var gap noted above is a phase/repo-level environment concern, not something this plan introduces or requires to complete.)

## Known Stubs

None. This plan produces test files only; there are no components rendering placeholder/empty data.

## Exact Failing Test Manifest (55 tests, RED by design)

Later plans must turn these green in the order noted (03/05/02/04/06). Captured via `rtk npm run test` at plan end:

**`src/app/layout.test.ts` (1 failure — turns green in plan 02):**
- `global JSON-LD (PRIX-01) > PRIX-01: does not declare a priceRange field anywhere in the source (D-09)`

**`src/app/calculateur-roi/page.test.ts` (19 failures — turn green in plan 02):**
- `PRIX-02: does not contain the forbidden token "prixMensuel"`
- `PRIX-02: does not contain the forbidden token "setup"`
- `PRIX-02: does not contain the forbidden token "Setup"`
- `PRIX-02: does not contain the forbidden token "Prix mensuel"`
- `PRIX-02: does not contain the forbidden token "coûte"`
- `PRIX-02: does not contain the forbidden token "ratioSocle"`
- `PRIX-02: does not contain the forbidden token "ratioTotal"`
- `PRIX-02: does not contain the forbidden token "amortissementMois"`
- `PRIX-02: does not contain the forbidden token "amortLabel"`
- `PRIX-02: does not contain the forbidden token "amortNeg"`
- `PRIX-02: does not contain the forbidden token "gainNetSocle"`
- `PRIX-02: does not contain the forbidden token "fmtMult"`
- `PRIX-02: does not contain the forbidden token "roi-mult"`
- `PRIX-02: does not contain the forbidden token "roi-amort"`
- `PRIX-02: does not contain the forbidden token "roi-claim"`
- `PRIX-02: does not contain the forbidden token "Rentabilisé"`
- `PRIX-02: does not contain the forbidden token "le coût de la solution"`
- `D-02: the results CTA still points to /services/agent-vocal-ia`
- `D-01: the sole "roi-card roi-card-main" occurrence belongs to the promoted capacity card`

**`src/lib/translations.test.ts` new describe (23 failures — turn green mostly in plan 03, phone-key removal in plan 05):**
- `fr/en/th: t.services contains no pricing language (PRIX-01, RED until plan 03 removes hero/offers/maintenance)` ×3
- `fr/en/th: t.landing.problems exists with the full Phase 8 shape, 3-4 items (RED until plan 03)` ×3
- `fr/en/th: t.landing.servicesPreview exists with num/title_l1/title_l2_it/intro (RED until plan 03)` ×3
- `fr/en/th: t.landing.method exists with 3-4 steps (RED until plan 03)` ×3
- `fr/en/th: t.landing.enjeux exists with 3-4 points (RED until plan 03)` ×3
- `fr/en/th: t.landing.work gains bridge_title_l1/bridge_title_it/bridge_body (RED until plan 03)` ×3
- `fr/en/th: t.landing.phone no longer declares the removed teaser keys (RED until plan 05)` ×3
- `th: t.landing.phone still declares the surviving teaser keys, non-empty` (pre-existing empty `title_l2` in `th` locale — surfaces as part of the plan-05 phone-trim work)
- `section counter integrity: manifeste/problems/servicesPreview/method/enjeux/work/contact are 01/07..07/07 in order, in every locale (RED until plans 03/05)`
- `th: every string leaf under t.landing is non-empty after trimming` (same pre-existing `th.landing.phone.title_l2` empty-string issue)

**`src/app/page.test.ts` (12 failures — turn green across plans 04/05/06):**
- `landing composition (LANDING-01) > src/app/page.tsx contains every required section marker` (plan 06)
- `landing composition (LANDING-01) > the section markers appear in the exact LANDING-01 order` (plan 06)
- `landing CTA destinations (LANDING-02) > HeroSection.tsx: every href resolves to an allowed Class A/B/C destination` (plan 06, hero CTA repoint)
- `landing CTA destinations (LANDING-02) > Realisations.tsx: every href resolves to an allowed Class A/B/C destination` (plan 05, bridge rewrite)
- `landing CTA destinations (LANDING-02) > PhoneAgent.tsx: every href resolves to an allowed Class A/B/C destination` (plan 05, teaser trim)
- `landing CTA destinations (LANDING-02) > HeroSection.tsx: contains none of the dead/superseded destinations` (plan 06)
- `landing CTA destinations (LANDING-02) > Realisations.tsx: contains none of the dead/superseded destinations` (plan 05)
- `landing CTA destinations (LANDING-02) > PhoneAgent.tsx: contains none of the dead/superseded destinations` (plan 05)
- `ServicesPreview cards (LANDING-01) > imports services from @/data/services` (plan 04)
- `ServicesPreview cards (LANDING-01) > is data-driven via a services.map( call` (plan 04)
- `ServicesPreview cards (LANDING-01) > builds hrefs from the /services/ template prefix plus the slug expression` (plan 04)

Note: `th: t.landing.phone still declares the surviving teaser keys, non-empty` and `th: every string leaf under t.landing is non-empty after trimming` both fail today for the same underlying reason — `translations.ts`'s Thai `landing.phone.title_l2` is currently an empty string, a pre-existing data-quality gap unrelated to any Phase 8 decision. It surfaces here as a byproduct of the new leaf-emptiness/phone-shape guards; whichever plan next touches `t.landing.phone` in the `th` locale (plan 05) should populate this field.

## Next Phase Readiness
- All four Wave 0 test files collect cleanly (`rtk npx vitest list` exits 0 across all four) and the full suite fails with exactly 55 failures, 100% confined to these four files — no Phase 5/6/7 regression.
- Plan 02 (calculateur-roi + layout) can proceed immediately: `rtk npx vitest run src/app/layout.test.ts src/app/calculateur-roi/page.test.ts` is the plan's own scoped verify command.
- Plans 03/05 share ownership of the `translations.test.ts` new describe block; plan 03 filters on `-t "Phase 8 pricing policy"` per the plan's contractual describe name.
- Plan 06 gates on `page.test.ts`'s `landing composition (LANDING-01)` describe remaining green after the full re-sequencing lands.
- No blockers. The one flagged item (`th.landing.phone.title_l2` empty string) is a small, pre-existing content gap for plan 05 to close while it's already editing that locale block, not a blocker for plan 02.

---
*Phase: 08-landing-simplification-pricing-policy*
*Completed: 2026-09-21*

## Self-Check: PASSED

- FOUND: src/lib/translations.test.ts
- FOUND: src/app/layout.test.ts
- FOUND: src/app/calculateur-roi/page.test.ts
- FOUND: src/app/page.test.ts
- FOUND: .planning/phases/08-landing-simplification-pricing-policy/deferred-items.md
- FOUND: commit e9063d2 (Task 1)
- FOUND: commit 424e50b (Task 2)
- FOUND: commit 03cb3f4 (Task 3)
