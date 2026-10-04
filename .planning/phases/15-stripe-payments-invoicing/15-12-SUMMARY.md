---
phase: 15-stripe-payments-invoicing
plan: 12
subsystem: testing
tags: [supabase, rls, vitest, stripe, payments, idempotency, anomalies]
requires: ["15-08"]
provides:
  - "tests/rls/payments.rls.test.ts: 31 tests proving the payment state machine on sv-rls-p15"
affects: [15-19]
key-files:
  created:
    - tests/rls/payments.rls.test.ts
key-decisions:
  - "Each fixture (project at contract_signed, deposit invoice, checkout session) is created per test so one-deposit-per-project and the per-client processing guard never interfere; clientP is the only client left with a processing invoice"
  - "Anomaly assertions share one helper: one ledger row with the detail, no deposit/balance fact, one admin mail deduped by event id, replay keeps it at one"
  - "Suite marks its own pending outbox rows as skipped in afterAll (same as 15-11)"
requirements-completed: [PAY-02, PAY-03]
duration: 30min
completed: 2026-10-05
---

# Phase 15 Plan 12: Payment state machine RLS suite Summary

`tests/rls/payments.rls.test.ts` (31 tests) is green on the branch sv-rls-p15 and proves, on real Postgres, that `sv_apply_stripe_event` is idempotent, posts facts and unlocks steps exactly once, and that checkout guards, refunds and isolation hold. Commits f58e7ee (apply-event suite) and 11c3562 (checkout, refund, isolation).

## What is proven

- Deposit paid by card: one ledger `paid` row, one `deposit_received` fact (actor system, note `Paiement Stripe {numero}`), `deriveProjectState` gives step 4, one `payment_received` mail per member, pending reminders skipped, `fact_changed` true.
- Replay of the same event id: `replay` true, ledger, fact and mail counts unchanged.
- Crash before `processed_at` (row inserted directly): processed once, then replay; updating `processed_at` or `type` fails with `sv_stripe_event_immutable`.
- Bank transfer: `processing` posts no fact and skips reminders, `async_payment_succeeded` posts the fact once; processing then failed posts none.
- Final invoice posts `balance_received`; period invoice posts no fact but still sends the receipt.
- Anomalies, each with one ledger row, no fact, one admin mail deduped by event id: amount_mismatch, currency_mismatch, livemode_mismatch (live event, test client), unknown_invoice (client kept through the known customer), credited_invoice, duplicate_payment, partially_funded, unreconciled_funds.
- Unresolved events (kind anomaly, and kind paid with an unknown customer): outcome `ignored_unresolved`, `processed_at` set, no ledger row, fact or mail, replay true, no error.
- Checkout guards: `sv_invoice_not_payable` (paid, processing, fully credited), `sv_checkout_amount_mismatch` (also after a partial credit note, the net minus credit is accepted), `sv_checkout_livemode_invalid`, `sv_client_payment_in_progress`.
- Refunds: `sv_refund_not_requested`, `sv_refund_origin_unpaid`, idempotent request on a paid origin, `charge.refunded` and `refund.failed` resolved only by payment intent id onto the same invoice, refund_failed raises the admin mail.
- Isolation: a member reads only the six granted columns of own ledger rows (never B's), selecting `payment_intent_id` or `stripe_event_id` is a permission error, events/sessions/customers return nothing or an error for client, anonymous, plain and Gecko users, admin reads sessions and customers, ledger update/delete refused (service role and `sv_immutable_table` through the owner), authenticated cannot execute `sv_apply_stripe_event` or `sv_issue_invoice` (T-15-43).

## Deviations from Plan

None. No migration bug was found; no migration change or re-push was needed. Stripe was never called; events went through the RPC helpers on the branch only (T-15-42 held, dbQuery refuses the production ref).

## Verification

Each RLS file was run alone on the branch, all green: auth 2, consent 8, consents 5, convert 7, documents 23, facts 12, files 8, funnel 2, invoices 23, isolation 37, leads 22, mailoutbox 5, payments 31, projects 9, retention 2, roles 4, selfsignup 7, signature 14, signatureChain 22. The monolithic `npm run test:rls` was not run (known flaky on this branch, see 15-08); the serial per-file run is the evidence for 15-19.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
tests/rls/payments.rls.test.ts exists; commits f58e7ee and 11c3562 present.
