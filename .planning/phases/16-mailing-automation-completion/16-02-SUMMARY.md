---
phase: 16-mailing-automation-completion
plan: 02
subsystem: mail
tags: [hmac, unsubscribe, resend, svix, webhook, security]
requires: []
provides:
  - "Stateless HMAC unsubscribe token (sign/verify, maskEmail, unsubscribeSecret)"
  - "Resend webhook verification and bounce/complaint event mapper"
affects: [16-06, 16-07, 16-10]
tech-stack:
  added: []
  patterns: ["fail-closed secrets", "fixed-string logs", "timingSafeEqual after length check"]
key-files:
  created:
    - src/lib/server/mail/unsubscribeToken.ts
    - src/lib/server/mail/unsubscribeToken.test.ts
    - src/lib/server/resend/webhook.ts
    - src/lib/server/resend/webhook.test.ts
  modified:
    - .env.example
key-decisions:
  - "Unsubscribe tokens never expire (A5)"
  - "Only Permanent bounces and complaints are applied (A1); event id is the svix-id header (A4)"
metrics:
  duration: "~10 min"
  completed: 2026-10-06
---

# Phase 16 Plan 02: Unsubscribe token and Resend webhook primitives Summary

Pure, offline-tested security primitives for MAIL-04: an HMAC-SHA256 stateless unsubscribe token and Resend (Svix) webhook verification via the SDK with a Permanent-bounce/complaint event mapper.

## Tasks

| Task | Commit | Notes |
|------|--------|-------|
| 1. HMAC unsubscribe token | 62024af | 10 tests |
| 2. Webhook verify + mapper + env docs | 3d9c7cf | 10 tests, `.env.example` updated |

## Deviations from Plan

None in behavior. The tests and implementation of each task were written together and committed as a single `feat` commit, so no separate RED commit exists (plan tasks were `tdd="true"`, not plan-level `type: tdd`).

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

All four source files exist; commits 62024af and 3d9c7cf exist; 20 tests pass; `tsc --noEmit` clean; package.json unchanged.
