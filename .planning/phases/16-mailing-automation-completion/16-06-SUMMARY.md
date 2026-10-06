---
phase: 16-mailing-automation-completion
plan: 06
subsystem: mail
tags: [resend, svix, webhook, unsubscribe, rfc8058, vitest]

requires:
  - phase: 16-mailing-automation-completion
    provides: sv_apply_resend_event / sv_record_unsubscribe RPCs (16-01), webhook and token helpers (16-02)
provides:
  - POST /api/resend/webhook (signed, idempotent, fail-closed)
  - POST/GET /api/unsubscribe (one-click and confirmation form)
affects: [16-07 proxy test, 16-14 verification]

tech-stack:
  added: []
  patterns: [Stripe-webhook route structure reused, fixed-string logs]

key-files:
  created:
    - src/app/api/resend/webhook/route.ts
    - src/app/api/resend/webhook/route.test.ts
    - src/app/api/unsubscribe/route.ts
    - src/app/api/unsubscribe/route.test.ts
  modified: []

key-decisions:
  - "Webhook tests use real Svix signatures (no verifier mock) so the full verify path is covered"
  - "Unsubscribe source 'link' only from form field source=link; any other or empty body is one_click"

requirements-completed: []

duration: 10min
completed: 2026-10-06
---

# Phase 16 Plan 06: Public Resend webhook and unsubscribe routes Summary

Signed Resend webhook feeding the suppression list and an RFC 8058 unsubscribe endpoint (POST only, GET 405), both with fixed-string logs and no-store/no-referrer headers.

## Tasks
1. Resend webhook route - commit 186f26e (10 tests)
2. Unsubscribe route - commit abb6157 (9 tests)

Verification: 19 tests green, tsc clean. No migrations applied, no remote calls.

## Deviations from Plan
None - plan executed exactly as written.

## Known Stubs
None.

## Notes
MAIL-04 not marked complete here (plan 16-14 does that).

## Self-Check: PASSED
