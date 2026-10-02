---
phase: 11-lead-attribution-pipeline-consent
plan: 01
subsystem: testing
tags: [supabase, rls, vitest, branch]
requires: []
provides:
  - Supabase test branch sv-rls-p11 with .env.test.local (gitignored)
  - RLS helpers uniqueEmail, makeLeadViaRpc, backdateLead
  - Scaffolds leads.rls.test.ts and consent.rls.test.ts (it.todo)
affects: [11-04, 11-10, 11-14, 11-17]
key-files:
  created: [tests/rls/leads.rls.test.ts, tests/rls/consent.rls.test.ts]
  modified: [tests/rls/helpers.ts]
requirements-completed: [LEAD-02, LEAD-03, LEAD-04, LEAD-06, LEAD-08, LEAD-09]
completed: 2026-10-02
---

# Phase 11 Plan 01: Test branch and RLS scaffolds Summary

Throwaway branch `sv-rls-p11` provisioned with owner approval, lead RLS helpers and two todo scaffolds committed, phase-10 baseline green (50 passed, 15 todo) on the branch.

## Task 1: helpers and scaffolds

Commit e3b062a. `uniqueEmail`, `makeLeadViaRpc` (calls `sv_ingest_lead` with the contract keys, throws on error), `backdateLead` (updates only `last_contact_at`), cleanup note on immutable lead data. Existing exports unchanged. tsc reports no error under tests/rls.

## Task 2: owner decision (verbatim)

Owner answer obtained before any branch command: **"Créer la branche (Recommended)"**, i.e. `approve`, 2026-10-02. No branch command beyond the read-only `branches list` ran before that answer.

## Task 3: branch and baseline

- Branch `sv-rls-p11`, branch ref `ywdfkwysihglnogazybs`, parent `ubxllsvanurkwkohzxau`, created 2026-10-02T17:36:45Z, status FUNCTIONS_DEPLOYED.
- `.env.test.local` written (SV_TEST_ALLOW=1, URL, publishable key, service-role key, DB URL, project ref); `git check-ignore` prints the file; URL does not contain the prod ref. Not committed. Secrets never printed.
- The branch already had `sv_clients` (repo migrations applied by branching), so no `migration repair` was needed. `sv_leads` is NOT present on the branch: the 11-04 migration (20261003000000_sv_leads_core.sql) has not been applied yet, so this is a true pre-phase-11 baseline. Later plans must push it to the branch with `db push --db-url` before running lead suites.
- Branch-only fixture applied: `grant select, insert, update, delete on public.gecko_admins to service_role`. First baseline run failed without it (`permission denied for table gecko_admins`), passed after.
- `npm run test:rls`: 4 files passed, 2 skipped (todo scaffolds), 50 tests passed, 15 todo.
- Only `branches list/create/get` targeted the prod ref.

## Deviations from Plan

None in code. Operational note: the first status-poll loop used `-o json` incorrectly and printed empty status for 30 iterations (about 8 minutes wasted); status was then confirmed through `branches list`. The branch bills hourly until deletion in plan 11-17.

## Known Stubs

None (it.todo scaffolds are intentional, filled by 11-10 and 11-14).

## Self-Check: PASSED

Commit e3b062a present; helpers and both scaffolds exist; `.env.test.local` ignored and untracked.
