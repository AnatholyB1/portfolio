---
phase: 16-mailing-automation-completion
plan: 10
subsystem: mail
tags: [outbox, suppression, marketing, unsubscribe, resend]
requires: ["16-02", "16-03", "16-04"]
provides:
  - decideSend / blockScope (suppression.ts)
  - guarded deliver() with skipped outcome
  - marketing build path with HMAC unsubscribe token and List-Unsubscribe headers
  - templates document_reminder, document_reminder_admin, review_request, mail_suppression_admin
affects: [16-11, 16-14]
tech-stack:
  added: []
  patterns: [pure decision function at single send point, class read from MAIL_RULES at send time]
key-files:
  created:
    - src/lib/server/mail/suppression.ts
    - src/lib/server/mail/suppression.test.ts
  modified:
    - src/lib/server/mail/outbox.ts
    - src/lib/server/mail/outbox.test.ts
    - src/lib/server/documents/issue.ts
key-decisions:
  - "Admin recipients bypass the suppression guard so alerts are never lost"
  - "Lookup failure: marketing fails retryably (suppression_unavailable), transactional is sent"
  - "aggregateMail treats skipped as terminal, never failed"
requirements-completed: []
duration: 25min
completed: 2026-10-06
---

# Phase 16 Plan 10: Guarded outbox send Summary

Single send point (deliver) now enforces suppression per flow via a pure decideSend, builds marketing mails through buildMarketingEmail with a signed unsubscribe link and RFC 8058 headers, and reports skipped as a terminal outcome.

## Tasks
1. Pure send decision and block-scope lookup: commit d6093b5
2. Guarded deliver, marketing path, new templates: commit 71e232c

## Deviations from Plan

**1. [Rule 3 - Blocking] Widened aggregateMail input type**
- **Issue:** widening sendOutboxRow to include 'skipped' broke tsc in invoices/issue.ts, signature/seal.ts, documents/issue.ts (they share aggregateMail).
- **Fix:** added 'skipped' to the accepted union in src/lib/server/documents/issue.ts; skipped aggregates as sent (terminal, not a failure).
- **Commit:** 71e232c

Otherwise the plan was executed as written. Requirements MAIL-03/MAIL-04 intentionally not marked complete (plan 16-14).

## Verification
`vitest run src/lib/server` 536 passed; `tsc --noEmit` clean.

## Self-Check: PASSED
