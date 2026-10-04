---
phase: 15-stripe-payments-invoicing
plan: 09
subsystem: payments
tags: [stripe, checkout, webhook, refund, server-only]
requires: ["15-01", "15-02", "15-04", "15-05"]
provides:
  - "createCheckoutForInvoice(rls, invoiceId), getOrCreateStripeCustomer(clientId, mode)"
  - "requestRefundForCreditNote(creditNoteId), expireOpenPayments(invoiceId)"
  - "POST /api/stripe/webhook (nodejs runtime)"
affects: [15-13, 15-16]
tech-stack:
  added: []
  patterns: ["RLS read before service_role step", "idempotency keys per customer/checkout window/credit note", "fixed-string logs and responses"]
key-files:
  created:
    - src/lib/server/stripe/customers.ts
    - src/lib/server/stripe/checkout.ts
    - src/lib/server/stripe/checkout.test.ts
    - src/lib/server/stripe/refund.ts
    - src/lib/server/stripe/refund.test.ts
    - src/app/api/stripe/webhook/route.ts
    - src/app/api/stripe/webhook/route.test.ts
  modified: []
key-decisions:
  - "Checkout amount = invoice net_to_pay minus credit notes, read through the caller's RLS client; no amount parameter anywhere"
  - "ignored_unresolved outcome returns 200 without mail or fact notification so Stripe does not retry"
requirements-completed: [PAY-01, PAY-02, PAY-03, PAY-04]
duration: 20min
completed: 2026-10-04
---

# Phase 15 Plan 09: Stripe server side Summary

Hosted Checkout (card + EU bank transfer FR) from DB amounts, idempotent credit-note refunds, and a signature-verified webhook that is the only path to a paid state. All Stripe calls mocked in tests.

## Tasks
1. Customers and Checkout creation: 1eb2196
2. Refund and payment cancellation: fa06471
3. Public webhook route and ledger-kind parity: 58b3205

Verification: `vitest run src/lib/server/stripe src/app/api/stripe src/lib/priceScope.test.ts` 59 passed; tsc and eslint clean.

## proxy.ts guard
PLAN_START = 5c65ad7792720f2395cc1582ebbc5b58f4f33207. PRE_DIFF_HASH (`git diff -- src/proxy.ts src/lib/privateRoutes.ts | sha256sum`) = e3b0c442...b855 (unchanged after the work). No commit of this plan touches src/proxy.ts or src/lib/privateRoutes.ts. The owner's uncommitted edits were never staged.

## Deviations from Plan
None - plan executed as written. Note: the git-diff hash of proxy.ts is the empty-input hash (the working-tree change appears as line-ending only); it was identical before and after.

## Known Stubs
None.

## Threat Flags
None beyond the plan threat model.

## Self-Check: PASSED
All seven files exist; commits 1eb2196, fa06471, 58b3205 verified.
