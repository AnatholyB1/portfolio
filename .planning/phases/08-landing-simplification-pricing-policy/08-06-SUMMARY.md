---
phase: 08-landing-simplification-pricing-policy
plan: 06
subsystem: ui
tags: [nextjs, landing-composition, i18n, pricing-policy, phase-gate]

# Dependency graph
requires:
  - phase: 08-landing-simplification-pricing-policy
    plan: 02
    provides: "t.landing.* content and the price-free translations contract this composition renders"
  - phase: 08-landing-simplification-pricing-policy
    plan: 04
    provides: "ServicesPreview.tsx, FonctionnementSection.tsx, EnjeuxSection.tsx"
  - phase: 08-landing-simplification-pricing-policy
    plan: 05
    provides: "HeroSection CTA repoint, reactivated ProblemSection, rewritten Realisations bridge, trimmed PhoneAgent teaser"
provides:
  - "src/app/page.tsx composed in the final LANDING-01 order (Hero, Manifeste, Problems, ServicesPreview, Fonctionnement, Enjeux, Realisations, PhoneAgent, Partners, Contact)"
  - "Phase-wide gate results: full test suite green, TypeScript clean, price-sweep survivors enumerated, pre-existing gaps (build env, lint debt) documented and out-of-scope"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Composition-only integration task — no new component logic, only import + render-order wiring, verified entirely by existing page.test.ts assertions written in plan 01"

key-files:
  created: []
  modified:
    - src/app/page.tsx
    - .planning/phases/08-landing-simplification-pricing-policy/deferred-items.md

key-decisions: []

requirements-completed: []

# Metrics
duration: ~20min (Tasks 1-2 only; Task 3 blocked on human verification)
completed: 2026-09-21
---

# Phase 8 Plan 6: Page Composition & Phase-Wide Gate Summary

**Re-sequenced `src/app/page.tsx` into the final LANDING-01 order (Hero → Manifeste → Problems → ServicesPreview → Fonctionnement → Enjeux → Realisations → PhoneAgent teaser → Partners → Contact) and ran the phase-wide gate: full test suite green (286/286), TypeScript clean, price sweep clean of unexpected matches; plan is now paused at the mandatory human-verification checkpoint (Task 3).**

## Performance

- **Duration:** ~20 min for Tasks 1-2
- **Tasks:** 2 of 3 complete (Task 3 is a blocking human-verify checkpoint, not executable by this agent)
- **Files modified:** 2 (1 source, 1 phase-tracking doc)

## Accomplishments

