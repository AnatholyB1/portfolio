---
phase: 15-stripe-payments-invoicing
plan: 01
subsystem: payments
tags: [stripe, webhook, server-only, vitest]
requires: []
provides:
  - "stripe@23.0.0 pinned; getStripe(mode) mode-guarded client"
  - "verifyStripeEvent (SDK constructEvent, raw body, per-mode secrets, livemode check)"
  - "toApplyArgs pure mapper to ApplyArgs / LEDGER_KINDS"
affects: [15-04, 15-09]
tech-stack:
  added: [stripe@23.0.0]
  patterns: ["Env-parameter guards copied from supabase/env.ts", "static Stripe.webhooks for keyless verification"]
key-files:
  created:
    - src/lib/server/stripe/client.ts
    - src/lib/server/stripe/client.test.ts
    - src/lib/server/stripe/webhook.ts
    - src/lib/server/stripe/webhook.test.ts
  modified: [package.json, package-lock.json]
key-decisions:
  - "Webhook verification uses the static Stripe.webhooks.constructEvent, so no API key is needed to verify"
  - "Env vars: STRIPE_SECRET_KEY_TEST/LIVE, STRIPE_WEBHOOK_SECRET_TEST/LIVE"
  - "checkout.session.completed paid maps to method card; unpaid to processing/bank_transfer"
  - "cash_balance.funds_available has no id: customer id used as p_object_id"
requirements-completed: [PAY-01, PAY-02]
duration: 15min
completed: 2026-10-04
---

# Phase 15 Plan 01: Stripe client and webhook mapper Summary

Mode-guarded Stripe client (live key refused outside VERCEL_ENV=production, test client always test) plus SDK-verified webhook parsing and a pure event-to-ledger mapper, all test-first (28 tests green).

## Tasks
1. Install stripe 23.0.0 and guarded client: bd0ef83
2. Webhook verification and mapper: 0d4c6f4

## Deviations from Plan
None of substance. Notes: `cash_balance.funds_available` and `payment_intent.partially_funded` exist in the 23.0.0 Event union, so no branch was omitted. The cash_balance object carries no `id`, so the customer id is used as `p_object_id` (small addition to keep the event mappable). `getStripe` only caches instances when called with the real `process.env`, so tests with injected env stay isolated.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
Files and commits bd0ef83, 0d4c6f4 verified.
