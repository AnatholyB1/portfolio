---
phase: 17-admin-forecast-dashboard
plan: 01
subsystem: database
tags: [postgres, supabase, rls, append-only, migration-lint]
requires:
  - phase: 15
    provides: sv_private.deny_mutation, sv_private.is_admin, append-only table conventions
provides:
  - sv_recurring_costs, sv_project_costs, sv_cash_balances (append-only, admin-read)
  - five service_role insert RPCs (add/stop recurring cost, add/void project cost, add cash balance)
  - static lint test for the migration
affects: [17-06, 17-13, cost loaders, cost server actions]
tech-stack:
  added: []
  patterns: [version rows instead of updates, void rows for corrections, month-granularity latest-version ordering]
key-files:
  created:
    - supabase/migrations/20261009000000_sv_pilotage.sql
    - src/lib/pilotageMigration.test.ts
  modified:
    - src/lib/migrationLint.test.ts
key-decisions:
  - "Latest recurring-cost version ordered by (date_trunc month of starts_on, id) so same-month stops win"
  - "Migration has no begin/commit; 17-13 wraps it in an explicit envelope"
metrics:
  tasks: 2
  files: 3
  completed: 2026-10-07
---

# Phase 17 Plan 01: Pilotage migration Summary

Three append-only admin tables (recurring costs, project costs, cash balances) with admin-only RLS, deny_mutation triggers and five service_role-only insert RPCs, guarded by a static lint test written first.

## Tasks

| Task | Commit | Description |
| ---- | ------ | ----------- |
| 1 | 788d817 | RED lint test, APPEND_ONLY_TABLES extended |
| 2 | a3a922d | Migration written, lint green (40 tests) |

## Deviations from Plan

None - plan executed as written. The migration was not applied to any Supabase project (17-06 / 17-13 own that).

## Known Stubs

None.

## Self-Check: PASSED
