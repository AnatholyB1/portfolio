---
phase: 11-lead-attribution-pipeline-consent
plan: 05
subsystem: database
tags: [supabase, postgres, consent, funnel, retention, pg_cron, migration]

requires:
  - phase: 11-04
    provides: sv_leads core schema, sv_erase_lead, sv_private.deny_mutation
provides:
  - supabase/migrations/20261003010000_sv_consent_funnel.sql (sv_consent_versions seeded, sv_consent_log, sv_log_consent, sv_visit_counts, sv_record_visit, sv_acquisition_costs, sv_upsert_acquisition_cost, sv_funnel_v)
  - supabase/migrations/20261003020000_sv_leads_backfill_purge.sql (sv_private.backfill_legacy_prospects, sv_private.purge_leads, cron swap, single retention table)
  - src/lib/leadsMigration.test.ts (static guards)
affects: [11-07, 11-09, 11-10, 11-12, 11-14, 11-16, 11-17, 11-18]

key-decisions:
  - "Funnel built as union all of per-stage rows grouped by source/campaign/month; reads no PII table so it survives erasure"
  - "Consent log blocks UPDATE via deny_mutation and grants no DELETE; only the owner purge deletes"
  - "Retention table lives in the header of the backfill/purge migration (resolves STATE blocker)"

requirements-completed: [LEAD-06, LEAD-08, LEAD-09, LEAD-01]

duration: 10min
completed: 2026-10-02
---

# Phase 11 Plan 05: Consent, Funnel, Backfill and Purge Summary

**Consent versions (FR/EN/TH seeded verbatim) and append-only consent log, anonymous visit counters, manual cost per RDV, a PII-free funnel view, an idempotent prospects backfill and a rewritten 12/25-month purge replacing the old cron job.**

## Accomplishments
- Migration 1: all tables RLS + admin-only select, RPCs service_role only, sv_funnel_v with security_invoker
- Migration 2: re-runnable backfill (one lead per prospect, source_kind 'legacy', original dates), purge sparing converted/signed leads and never touching accounting, cron `purge-prospects-12mo` swapped for `sv-purge-leads`
- Static test ties the SQL seed to CONSENT_TEXT (mutation of the FR body verified to fail, then reverted)
- 12 tests green (leadsMigration + migrationLint)

## Task Commits
1. Consent/visits/costs/funnel migration: 4856fcc
2. Backfill, purge, cron swap: 0d4f8b3
3. Static migration test: a787096

## Deviations from Plan
None. Migrations were NOT applied to any Supabase project (per instruction); application is in 11-10 / 11-17.

## Known Stubs
None.

## Self-Check: PASSED
