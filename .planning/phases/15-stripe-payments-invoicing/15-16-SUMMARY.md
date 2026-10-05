---
phase: 15-stripe-payments-invoicing
plan: 16
subsystem: payments
tags: [admin, server-actions, invoices, credit-notes, stripe-refund, vitest]
requires: ["15-09", "15-10", "15-13"]
provides:
  - "loadAdminBillingView(rls, bundle, now) -> AdminBillingView (src/lib/server/invoices/adminView.ts)"
  - "previewPeriodInvoiceAction, issuePeriodInvoiceAction, previewCreditNoteAction, issueCreditNoteAction, adminInvoiceDownloadAction, verifyInvoiceHashAction, loadInvoiceDataAction (src/app/admin/projets/actions.ts)"
  - "billing types: PeriodInvoiceInput, CreditNoteInput, BillingPreviewResult, BillingIssueResult, InvoiceDataResult, AdminBillingView re-export"
affects: [15-17, 15-18]
key-files:
  created:
    - src/lib/server/invoices/adminView.ts
    - src/lib/server/invoices/adminView.test.ts
    - src/components/admin/projects/billing/types.ts
    - src/app/admin/projets/billing.actions.test.ts
  modified:
    - src/app/admin/projets/actions.ts
key-decisions:
  - "Summary uses billingSummary (net to pay minus credits) rather than raw totals, so the final invoice does not double-count the deposit"
  - "Ledger read failures throw InvoicesLoadError instead of returning an empty view"
  - "Credit actions resolve the project from the origin invoice (RLS read) then getAccessibleProject; the snapshot is read with service_role only after both checks"
  - "Credit note replay (already_issued) still runs the refund and expiry effects, which are idempotent, so a crash between issue and refund is recoverable"
requirements-completed: [PAY-01, PAY-04, PAY-05]
duration: 25min
completed: 2026-10-05
---

# Phase 15 Plan 16: Admin billing data and actions Summary

Admin Facturation server contract: an RLS-only loader (summary, automatic deposit and final states, per-invoice Stripe details, pending and unreconciled payments) plus seven guarded actions for period invoices, credit notes with optional Stripe refund, downloads, hash check and frozen data. `rtk vitest run src/app/admin/projets src/lib/server/invoices` is green (117 tests), tsc clean, eslint clean on touched files.

## Tasks
1. Admin billing view loader and shared types: 2b68143
2. Billing server actions: bde5b67

## Deviations from Plan

None in behavior.

- `PeriodInvoiceInput` and the other contract types match the plan's interface block. `AdminBillingView` is defined in adminView.ts and re-exported (type only) from billing/types.ts.
- Tests were written with the code rather than as separate RED commits.
- Field-level validation messages (period end before start, invalid days or rate, reason length) are inline French strings in actions.ts because PROJECT_COPY.payments.admin has no matching keys; the summary messages all come from PROJECT_COPY.

## Notes for downstream plans (15-17, 15-18)
- `issuePeriodInvoiceAction` and `issueCreditNoteAction` expect the client to generate `invoiceId` / `creditNoteId` once per form (idempotence key is `period:<id>` / `credit:<id>`).
- `already_issued` on a period invoice returns `{ ok: false, message: alreadyIssued }`; on a credit note it returns success and re-runs the idempotent Stripe effects.
- Download failures use `PROJECT_COPY.payments.portal.downloadFailed`; other generic failures use `PROJECT_COPY.errors.generic`.
- `pending.status` values are `transfer_waiting | amount_gap | unknown_invoice | failed`; the 15-UI-SPEC copy keys are `transfer_pending | amount_mismatch | unmatched | failed`, so the UI must map them.

## Known Stubs
None.

## Threat Flags
None beyond the plan's threat model (T-15-53..57 mitigated: requireAdmin first in every action, totals recomputed by the builders, refund only after an issued credit note with ledger eligibility, snapshot read with service_role only after admin and project checks, reason validated 3-1000 chars).

## Self-Check: PASSED
All five files exist; commits 2b68143 and bde5b67 verified.
