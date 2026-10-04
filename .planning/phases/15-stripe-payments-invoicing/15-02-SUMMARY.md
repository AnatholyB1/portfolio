---
phase: 15-stripe-payments-invoicing
plan: 02
subsystem: payments
tags: [invoicing, pure-functions, en16931, vitest, tdd]
requires: []
provides:
  - "InvoiceSnapshotV2, CreditNoteSnapshot, LedgerSnapshot contracts in types.ts"
  - "invoiceMath: mulMilli, parseDaysToMilli, deposit/period/final amount builders, creditNoteMax, amountDueCents, billingSummary"
  - "invoiceStatus: derived status, isPayable, sortInvoicesForDisplay"
  - "facturx: toEn16931 documentation-grade term map"
  - "invoiceFixtures: sample deposit/period/final invoices and credit note"
affects: [15-03, 15-06, 15-09, 15-10, 15-13, 15-16]
tech-stack:
  added: []
  patterns: ["integer cents and thousandths, single half-up rounding", "status derived from ledger events, never stored"]
key-files:
  created:
    - src/lib/documents/invoiceFixtures.ts
    - src/lib/documents/invoiceMath.ts
    - src/lib/documents/invoiceMath.test.ts
    - src/lib/documents/invoiceStatus.ts
    - src/lib/documents/invoiceStatus.test.ts
    - src/lib/documents/facturx.ts
    - src/lib/documents/facturx.test.ts
  modified:
    - src/lib/documents/types.ts
key-decisions:
  - "Builders refuse net <= 0 with nothing_to_invoice (deposit, period, final); negative final with over_invoiced"
  - "billingSummary counts billed work as net to pay minus credits, so the final invoice deposit deduction is not double counted"
  - "Refunded wins over credited when a paid event and a refunded event both exist"
requirements-completed: [PAY-01, PAY-03, PAY-04, PAY-05]
duration: 20min
completed: 2026-10-04
---

# Phase 15 Plan 02: Invoice contracts, math, status and EN 16931 map Summary

Pure invoice domain (integer-cent amount builders with over_invoiced / nothing_to_invoice refusals, ledger-derived status, EN 16931 term map) built test-first; full `src/lib/documents` suite green (189 tests).

## Tasks
1. RED: contracts, fixtures, failing tests: d682f38
2. GREEN: math, status, EN 16931 map: 233adf8
3. Refactor (removed a header comment mention of the localized-formatting API to satisfy the grep acceptance check): 3a85a25

## Deviations from Plan
None of substance. The v1 `InvoiceSnapshot` preview contract is untouched. `amountDueCents` lives in `invoiceMath.ts` and is re-exported from `invoiceStatus.ts`. The `finalInvoiceAmounts` input shape (quoteReference, quoteTotalCents, quoteLines, periodInvoices[{number, billedCents}], deposit) and `periodInvoiceAmounts` array input were chosen by me since the plan left them open; downstream plans should use these.

## TDD Gate Compliance
RED (`test(15-02)`) commit d682f38 precedes GREEN (`feat(15-02)`) commit 233adf8.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
All created files exist; commits d682f38, 233adf8, 3a85a25 verified.
