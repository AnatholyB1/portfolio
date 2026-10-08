---
phase: 19-ads-preparation
plan: 09
subsystem: admin
tags: [funnel, leads, utm, d-04]
requires: []
provides:
  - "FunnelRow.nonconformingLeads, attachNonconforming, monthEndExclusive"
  - "Hors convention badge in funnel Source cell and admin leads list"
affects: [admin funnel, admin leads]
key-files:
  modified:
    - src/lib/admin/funnel.ts
    - src/lib/admin/funnel.test.ts
    - src/components/admin/funnel/FunnelTable.tsx
    - src/app/admin/entonnoir/page.tsx
    - src/components/admin/leads/LeadsTable.tsx
    - src/app/admin/leads/page.tsx
    - src/components/admin/leads/leadsUi.test.ts
decisions:
  - "Count read directly from sv_leads via RLS client; sv_funnel_v untouched (Pitfall 6)"
metrics:
  completed: 2026-10-08
  tasks: 2
---

# Phase 19 Plan 09: Off-convention visibility Summary

Funnel shows a per-row "Hors convention (n)" badge plus a period summary line, and the leads list shows a "Hors convention" badge, all via the admin RLS client with no view or column changes.

## Commits
- e85f89d: funnel helper, badge, summary
- Task 2 commit: leads list badge (see git log)

## Deviations from Plan
None. Task 1 was committed as a single commit (tests and code together) rather than separate RED/GREEN commits.

## Verification
vitest on src/lib/admin, src/components/admin, src/app/admin: 340 passed. tsc --noEmit clean.

## Known Stubs
None.

## Self-Check: PASSED
