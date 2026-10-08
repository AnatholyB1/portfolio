---
phase: 19-ads-preparation
plan: 03
subsystem: database
tags: [supabase, migration, utm, conversions, attribution]
requires:
  - phase: 19-01
    provides: NONCONFORMITY_CODES
  - phase: 19-02
    provides: JOURNAL_EVENT_NAMES, CONVERSION_RANKS, EVENT_NAMESPACE
provides:
  - sv_leads.source_nonconformity / source_raw (frozen with the source)
  - sv_conversion_events append-only journal with trigger emission
  - sv_private.conversion_event_id (uuid v5)
affects: [19-05, 19-06, 19-07, 19-09, 19-10, 19-11]
tech-stack:
  added: []
  patterns: [static SQL tests with TS<->SQL constant parity, trigger-based atomic emission]
key-files:
  created:
    - supabase/migrations/20261011000000_sv_ads_conversions.sql
    - src/lib/adsMigration.test.ts
  modified: []
key-decisions:
  - "Missing lower ranks are emitted on a jump or pre-migration lead using historical stage timestamps"
  - "deal_signed value is NULL (with NULL currency) when no valid chain-head quote exists"
  - "Value regex ^[0-9]{1,15}$ on totalCents guards the bigint cast"
requirements-completed: [ADS-01, ADS-02]
duration: 25min
completed: 2026-10-08
---

# Phase 19 Plan 03: Ads conversions migration Summary

One additive migration freezes the UTM non-conformity flag and raw UTM values with the lead, and adds an append-only conversion journal fed by a trigger on sv_lead_events with deterministic uuid v5 event ids and the signed-quote value. Not applied anywhere (branch in 19-06, production in 19-11).

## Tasks

1. UTM flag columns, capture RPC, frozen-source and correction updates: commit 6b4a958
2. Conversion journal, event_id function, emission trigger: 4e24279

## Details

- sv_ingest_lead keeps its 13-argument signature and revoke/grant lines; the new-lead branch only writes the filtered nonconformity array and the truncated raw object.
- protect_lead_source covers both new columns; sv_correct_lead_source clears the flag in the allow window and journals `cleared_nonconformity` (from/to unchanged).
- sv_leads_admin_v dropped and recreated (security_invoker, same grants).
- Open Question 3: repo search shows sv_set_lead_status is the only writer of sv_leads.status (sv_ingest_lead relies on the column default), so the trigger covers every status change.
- Not touched: sv_set_lead_status, sv_funnel_v, sv_record_visit, sv_mail_outbox.

## Deviations from Plan

None to the migration design. Test authoring needed a retry because of regex escaping (String.raw used), no impact on output.

## Deferred Issues

- Pre-existing failure, unrelated to this plan: `src/lib/pilotageMigration.test.ts > has no internal day-rate column` fails on the base commit (the pilotage migration file matches `tjm` in its header comment). Full suite: 2407 pass, 1 fail (that one).

## Known Stubs

None.

## Threat Flags

None beyond the plan threat model (T-19-06 to T-19-12 mitigations implemented and statically tested).

## Self-Check: PASSED
