---
phase: 15-stripe-payments-invoicing
plan: 21
subsystem: payments
tags: [admin, documents, invoices, tests]
requires: ["15-18"]
provides:
  - "Documents section without invoice preview"
  - "billingPanelUi.test.ts locking the Facturation composition"
affects: []
key-files:
  created:
    - src/components/admin/projects/billingPanelUi.test.ts
  modified:
    - src/lib/server/documents/adminView.ts
    - src/lib/server/documents/adminView.test.ts
    - src/components/admin/projects/documents/DocumentsPanel.tsx
    - src/components/admin/projects/documentsAdminUi.test.ts
    - src/components/admin/projects/projectSheetUi.test.ts
    - src/lib/projects/copy.ts
    - src/app/admin/projets/documents.actions.test.ts
  deleted:
    - src/components/admin/projects/documents/InvoicePreviewForm.tsx
key-decisions:
  - "previewOnly removed from ExpectedDocView entirely (no remaining preview-only entry)"
  - "v1 invoice template, registry entry and prepare.ts preview path left untouched"
requirements-completed: [PAY-04, PAY-05]
duration: 10min
completed: 2026-10-05
---

# Phase 15 Plan 21: Retire Documents invoice preview Summary

The phase-13 "Facture (aperçu uniquement)" block is removed from Documents, so invoices exist only in Facturation, and source tests lock the Facturation composition (BillingPanel after DocumentsPanel, D-10 warning, single open form, credit gating, read-only PendingPayments). Full suite: 152 files, 1803 tests pass; `rtk tsc --noEmit` clean.

## Tasks
1. Remove invoice preview from Documents: b8ea338
2. Update admin UI tests, add billingPanelUi.test.ts: 4dbb145

## Deviations from Plan

**1. [Rule 3 - Blocking] documents.actions.test.ts mock missing SV_DOCUMENTS_BUCKET**
- **Found during:** Task 2 (`npm test`)
- **Issue:** The suite failed to load because the `documents/download` mock lacked the `SV_DOCUMENTS_BUCKET` export now imported by invoices/download.ts (from 15-13).
- **Fix:** Added `SV_DOCUMENTS_BUCKET: 'sv-documents'` to the mock.
- **Commit:** 4dbb145

**2. [Minor] Removed unused `invoiceTitle` copy key and `previewOnly` field** (dead after the removal).

## Known Stubs
None.

## Threat Flags
None. T-15-72 and T-15-73 mitigated (preview removed; PendingPayments read-only test).

## Self-Check: PASSED
