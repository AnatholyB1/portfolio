---
phase: 17-admin-forecast-dashboard
plan: 10
subsystem: testing
tags: [rls, concordance, append-only, supabase-branch, vitest]
requires:
  - phase: 17-06
    provides: branch sv-rls-p17 and RLS helpers
  - phase: 17-07
    provides: loadPilotageRows and buildPilotageView
provides:
  - tests/rls/pilotage.rls.test.ts (12 tests) proving append-only, admin-only, RPC codes and dashboard concordance on real Postgres
affects: [17-13, 17-14]
key-files:
  created: [tests/rls/pilotage.rls.test.ts]
decisions:
  - "Raw SQL for concordance is sent as single-line statements (supabase db query through a shell does not accept multi-line SQL)"
metrics:
  completed: 2026-10-07
---

# Phase 17 Plan 10: Pilotage RLS and concordance suite Summary

12 tests green on branch sv-rls-p17 (production ref never touched, migration file unchanged so the 17-06 sha256 stays valid).

## Task 1 (commit ee64bf7)
Append-only and isolation: update, delete and truncate refused on the three tables; direct insert refused for service_role and an admin; non-admin and anon read zero rows; the five RPCs refuse non-admin and anon (permission denied); all sv_* validation codes asserted; series versioning keeps one series_id; test 'arrêt dans le mois de début' passes (stop dated the 1st of the start month, second stop returns sv_series_already_stopped).

## Task 2
Through the admin's own RLS client (no createSupabaseAdminClient, grep count 0): 'concordance facturé', 'concordance encaissé' (paid minus capped max refunded, Paris dates), 'séries de test' (TFA invoice present with tests=1, absent by default, paging through all detail pages) and 'correction de source' (100000 moved from the old source row to the corrected one, totals equal the signed tile).

## Verification
- `npm run test:rls -- tests/rls/pilotage.rls.test.ts`: 12/12 passed.
- `npm run test:rls`: 21 files, 284 tests all passed (the known sv_claim_due_mail failure did not occur in this run).

## Deviations from Plan
- [Rule 3] The real project needed `reachAcceptanceSigned` (final invoice requires acceptance); the test-client project only needs `reachContractSigned`.
- [Rule 1] Multi-line SQL failed through dbQuery; the raw collected query was collapsed onto one line.
- No migration defect found.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
