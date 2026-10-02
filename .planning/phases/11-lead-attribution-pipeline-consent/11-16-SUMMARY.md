---
phase: 11-lead-attribution-pipeline-consent
plan: 16
subsystem: admin
tags: [funnel, admin-ui, rls, cost-per-rdv]

requires:
  - phase: 11-09
    provides: saveCostAction, ADMIN_COPY cost strings
  - phase: 11-13
    provides: AdminNav, admin leads styles
provides:
  - /admin/entonnoir page (RLS read of sv_funnel_v, grouping, month range)
  - pure helpers groupFunnelRows, conversionRate, formatEuroCents, averageCostPerRdv, monthRange
  - FunnelKpis, FunnelTable, CostEditor, funnel.css
affects: [11-18]

key-files:
  created:
    - src/lib/admin/funnel.ts
    - src/lib/admin/funnel.test.ts
    - src/app/admin/entonnoir/page.tsx
    - src/components/admin/funnel/FunnelKpis.tsx
    - src/components/admin/funnel/FunnelTable.tsx
    - src/components/admin/funnel/CostEditor.tsx
    - src/components/admin/funnel/funnel.css

key-decisions:
  - "Cost editor is only offered in the combined view; grouped views show a dash since cost is keyed by source+campaign+month"
  - "Headline KPIs are computed from the ungrouped rows so they do not change with the grouping"
  - "CostEditor closes on success by deriving from action state change, avoiding setState in an effect"

requirements-completed: [LEAD-08]

duration: 15min
completed: 2026-10-02
---

# Phase 11 Plan 16: Admin Funnel Summary

**/admin/entonnoir shows visits to signed per source/campaign/month from sv_funnel_v with stage conversion rates, headline KPIs and an inline cost-per-RDV editor.**

## Tasks
1. Pure funnel helpers + tests - 19c490b
2. Page, KPIs, table, cost editor, CSS - f0b79e8

## Verification
vitest (src/lib/admin, src/app/admin, privateShells, priceScope): 9 files, 102 tests pass. `tsc --noEmit`, eslint on touched paths and `npm run build` clean. No remote commands.

## Deviations from Plan
- Task 1 RED and GREEN were committed together as one feat commit (tests and implementation written together; tests verified passing).
- Visual/browser verification not performed; left to plan 11-18.

## Known Stubs
None.

## Self-Check: PASSED
