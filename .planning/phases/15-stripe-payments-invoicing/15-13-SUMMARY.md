---
phase: 15-stripe-payments-invoicing
plan: 13
subsystem: payments
tags: [supabase, rls, stripe, server-actions, invoices]
requires: ["15-02", "15-05", "15-09"]
provides:
  - "loadInvoicesForProjects(rls, projectIds) -> InvoiceView[] with derived statuses (src/lib/server/invoices/read.ts)"
  - "createInvoiceDownloadUrl, verifyInvoiceHash (src/lib/server/invoices/download.ts)"
  - "payInvoiceAction, invoiceDownloadAction (src/app/espace-client/actions.ts)"
affects: [15-15, 15-16]
key-files:
  created:
    - src/lib/server/invoices/read.ts
    - src/lib/server/invoices/read.test.ts
    - src/lib/server/invoices/download.ts
    - src/lib/server/invoices/download.test.ts
  modified:
    - src/app/espace-client/actions.ts
    - src/app/espace-client/actions.test.ts
key-decisions:
  - "loadInvoicesForProjects returns top-level invoices only, in sortInvoicesForDisplay order; credit notes are nested in creditNotes of their origin (not repeated at top level) so the UI never double-renders them"
  - "Invoice signed URLs use a dedicated 60 s constant (INVOICE_SIGNED_URL_SECONDS) because the shared SIGNED_DOWNLOAD_SECONDS is 120 s; invoices share the sv-documents bucket used by issue.ts"
  - "payInvoiceAction validates the UUID before requireClient; both actions take a single id parameter"
requirements-completed: [PAY-01, PAY-03]
duration: 20min
completed: 2026-10-05
---

# Phase 15 Plan 13: Portal invoice data layer and pay/download actions Summary

RLS-only invoice loader with derived statuses (refund/failure flags, nested credit notes, PDF hash), signed 60 s invoice downloads, and portal actions that start Stripe Checkout from an invoice id alone. Commits ea85004 (loader and download) and d19f5e2 (portal actions).

## Deviations from Plan

None in behavior. Note: the shared `SIGNED_DOWNLOAD_SECONDS` is 120, so a local 60 s constant was added to honour the plan's 60-second requirement (T-15-46).

## Verification

`rtk vitest run src/lib/server/invoices src/app/espace-client` green (39 + 63 tests); `tsc --noEmit` clean. Stripe and Supabase fully mocked; no network or database access.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
All six files exist; both task commits present.
