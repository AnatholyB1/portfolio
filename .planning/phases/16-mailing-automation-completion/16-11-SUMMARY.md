---
phase: 16-mailing-automation-completion
plan: 11
subsystem: mail
tags: [reminders, cron, outbox, sweep]
requires: ["16-04", "16-09"]
provides:
  - planReminders (pure) and sweepReminders
  - daily cron runs reminders sweep before outbox and invoices
affects: [16-14]
tech-stack:
  added: []
  patterns: [pure planner plus bounded paginated reads, fail closed on any read error]
key-files:
  created:
    - src/lib/server/reminders/sweep.ts
    - src/lib/server/reminders/sweep.test.ts
  modified:
    - src/app/api/cron/mail/route.ts
    - src/app/api/cron/mail/route.test.ts
key-decisions:
  - "Stale open rows are those whose document or project is no longer eligible (signed, replaced, refused, held, out of window, review gates closed)"
  - "Review requests need REVIEW_REQUESTS_ENABLED and a reviewLink; default link is null until phase 18"
  - "sv_client_members has no id column, so it is paged ordered by user_id"
requirements-completed: []
duration: 30min
completed: 2026-10-06
---

# Phase 16 Plan 11: Reminder sweep Summary

Daily cron now runs sweepReminders first: unsigned quote, contract and acceptance heads get d3/d7 client reminders and a d14 admin reminder, deduped per document, stage and recipient. Review requests are implemented but gated.

## Tasks
1. Pure planner and sweep: commit edf0df0
2. Cron wiring: commit d4c7772

## Details
- Reads are bounded (61-day document window), id-scoped with .in() chunks of 200, paginated with range() (page size 500, guard 20 pages). Any error or guard overflow returns failed 1 with no enqueue and no stale marking.
- Stale rows updated to skipped / no_longer_due only where status in pending, failed.
- Deposit reminders untouched (SQL path). No lead tables read.

## Deviations from Plan
None - plan executed as written. MAIL-03/MAIL-04 intentionally not marked complete (plan 16-14).

## Verification
`vitest run src/lib/server` 554 passed; cron tests 8 passed; `tsc --noEmit` clean; vercel.json unchanged.

## Self-Check: PASSED
