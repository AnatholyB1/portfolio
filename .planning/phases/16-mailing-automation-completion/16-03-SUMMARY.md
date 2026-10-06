---
phase: 16-mailing-automation-completion
plan: 03
subsystem: mail
tags: [email, resend, rfc8058, list-unsubscribe, vitest]

requires:
  - phase: 16-mailing-automation-completion
    provides: unsubscribe token (16-02), mail automation migration (16-01)
provides:
  - emailLayout shared by payment, reminder and marketing mails
  - buildMarketingEmail enforcing unsubscribe footer and RFC 8058 headers
  - documentReminderEmail, documentReminderAdminEmail, reviewRequestContent, mailSuppressionAdminEmail
  - buildUnsubscribePageUrl, buildUnsubscribeOneClickUrl, buildAdminMailUrl
affects: [16-10 outbox wiring, 16-14 verification]

tech-stack:
  added: []
  patterns: [marketing mail unconstructable without two https unsubscribe links]

key-files:
  created:
    - src/lib/server/mail/layout.ts
    - src/lib/server/mail/marketingEmail.ts
    - src/lib/server/mail/marketingEmail.test.ts
    - src/lib/server/mail/reminderEmails.ts
    - src/lib/server/mail/reminderEmails.test.ts
  modified:
    - src/lib/server/mail/paymentEmails.ts
    - src/lib/server/mail/urls.ts

key-decisions:
  - "A2: marketing sender is bonjour@sevalys.com on the verified sevalys.com domain, no dedicated sending subdomain"
  - "paymentEmails keeps exporting BuiltBody (re-export) so existing importers are unaffected"

patterns-established:
  - "Marketing builder throws missing_unsubscribe unless pageUrl and oneClickUrl are https"

requirements-completed: []

duration: 10min
completed: 2026-10-06
---

# Phase 16 Plan 03: E-mail content Summary

**Shared e-mail layout plus a marketing builder that cannot produce a mail without an https unsubscribe footer and List-Unsubscribe one-click headers, and all phase-16 French reminder, review and suppression-alert bodies.**

## Accomplishments
- Extracted `emailLayout` (optional button, optional footer) from paymentEmails; payment tests pass unchanged.
- `buildMarketingEmail` with sender identity footer, "Se désinscrire" link, and RFC 8058 headers.
- Document reminder (d3/d7 client, d14 admin), review request content (https only), suppression admin alert (masked address).
- New URL builders in urls.ts.

## Task Commits
1. Task 1: layout and marketing builder - 20c4e6a
2. Task 2: reminder, review, suppression content - 9ace2d8

## Deviations from Plan
None. Requirements MAIL-03/MAIL-04 intentionally not marked complete (plan 16-14 does so).

## Verification
`vitest run src/lib/server/mail` 112 passed; `tsc` clean.

## Self-Check: PASSED
