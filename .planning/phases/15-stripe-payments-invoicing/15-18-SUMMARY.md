---
phase: 15-stripe-payments-invoicing
plan: 18
subsystem: payments
tags: [admin, billing, invoices, react, stripe]
requires: ["15-16", "15-17"]
provides:
  - "BillingPanel, InvoiceList, PendingPayments (src/components/admin/projects/billing/)"
  - "Facturation section mounted after Documents on the admin project sheet"
affects: [15-21]
key-files:
  created:
    - src/components/admin/projects/billing/BillingPanel.tsx
    - src/components/admin/projects/billing/InvoiceList.tsx
    - src/components/admin/projects/billing/PendingPayments.tsx
  modified:
    - src/components/admin/projects/projects.css
    - src/app/admin/projets/[id]/page.tsx
key-decisions:
  - "Loader pending statuses mapped to UI copy keys in PendingPayments (transfer_waiting to transfer_pending, amount_gap to amount_mismatch, unknown_invoice to unmatched)"
  - "Stripe link uses /payments/{pi_} for payment intents, dashboard search otherwise; /test prefix when livemode is false; rel noopener noreferrer"
  - "Each form is mounted with a fresh key per opening so its idempotency uuid regenerates; only one form open at a time"
  - "Frozen invoice data panel reads the snapshot defensively (unknown typed) and shows the payment block from the loader's stripe field"
requirements-completed: [PAY-01, PAY-03, PAY-04, PAY-05]
duration: 15min
completed: 2026-10-05
---

# Phase 15 Plan 18: Admin Facturation section Summary

Admin Facturation panel on the project sheet: summary strip, automatic deposit/final lines, invoice list with hash disclosure, frozen data view with Stripe payment block, credit note entry point, period invoice entry point, and a read-only pending/unreconciled payments table with 14-day flagging. `rtk tsc --noEmit` clean, `rtk vitest run src/components/admin` passes (58).

## Tasks
1. InvoiceList and PendingPayments plus pt-bill CSS: f355402
2. BillingPanel and project sheet integration: see git log `feat(15-18): mount admin Facturation`

## Deviations from Plan
None. The Phase-13 invoice preview retirement and UI tests are in 15-21 as planned. The page loads the billing view without a try/catch because the documents view in this page has none either; InvoicesLoadError propagates to the route error boundary.

## Known Stubs
None.

## Threat Flags
None beyond the plan's model (T-15-60 admin-only page, T-15-61 noopener noreferrer, T-15-62 D-10 warning shown).

## Self-Check: PASSED
