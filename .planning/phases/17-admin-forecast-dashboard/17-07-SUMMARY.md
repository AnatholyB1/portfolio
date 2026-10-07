---
phase: 17-admin-forecast-dashboard
plan: 07
subsystem: pilotage
tags: [rls, loader, view-model, drill-down, concordance, vitest]
requires: ["17-01", "17-02", "17-03", "17-04", "17-05"]
provides:
  - "load.ts: PilotageLoadError, loadPilotageRows, loadCostsRegister and granted-column constants (RLS only)"
  - "dashboard.ts: buildPilotageView, PilotageView contract, DETAIL_PAGE_SIZE"
affects: [17-08, 17-09, 17-10, 17-12]
tech-stack:
  added: []
  patterns: ["paginated readAll with 20-page cap", "detail rows are the tile items (Sum rows = tile)", "grant guard extended to new loader"]
key-files:
  created:
    - src/lib/server/pilotage/load.ts
    - src/lib/server/pilotage/load.test.ts
    - src/lib/server/pilotage/dashboard.ts
    - src/lib/server/pilotage/dashboard.test.ts
  modified:
    - src/lib/server/invoices/columnGrants.test.ts
key-decisions:
  - "Payment journal read through the RLS client on its six granted columns; no service_role anywhere in load.ts"
  - "Project table lists a project when any of signed, invoiced, collected, costs or lifetime remaining is non-zero, so the remaining-to-invoice tile equals the sum of its lines"
  - "Composed realized-margin detail lists payments (positive) then paid costs (negative), each sorted by date desc"
requirements-completed: []
duration: 25min
completed: 2026-10-07
---

# Phase 17 Plan 07: Pilotage loader and dashboard view model Summary

RLS-only paginated loaders with typed failure, plus one pure view builder delivering every dashboard figure with drill-down rows that reconcile to the tiles.

## Tasks

| Task | Commit |
|------|--------|
| 1 load.ts, load.test.ts, columnGrants guard | bdd2f44 |
| 2 dashboard.ts, dashboard.test.ts | 14355ab |

124 Vitest tests pass under src/lib/server/pilotage; columnGrants guard passes with load.ts (11 RLS selects found); tsc reports no pilotage errors.

## Deviations from Plan

- TDD commits were not split into separate RED and GREEN commits: each task was committed once with tests and implementation together (tests passed on the first run). Behavior matches the plan.
- Guard: concatenating the three extra migrations broke no pre-existing FILES entry.

## Known Stubs

None.

## Self-Check: PASSED
