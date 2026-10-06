---
phase: 16-mailing-automation-completion
plan: 04
subsystem: mail
tags: [email, rules, cadence, vitest, parity]

requires:
  - phase: 16-mailing-automation-completion
    provides: phase-16 migration closed lists (16-01)
provides:
  - MAIL_RULES with class per rule and four new events
  - dedupeKey helpers for document reminders, review requests, suppression alert
  - reviewRequestsEnabled flag
  - STANDARD_REMINDER_CADENCE, REVIEW_REQUEST_CADENCE, reminderStage, parisElapsedDays
affects: [16-10 outbox wiring, 16-14 verification]

tech-stack:
  added: []
  patterns: [SQL/TS parity tests reading migrations, pure cadence module]

key-files:
  created:
    - src/lib/server/mail/flags.ts
    - src/lib/server/mail/flags.test.ts
    - src/lib/server/reminders/cadence.ts
    - src/lib/server/reminders/cadence.test.ts
  modified:
    - src/lib/server/mail/rules.ts
    - src/lib/server/mail/rules.test.ts
    - src/lib/server/mail/paymentsMailParity.test.ts

key-decisions:
  - "review_request is the only marketing rule; the other 16 are transactional"
  - "Closed-list parity now reads the phase-16 migration"

patterns-established:
  - "reminderStage returns only the highest reached stage, null after 60 days (no burst after outage)"

requirements-completed: []

duration: 8min
completed: 2026-10-06
---

# Phase 16 Plan 04: Rules, flag and cadence Summary

**Mail rules now carry a transactional/marketing class with the four phase-16 events and dedupe keys, plus a strict review-requests flag and a shared reminder cadence proven equal to the SQL deposit offsets.**

## Accomplishments
- 17 events/templates matching the migration; tests assert the marketing set equals ['review_request'].
- Four new dedupe keys, with SQL parity for mail_suppression_admin.
- reviewRequestsEnabled true only for the exact string 'true'.
- Cadence module (d3/d7/d14 and d7/d21), Paris calendar-day counting, 60-day cut-off, parity test against the invoices migration.

## Task Commits
1. Task 1: rules, flag, parity - see git log "feat(16-04): message class..."
2. Task 2: cadence - see git log "feat(16-04): shared reminder cadence..."

## Deviations from Plan
**1. [Rule 2] Added flags.test.ts** covering the flag behaviors listed in the plan (file not in files_modified). MAIL-03/MAIL-04 intentionally not marked complete (plan 16-14).

## Verification
`vitest run src/lib/server/mail src/lib/server/reminders` 120 passed; `tsc --noEmit` clean.

## Self-Check: PASSED
