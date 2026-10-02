---
phase: 11-lead-attribution-pipeline-consent
plan: 09
subsystem: admin
tags: [leads, server-actions, zod, rpc, requireAdmin, vitest]

requires:
  - phase: 11-04
    provides: sv_set_lead_status, sv_correct_lead_source, sv_erase_lead, sv_mark_return_seen RPCs
  - phase: 11-05
    provides: sv_upsert_acquisition_cost RPC
provides:
  - src/lib/admin/leadLabels.ts (FR labels, closed lists, ADMIN_COPY)
  - src/lib/admin/leadSchemas.ts (statusSchema, lostSchema, correctionSchema, eraseSchema, costSchema)
  - src/lib/server/leads/admin.ts (5 service_role RPC wrappers)
  - src/app/admin/leads/actions.ts (5 guarded actions)
  - src/app/admin/entonnoir/actions.ts (saveCostAction)
affects: [11-13, 11-15, 11-16]

key-files:
  created:
    - src/lib/admin/leadLabels.ts
    - src/lib/admin/leadLabels.test.ts
    - src/lib/admin/leadSchemas.ts
    - src/lib/server/leads/admin.ts
    - src/app/admin/leads/actions.ts
    - src/app/admin/leads/actions.test.ts
    - src/app/admin/entonnoir/actions.ts
    - src/app/admin/entonnoir/actions.test.ts

key-decisions:
  - "Closed lists are guarded by a test that parses the migration SQL check constraints"
  - "setStatusAction refuses 'lost'; Perdu only via markLostAction (reason required)"
  - "costSchema lowercases source and campaign to match sv_visit_counts normalisation"
  - "Erase reads contact_email through the RLS client from sv_leads_admin_v, never service_role"

requirements-completed: [LEAD-02, LEAD-03, LEAD-07, LEAD-08]

duration: 10min
completed: 2026-10-02
---

# Phase 11 Plan 09: Admin Lead Write Path Summary

**Admin mutation layer for leads and funnel cost: FR labels and closed lists synced with the DB, zod schemas, server-only RPC wrappers, and requireAdmin-first server actions, all unit-tested with mocks.**

## Tasks
1. Labels, schemas, RPC wrappers - 4898458
2. Lead and cost server actions with tests - 93204dc

## Verification
`npx vitest run src/lib/admin src/app/admin src/lib/priceScope.test.ts`: 7 files, 69 tests pass. `tsc --noEmit` and eslint clean on touched paths. 5 `rpc('sv_` calls in admin.ts. No migration applied, no remote commands.

## Deviations from Plan
None. Extra additions: ADMIN_COPY.eraseConfirmMismatch, eraseSuccess and returnSeenSuccess strings (not in UI-SPEC table; the UI plans may adjust wording).

## Known Stubs
None.

## Self-Check: PASSED
