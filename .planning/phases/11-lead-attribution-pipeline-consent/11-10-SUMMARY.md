---
phase: 11-lead-attribution-pipeline-consent
plan: 10
subsystem: database-testing
tags: [rls, postgres, supabase-branch, leads, vitest]

requires:
  - phase: 11-01
    provides: RLS test helpers (makeLeadViaRpc, backdateLead, uniqueEmail)
  - phase: 11-04
    provides: sv_leads core migration and RPCs
  - phase: 11-05
    provides: consent/funnel and backfill/purge migrations
provides:
  - Phase-11 schema applied on the throwaway branch sv-rls-p11
  - tests/rls/leads.rls.test.ts (22 integration tests, LEAD-02/03/04/07 + admin read access)
affects: [11-14, 11-17]

key-files:
  modified:
    - tests/rls/leads.rls.test.ts

key-decisions:
  - "TRUNCATE denial is tested with FK-complete table sets so Postgres reaches the BEFORE TRUNCATE trigger (a single-table truncate is refused earlier by the FK check, which would not prove the trigger)"

requirements-completed: [LEAD-02, LEAD-03, LEAD-04, LEAD-07]

duration: 15min
completed: 2026-10-02
---

# Phase 11 Plan 10: Leads integration tests on the branch Summary

Phase-11 migrations applied cleanly to the test branch and 22 real-Postgres tests prove source freeze, immutable journal, tombstone erasure, 9-month dedupe (with a concurrency case), status RPC rules and admin-only reads.

## Task 1: Push migrations (no repo commit, remote-only)

- Seeded one legacy `public.prospects` row on the branch (Legacy Test).
- `db push` first refused (branch history copied from prod with different ids, same as 10-07/A9). Branch-only fix: `migration repair` reverted 9 foreign remote ids and marked 20260920000000 and 20260921000000 applied.
- `db push` then applied 20261003000000_sv_leads_core, 20261003010000_sv_consent_funnel, 20261003020000_sv_leads_backfill_purge with no errors. No migration fix was required.
- Verified on the branch: to_regclass not null for sv_leads, sv_lead_events, sv_consent_log, sv_funnel_v (all true); `sv_leads where source_kind='legacy'` = 1; cron jobs = `sv-purge-leads` only (1 row, `purge-prospects-12mo` gone).
- Static tests `migrationLint` + `leadsMigration`: 12 passed.
- Only the branch ref ywdfkwysihglnogazybs was targeted; prod was never touched.

## Task 2: leads.rls.test.ts (commit 17c3d2c)

- LEAD-02: every frozen column and created_at rejected with sv_source_frozen; short reason gives sv_reason_required; valid correction journals one source_corrected event (from/to) plus a correction_note, and the freeze flag does not leak after the transaction.
- LEAD-03: service_role, authenticated admin and anon cannot update or delete events; TRUNCATE of events and leads (owner connection) fails with sv_immutable_table; erase removes contacts and notes, keeps lead, source and events (+1 erased event), second erase returns erased false; erased leads are never matched by dedupe.
- LEAD-04: case/space e-mail variants and phone match join the same lead (contact_count 2, source unchanged, unseen_return true); after 10 months a new lead with previous_lead_id and lead_linked event; Promise.all of two ingests yields one lead.
- LEAD-07: signed jump fills all four stage timestamps; lost reason closed list; invalid status; same status no-op without event; timestamps write-once; authenticated cannot execute status or ingest RPCs.
- Read access: plain user, client member, Gecko admin and anon read zero rows on all five lead objects; an sv_admins member reads them.
- Results: leads file 22/22 passed; `npm run test:rls` 5 files passed, 72 tests passed, 6 todo (other plans' consent scaffold).

## Deviations from Plan

**1. [Rule 3 - Blocking] Branch migration history repair** — same A9 procedure as 10-07, branch only.

**2. [Rule 1 - Test bug] TRUNCATE assertion** — a single-table truncate fails on the FK check ("cannot truncate a table referenced in a foreign key constraint") before the trigger runs; switched to FK-complete table sets so the trigger is what denies it. No migration bug found.

**3. Secret exposure note** — a first failing run of the TRUNCATE test echoed the command line (including the branch DB password) into the test output because the error message was included in the assertion. The test now never includes `e.message`. The credential belongs to the throwaway branch only; rotating the branch DB password is advisable.

## Known Stubs

None.

## Self-Check: PASSED

- tests/rls/leads.rls.test.ts exists; commit 17c3d2c exists.
