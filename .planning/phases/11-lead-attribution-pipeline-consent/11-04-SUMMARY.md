---
phase: 11-lead-attribution-pipeline-consent
plan: 04
subsystem: database
tags: [supabase, postgres, rls, migration, leads, immutability]

requires: []
provides:
  - supabase/migrations/20261003000000_sv_leads_core.sql (sv_leads, sv_lead_contacts, sv_lead_events, sv_lead_notes, triggers, 5 RPCs, sv_leads_admin_v)
  - Migration lint rule 6 (immutable sv_*_events tables need deny triggers)
affects: [11-10, 11-17]

tech-stack:
  added: []
  patterns:
    - "Immutable journal via sv_private.deny_mutation row and truncate triggers plus no update/delete grants"
    - "Source freeze via transaction-local flag sv.allow_source_change set only by sv_correct_lead_source"
    - "Tombstone erasure: PII in erasable tables, events carry no PII"

key-files:
  created:
    - supabase/migrations/20261003000000_sv_leads_core.sql
  modified:
    - src/lib/migrationLint.test.ts

key-decisions:
  - "Table named sv_lead_events (not lead_events) for sv_ namespace and linter coverage"
  - "Phone advisory lock key prefixed 'sv_lead_phone:' to avoid collision with the email lock key"
  - "lost_at cleared when a lead leaves the lost status; other stage timestamps stay write-once"

requirements-completed: [LEAD-02, LEAD-03, LEAD-04, LEAD-07]

duration: 10min
completed: 2026-10-02
---

# Phase 11 Plan 04: Core Lead Schema Summary

**Lead schema migration with immutable journal, frozen source columns, 9-month dedupe under advisory locks, tombstone erasure and service_role-only RPCs; linter extended with an immutability rule.**

## Accomplishments
- Four tables with RLS and admin-only select policies; events table revokes all from service_role then grants select/insert only
- deny_mutation triggers on sv_lead_events (update/delete/truncate) and sv_leads (delete/truncate); protect_lead_source trigger
- RPCs: sv_ingest_lead, sv_set_lead_status, sv_correct_lead_source, sv_erase_lead, sv_mark_return_seen
- sv_leads_admin_v with security_invoker
- Lint rule 6 with failing and compliant fixtures; 7 lint tests green

## Task Commits
1. Task 1 migration: 1c44524
2. Task 2 lint rule 6: 679d906

## Deviations from Plan
None. The migration was NOT applied to any Supabase project (per instruction); behaviour is proven in 11-10.

## Known Stubs
None.

## Self-Check: PASSED
