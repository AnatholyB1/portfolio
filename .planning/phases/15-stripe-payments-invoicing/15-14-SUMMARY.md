---
phase: 15-stripe-payments-invoicing
plan: 14
subsystem: payments
tags: [invoices, signature, cron, idempotency]
requires: ["15-10"]
provides:
  - "ensureDepositInvoice, ensureFinalInvoice, sweepInvoices (src/lib/server/invoices/autoIssue.ts)"
  - "finalizeSignature post-seal invoice hook; cron mail route runs sweepInvoices(10)"
affects: [15-15, 15-16]
key-files:
  created:
    - src/lib/server/invoices/autoIssue.ts
    - src/lib/server/invoices/autoIssue.test.ts
  modified:
    - src/lib/server/signature/seal.ts
    - src/lib/server/signature/seal.test.ts
    - src/app/api/cron/mail/route.ts
    - src/app/api/cron/mail/route.test.ts
key-decisions:
  - "nothing_to_invoice (zero net final or zero deposit) never calls the RPC; fixed-string log '[invoices/auto] final_nothing_to_invoice: post balance_received manually'; sweep counts it in skipped"
  - "Seal hook runs after afterFactPosted, only on a fresh 'sealed' outcome, wrapped in try/catch; already_sealed is left to the daily sweep"
  - "Cron response is { ...mailResult, invoices }; a sweep throw yields 200 with invoices: { error: 'invoices_failed' }"
requirements-completed: [PAY-01, PAY-03, PAY-04]
duration: 15min
completed: 2026-10-05
---

# Phase 15 Plan 14: Automatic deposit and final invoices Summary

Contract seal issues the deposit invoice and acceptance seal issues the final invoice, best-effort and idempotent, with the daily cron sweep healing gaps and attaching missing PDFs. Commits 945e992 (autoIssue) and ce829d8 (seal hook and cron).

## Deviations from Plan

None - plan executed as written. The existing-invoice path calls attachInvoicePdf unconditionally (it is a no-op returning 'already' when a PDF row exists).

## Verification

`rtk vitest run src/lib/server/signature src/app/api/cron src/lib/server/invoices` green (131 tests); `tsc` clean; vercel.json untouched. Everything mocked; no Stripe, no database access.

## Known Stubs

None.

## Self-Check: PASSED
