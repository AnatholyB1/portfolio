---
phase: 15-stripe-payments-invoicing
plan: 17
subsystem: payments
tags: [admin, forms, invoices, credit-notes, react]
requires: ["15-05", "15-16"]
provides:
  - "PeriodInvoiceForm and CreditNoteForm client components (src/components/admin/projects/billing/)"
affects: [15-18]
key-files:
  created:
    - src/components/admin/projects/billing/PeriodInvoiceForm.tsx
    - src/components/admin/projects/billing/CreditNoteForm.tsx
    - src/components/admin/projects/billingFormsUi.test.ts
  modified:
    - src/components/admin/projects/projects.css
key-decisions:
  - "Idempotency uuid generated once per mount (useState initializer) and sent as invoiceId / creditNoteId; line keys use a counter"
  - "Success message and tone come from the 15-16 action result; forms do not rebuild them"
  - "Inline French strings only for field validation and the due-date default helper, which have no PROJECT_COPY key"
requirements-completed: [PAY-04, PAY-05]
duration: 20min
completed: 2026-10-05
---

# Phase 15 Plan 17: Admin billing forms Summary

Period invoice form (Du/Au, up to 30 lines with computed Montant HT via parseDaysToMilli/toCents/mulMilli, preview with banner, confirm panel, idempotent issue) and credit note form (total/partial, motif 3-1000 with counter, Stripe refund checkbox only when refund eligible, preview, confirm panel). `rtk vitest run src/components/admin src/lib/priceScope.test.ts` passes (66 tests), tsc clean.

## Tasks
1. PeriodInvoiceForm and CreditNoteForm plus pt-bill-* CSS: 693bab4
2. Source-assertion tests (and uuid-key tweak in PeriodInvoiceForm): see git log `test(15-17)`

## Deviations from Plan
None in behavior. The accent is used only by the issue and confirm primary buttons (two `pt-btn-primary` per form, asserted in tests); the plan's "exactly one besides confirm" is read that way.

## Notes for 15-18
- Map loader pending statuses to copy keys (transfer_waiting to transfer_pending, amount_gap to amount_mismatch, unknown_invoice to unmatched).
- Mount each form with a fresh key per opening so the uuid regenerates.
- `onDone` is called after a successful issue; the parent should refresh data.

## Known Stubs
None.

## Self-Check: PASSED
