---
phase: 16-mailing-automation-completion
plan: 01
subsystem: database
tags: [postgres, supabase, rls, resend, suppression, outbox]

requires:
  - phase: 15-payments
    provides: sv_mail_outbox with 13-value closed lists, deny_mutation pattern, apply-event RPC pattern
provides:
  - sv_resend_events, sv_mail_suppressions, sv_mail_suppression_lifts, sv_reminder_holds (append-only, admin-read RLS)
  - outbox closed lists extended to 17 values via pg_constraint content loop
  - service_role RPCs sv_mail_block_scope, sv_apply_resend_event, sv_record_unsubscribe, sv_lift_suppression, sv_set_reminder_hold
affects: [16-05, 16-06, 16-08, 16-09, 16-10, 16-12, 16-13]

tech-stack:
  added: []
  patterns: [append-only journals with lift-as-new-row, advisory-lock idempotent RPCs, masked address in admin alert payload]

key-files:
  created:
    - supabase/migrations/20261008000000_sv_mail_automation.sql
    - src/lib/mailAutomationMigration.test.ts
  modified: []

key-decisions:
  - "Transient and Undetermined bounces are ignored (A1)"
  - "Resend event id is the svix-id header, 1..200 chars (A4)"
  - "Reminder hold covers document_reminder, document_reminder_admin, review_request only; deposit reminders stay on the SQL path"

requirements-completed: [MAIL-03, MAIL-04]

duration: 15min
completed: 2026-10-06
---

# Phase 16 Plan 01: Mail automation migration Summary

**Single migration adding append-only suppression, lift, Resend-event and reminder-hold journals with admin-only RLS, 17-value outbox lists, and five service_role-only RPCs; not applied to any database.**

## Performance

- **Tasks:** 3
- **Files modified:** 2 (both created)

## Accomplishments
- Outbox event_type and template lists rebuilt by content loop (no hard-coded constraint drop), now 17 values.
- Four tables with RLS, revoke from all API roles, select-only grants, deny_mutation triggers on update/delete/truncate.
- RPCs: block scope lookup, idempotent Resend event application (duplicate on replay), unsubscribe recording with advisory lock, admin-gated lift with reason check, admin-gated reminder hold that skips pending sweep reminders.
- Static Vitest suite (8 tests) plus migration lint pass (17 tests total green).

## Task Commits

1. Tasks 1 and 2 (tables, outbox lists, RLS, RPCs; same file, committed together): `3a96f26`
2. Task 3 (static invariant test): `32f58c5`

## Deviations from Plan

Tasks 1 and 2 touch the same single file and were written together, so they share one commit rather than two. Otherwise the plan was executed as written.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model.

## Issues Encountered

None. The migration was not applied to any remote database (production constraint).

## Self-Check: PASSED
