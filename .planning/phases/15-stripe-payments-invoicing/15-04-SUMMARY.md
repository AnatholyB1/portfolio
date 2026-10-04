---
phase: 15-stripe-payments-invoicing
plan: 04
subsystem: payments
tags: [postgres, migration, stripe, idempotency, rls, ledger]
requires: []
provides:
  - "sv_stripe_customers, sv_checkout_sessions, sv_stripe_events, sv_invoice_payment_events (append-only, RLS)"
  - "public.sv_record_checkout_session, sv_record_refund_request, sv_apply_stripe_event (service_role only)"
affects: [15-08, 15-09, 15-12, 15-19]
tech-stack:
  added: []
  patterns: ["event row inserted then locked, processed_at set last", "business mismatches commit as ledger anomalies", "WHEN-clause deny trigger plus guarded processed_at transition"]
key-files:
  created:
    - supabase/migrations/20261007010000_sv_payments.sql
    - src/lib/paymentsMigration.test.ts
  modified: []
key-decisions:
  - "sv_stripe_events: processed rows frozen by a WHEN (old.processed_at is not null) deny_mutation trigger so migrationLint rule 6 passes; unprocessed rows only accept the guarded processed_at transition and are never deletable"
  - "A processing event arriving after paid does not make the invoice processing again (invoice_is_processing is false once a paid row exists)"
  - "A missing admin e-mail on an anomaly records the ledger row and skips the mail instead of raising (raising would block the record and make Stripe retry forever)"
requirements-completed: [PAY-01, PAY-02, PAY-03]
duration: 20min
completed: 2026-10-04
---

# Phase 15 Plan 04: Payments migration Summary

Idempotent, single-transaction Stripe event application (ledger, deposit/balance fact, receipt, reminder cancellation, anomaly mails) with admin-only Stripe ids; written but NOT applied to any database (branch push 15-08, production 15-19).

## Tasks
1. Payment tables, RLS and triggers: 91915c9
2. Checkout, refund and apply-event RPCs plus static test: 805853c

Verification: `paymentsMigration.test.ts`, `migrationLint.test.ts`, `invoicesMigration.test.ts`, `signatureMigration.test.ts` green (51 tests). SQL not executed on Postgres yet (15-12).

## Deviations from Plan
1. **[Rule 3 - blocking] sv_stripe_events immutability vs lint rule 6**: the lint requires a `before update or delete ... deny_mutation` trigger on every `sv_*_events` table, which conflicts with the allowed processed_at transition. Solved with a row trigger `when (old.processed_at is not null)` calling deny_mutation, plus the guard trigger for unprocessed rows and a separate delete deny trigger. Lint file untouched.
2. Extra error codes: `sv_event_invalid`, `sv_method_invalid`, `sv_checkout_session_invalid`, `sv_refund_invalid`, `sv_refund_amount_invalid`. Refund request is idempotent on the refund id.
3. `anomaly` passed as p_kind uses detail `unreconciled_funds` whether or not an invoice resolved.

## Known Stubs
None.

## Threat Flags
None beyond the plan's threat model (T-15-13..18b mitigated in SQL).

## Self-Check: PASSED
Both files exist; commits 91915c9 and 805853c verified.