- `src/app/page.tsx`: added `ProblemSection`, `ServicesPreview`, `FonctionnementSection`, `EnjeuxSection` imports and slotted them into `<main>` in the exact order 08-UI-SPEC.md's composition table mandates. No props passed to any section (each reads its own `useLanguage()` copy). `useReveals()` remains a single call, not duplicated. `Navbar`/`Footer` positions unchanged.
- `rtk npx vitest run src/app/page.test.ts` (actually run via `npx vitest run` — `rtk` wrapper not installed in this worktree, ran the underlying command directly): all 25 tests pass, including the full `landing composition (LANDING-01)`, `landing CTA destinations (LANDING-02)` and `ServicesPreview cards (LANDING-01)` describes.
- `npm run test` (full repository suite): **286/286 tests passing across 16 test files.**
- `npx tsc --noEmit`: clean, zero errors.
- `npm run build`: Turbopack compiles successfully ("Compiled successfully"); the build then fails during "Collecting page data" on `/api/crm/products` with `Error: supabaseUrl is required.` — this is the same pre-existing, already-documented environment gap recorded in `deferred-items.md` since Plan 08-01 (this worktree has no `.env.local`). Not a regression from this plan's `page.tsx` change (`page.tsx` imports no Supabase/CRM code).
- `npm run lint`: 35 errors (1 warning) across 16 files, **none of which is `src/app/page.tsx`** (the only file this plan's Task 1 modified). Newly documented in `deferred-items.md` as pre-existing repo-wide lint debt (`@next/next/no-html-link-for-pages`, `react-hooks/set-state-in-effect`, `react-hooks/immutability`, one `prefer-const`), unrelated to this plan's scope.
- Manual price sweep (`€`, `prix`, `tarif`, `฿`, `ราคา` across `src/app`, `src/components`, `src/lib/translations.ts`): only expected survivors found (enumerated below). Zero matches in `src/components/sections/` or in the `t.landing` block of `translations.ts`.
- `graphify update .`: ran successfully — 171 nodes, 128 edges, 65 communities rebuilt (gitignored output, no working-tree changes).

## Grep-Sweep Survivors (verbatim)

**`src/app/calculateur-roi/page.tsx`** (kept per D-01, ROI calculator legitimately shows euro amounts):
```
27:  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' €';
148:                  suffix="€ / h"
185:                      suffix="€"
```

**`src/lib/translations.ts`** — Thai `ราคา` matches, all inside "we do not give price estimates" sentences (`t.services.pages.items[*].faq` and `t.simulateur`):
```
1883: ...ใบเสนอราคาโดยละเอียดจะส่งภายใน 48 ชั่วโมง... ("a detailed quote will be sent within 48 hours")
1897: ...ใบเสนอราคาภายใน 48 ชั่วโมง... (same "quote within 48h" pattern, Rebranding+Premium page)
1977: ...ใบเสนอราคาภายใน 48 ชั่วโมง... (same pattern, sur-mesure page)
2000: ...การประเมินขอบเขตและใบเสนอราคาจะส่งภายใน 48 ชั่วโมง... (same pattern)
2243: ...รับใบเสนอราคาละเอียด ไม่มีค่าใช้จ่ายแอบแฝง... ("receive a detailed quote, no hidden costs")
2280: ...ไม่มีการประเมินราคาใดๆ เกิดขึ้น ("no price estimate happens at all" — simulateur directAnswer)
2390-2391: "does the diagnostic give a price estimate?" / "No — it identifies key directions... not an amount... giving a price without seeing your business wouldn't make sense" (simulateur FAQ)
```
No `€`, `prix` or `tarif` token (fr/en) exists anywhere in `translations.ts`.

**Test files** (expected, the guards themselves):
```
src/lib/translations.test.ts:11,16,17 — PRICE_PATTERN/SIMU_PRICE_PATTERN regex definitions
src/app/calculateur-roi/page.test.ts — asserts the surviving €/prix figures above
```

No match found in `src/components/sections/`, `src/app/demo/`, `src/app/api/crm/` (out of scope per 08-CONTEXT.md), or anywhere else.

## Task Commits

1. **Task 1: Re-sequence the landing composition** — `1ebf2e0` (feat)
2. **Task 2: Phase-wide gate — full suite, build, manual price sweep, graph refresh** — `37bda77` (docs; task modifies no source file, only records gate results in `deferred-items.md` per the plan's own instruction)

## Files Created/Modified

- `src/app/page.tsx` — added 4 imports, re-sequenced `<main>` children to the final LANDING-01 order
- `.planning/phases/08-landing-simplification-pricing-policy/deferred-items.md` — appended a new entry documenting the 35 pre-existing lint errors found during the phase-wide gate

## Decisions Made

None — Task 1 and Task 2 executed exactly as specified in 08-UI-SPEC.md's composition table and the plan's gate instructions.

## Deviations from Plan

### Auto-fixed Issues

None. This plan's explicit instruction for Task 2 was "fix nothing silently... report the failure with its exact output rather than patching around it" — both the build failure and the lint failures below are reported, not fixed, consistent with that instruction and with the SCOPE BOUNDARY rule (neither failure originates in `src/app/page.tsx`, the only file this plan touched).

### Reported (not fixed) — routed for orchestrator/gap-closure attention

**1. `npm run build` fails during page-data collection on `/api/crm/products`**
- Exact error: `Error: supabaseUrl is required.` inside `src/lib/supabase.ts`
- Root cause: missing `.env.local` in this worktree (`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` unset)
- Pre-existing since Plan 08-01 (see `deferred-items.md`); TypeScript compilation itself is clean, which is the signal Task 1's acceptance criterion cares about
- Not caused by this plan; CRM API routes are explicitly out of scope per PROJECT.md

**2. `npm run lint` reports 35 errors across 16 files**
- None of the 16 files is `src/app/page.tsx`
- Full list and rule breakdown recorded in `deferred-items.md`
- Pre-existing repo-wide lint debt, not introduced by this plan's single-file change

## Issues Encountered

- The `rtk` CLI prefix specified in the plan's verification commands is not installed in this worktree; ran the underlying `npx vitest run` / `npm run test` / `npm run build` / `npm run lint` commands directly. Output content and exit codes are unaffected — only the reporting format differs (no token-count summary).

## User Setup Required

None for Tasks 1-2. Task 3 (blocked) will require the developer to run `npm run dev` and manually verify the 10 checks listed in the plan.

## Known Stubs

None. No new data-fetching or placeholder UI introduced; this plan only reorders existing, fully-wired components.

## Threat Flags

None. This plan introduces no new network endpoint, auth path, file-access pattern or schema change — it only changes render order of existing, already-audited components. T-08-15/T-08-16/T-08-17 from the plan's own threat model are the applicable mitigations and are satisfied by the passing `page.test.ts` CTA-destination suite (T-08-15) and by this summary's per-check tracking obligation for Task 3 (T-08-17); T-08-16 (priceRange in rendered HTML) is Task 3's check 10, not yet run.

## Next Phase Readiness

- Tasks 1-2 are fully complete and committed (`1ebf2e0`, `37bda77`).
- **Task 3 is a blocking `checkpoint:human-verify` gate and has NOT been executed by this agent, per explicit instruction to stop and hand off rather than resolve it.** A developer must run `npm run dev`, walk through the 10 numbered checks in `08-06-PLAN.md`'s Task 3, and record PASS/deviation verdicts in this file before Phase 8 can close.
- Once Task 3's verdicts are recorded, the plan's `<verification>` block (test/build/lint/grep/human sign-off) will be fully satisfiable modulo the two pre-existing, out-of-scope gaps documented above (Supabase env var provisioning for a fully green `npm run build`; the separate lint-cleanup pass for the 35 pre-existing errors).
