---
phase: 15-stripe-payments-invoicing
plan: 07
subsystem: mail
tags: [mail, outbox, payments, parity]
requires: [15-03, 15-04]
provides:
  - paymentEmails builders (request, received, reminder, reminder admin, anomaly admin, credit note)
  - six payment mail events in MAIL_EVENTS, MAIL_RULES and dedupeKey helpers
  - buildMail cases with payload validation
  - SQL/TS parity test for closed lists and dedupe keys
affects: [15-08]
tech-stack:
  added: []
  patterns: [shared dark layout helper, parity test reading migrations]
key-files:
  created:
    - src/lib/server/mail/paymentEmails.ts
    - src/lib/server/mail/paymentEmails.test.ts
    - src/lib/server/mail/paymentsMailParity.test.ts
  modified:
    - src/lib/server/mail/rules.ts
    - src/lib/server/mail/rules.test.ts
    - src/lib/server/mail/outbox.ts
    - src/lib/server/mail/outbox.test.ts
    - src/lib/server/mail/urls.ts
key-decisions:
  - "buildMail throws on non-numeric amountCents, unknown stage or kind (row ends failed, never sent malformed)"
  - "rules.test closed-list check now reads the phase-15 invoices migration (latest definition of the constraints)"
requirements-completed: [PAY-03]
duration: 20min
completed: 2026-10-04
---

# Phase 15 Plan 07: Payment mail events Summary

Six payment mail events (request, receipt, J+3/J+7 reminders, J+14 admin alert, unreconciled alert, credit note) are code-defined with UI-SPEC copy, deduplicated with keys proven identical to the SQL RPC literals.

## Tasks

1. Payment email builders and buildPortalPaymentsUrl: 6e36e89
2. Rules, buildMail wiring and SQL/TS parity: f4412c0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing rules.test pointed at the phase-14 migration**
- **Issue:** its closed-list test compared MAIL_EVENTS with the phase-14 constraint, which fails once events are added.
- **Fix:** repointed to 20261007000000_sv_invoices.sql and updated the event count.
- **Files modified:** src/lib/server/mail/rules.test.ts
- **Commit:** f4412c0

Also added buildMail payment cases to outbox.test.ts (not listed in the plan).

## Known Stubs

None.

## Self-Check: PASSED

`rtk vitest run src/lib/server/mail` green (82 tests), `tsc --noEmit` clean, both commits present.
