---
phase: 17-admin-forecast-dashboard
plan: 12
subsystem: admin-ui
tags: [nextjs, rsc, pilotage, dashboard, validation]
requires:
  - phase: 17-07
    provides: loadPilotageRows, buildPilotageView
  - phase: 17-08
    provides: PilotageKpis, TreasuryChart
  - phase: 17-09
    provides: SourceTable, ProjectMarginTable, DetailPanel
  - phase: 17-11
    provides: costs page
provides:
  - /admin/pilotage dashboard page (period, HT/TTC, tests toggle via GET form)
  - cross-links between dashboard and costs page
  - 17-VALIDATION.md signed off
affects: [17-13, 17-14]
key-files:
  created: [src/app/admin/pilotage/page.tsx, src/app/admin/pilotage/pilotagePage.test.ts]
  modified: [src/app/admin/pilotage/couts/page.tsx, src/components/admin/pilotage/TreasuryChart.tsx, src/components/admin/pilotage/coutsUi.test.ts, .planning/phases/17-admin-forecast-dashboard/17-VALIDATION.md]
decisions:
  - "Chart geometry helper renamed chartGeometry.ts to avoid a case-only clash with TreasuryChart.tsx"
metrics:
  completed: 2026-10-07
---

# Phase 17 Plan 12: Dashboard page Summary

RSC page /admin/pilotage: requireAdmin first, whitelisted params, RLS reads, view recomputed per request, with period/base/tests controls, test and anomaly warnings, empty and "Chiffres indisponibles" states (no figure on a failed read), KPIs, source table, project margin table, drill-down panel and cash curve; links to and from the costs page.

## Commits
- Task 1: feat(17-12) dashboard page + source guard test (page and pilotagePage.test.ts)
- Task 2: feat(17-12) back link, helper rename, validation sign-off

## Verification
- `npm test`: 185 files, 2162 tests passed. `tsc --noEmit` clean. Lint 0 errors (9 pre-existing warnings). `next build` OK, routes /admin/pilotage and /admin/pilotage/couts listed.
- All 8 Wave 0 files exist; 17-10-SUMMARY records the RLS suite green (284 tests). 17-VALIDATION.md: nyquist_compliant true, wave_0_complete true, status approved, 9 boxes ticked, approval recorded.
- No Supabase project touched, nothing deployed.

## Deviations from Plan
1. [Rule 3 - Blocking] `treasuryChart.ts` (17-08) and `TreasuryChart.tsx` differ only by case; on Windows tsc raised TS1192/TS1149 once the page imported the component. Renamed helper and its test to `chartGeometry.ts` / `chartGeometry.test.ts` (git mv), updated the import.
2. [Rule 1] The 17-11 guard in `coutsUi.test.ts` asserted the costs page had no `href="/admin/pilotage"`; now that the route exists and the back link is required, the assertion was inverted to expect it.
- No change to linkAudit.test.ts or priceScope.test.ts allow-lists was needed.
- Requirements ADM-03/04/05 not marked complete (left to the phase verifier).

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
