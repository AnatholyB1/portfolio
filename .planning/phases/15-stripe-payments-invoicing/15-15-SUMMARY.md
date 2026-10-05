---
phase: 15-stripe-payments-invoicing
plan: 15
subsystem: portal-payments-ui
tags: [portal, stripe, payments, ui, invoices]
requires: ["15-05", "15-13"]
provides:
  - "Portal Paiements route /espace-client/paiements"
  - "PaymentsList, PayButton, ReturnBanner client components"
affects: [portal]
tech-stack:
  added: []
  patterns: ["server action passed as prop, redirect via window.location.assign", "bounded router.refresh polling"]
key-files:
  created:
    - src/app/espace-client/paiements/page.tsx
    - src/components/portal/project/PaymentsList.tsx
    - src/components/portal/project/PayButton.tsx
    - src/components/portal/project/ReturnBanner.tsx
    - src/components/portal/project/paymentsPage.test.ts
  modified:
    - src/components/portal/project/project.css
    - src/components/portal/project/types.ts
key-decisions:
  - "Client components use a client-safe PortalInvoiceView type in types.ts because the server-only boundary test forbids importing the server reader, even for types"
  - "Banner confirmed state derives only from invoice.status === 'paid'; retour only selects wording"
requirements-completed: [PAY-01, PAY-03]
duration: 20min
completed: 2026-10-05
---

# Phase 15 Plan 15: Portal Paiements tab Summary

Portal Paiements tab per UI-SPEC Surface A: next payment card with the single accent button, invoice table with derived statuses and credit notes, and a return banner that never claims "Payée" from the URL (bounded 3 s / 30 s polling until the webhook-derived status changes).

## Tasks

| Task | Commit | Notes |
| ---- | ------ | ----- |
| 1. Page, list, pay button (plus ReturnBanner, required by the page) | d6a413b | |
| 2. Portal tests | d6e0eea | ReturnBanner itself landed in commit 1 |

## Deviations from Plan

**1. [Rule 3 - Blocking] Client-safe invoice view type**
- Issue: priceScope server-only boundary test failed because PaymentsList imported a type from `@/lib/server/invoices/read`.
- Fix: added `PortalInvoiceView` to `src/components/portal/project/types.ts` (structurally compatible with InvoiceView); components use it.
- Files: types.ts, PaymentsList.tsx, ReturnBanner.tsx.

**2. ReturnBanner committed with Task 1** so the page compiles at each commit.

## Verification

`rtk tsc --noEmit` clean; `rtk vitest run src/components/portal src/app/espace-client src/lib/priceScope.test.ts` 125 passed.

## Known Stubs

None.

## Threat Flags

None. T-15-50/51/52 mitigated: status from RLS data only, UUID regex and RLS-list resolution, RLS client only.

## Self-Check: PASSED
