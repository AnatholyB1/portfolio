---
phase: 19-ads-preparation
plan: 01
subsystem: attribution
tags: [utm, attribution, ads, convention]
requires: []
provides:
  - "src/lib/attribution/utm.ts: single UTM rules module (vocabularies, aliases, assessUtm, buildTrackedUrl)"
  - "docs/convention-utm.md: French convention document, drift-guarded by test"
affects: [19-03, 19-04, 19-05, 19-08, 19-10]
tech-stack:
  added: []
  patterns: ["pure module with type-only import from params.ts", "flag never rewrite", "doc-drift test"]
key-files:
  created:
    - src/lib/attribution/utm.ts
    - src/lib/attribution/utm.test.ts
    - docs/convention-utm.md
  modified: []
key-decisions:
  - "assessUtm canonicalises source/medium aliases before checking, so aliases are conformant"
  - "buildTrackedUrl re-checks its output with assessUtm as defence in depth"
requirements-completed: [ADS-01]
duration: 15min
completed: 2026-10-08
---

# Phase 19 Plan 01: UTM rules module Summary

Pure UTM convention module (meta/google/gbp sources, offre_cible_aaaamm campaigns, alias canonicalisation, flag-only assessment, allowlisted link builder) with tests and the French convention doc.

## Tasks

| Task | Commit |
|------|--------|
| 1 and 2: rules module, link builder, convention doc, tests | 3392212 |

## Verification

- `vitest run src/lib/attribution src/lib/priceScope.test.ts`: 5 files, 84 tests pass.
- `tsc --noEmit`: clean.
- Property test: 12 inputs x 3 platforms x 6 paths all yield URLs that parseAttrParams + assessUtm judge conformant, with the site origin.

## Deviations from Plan

**[Process] Tasks 1 and 2 committed together, no separate RED commits.** Tests and implementation were written in the same pass and committed once; the TDD RED-only commit gate was not recorded in git history. Behavior and coverage match the plan.

Otherwise, plan executed as written.

## Known Stubs

None.

## Self-Check: PASSED
