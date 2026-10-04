---
phase: 15-stripe-payments-invoicing
plan: 06
subsystem: documents
tags: [react-pdf, invoice, credit-note, legal-mentions]
requires: [15-02]
provides:
  - InvoiceV2 template (deposit, period, final)
  - CreditNoteV1 template
  - ledgerDocumentElement registry entry point
  - invoiceV2Mentions and creditNoteMentions (DOC-04)
affects: [15-10]
tech-stack:
  added: []
  patterns: [legal texts read from frozen snapshot, new template versions instead of editing v1]
key-files:
  created:
    - src/lib/documents/pdf/templates/invoice/v2/InvoiceV2.tsx
    - src/lib/documents/pdf/templates/credit-note/v1/CreditNoteV1.tsx
  modified:
    - src/lib/documents/pdf/primitives.tsx
    - src/lib/documents/registry.ts
    - src/lib/documents/legalMentions.ts
    - src/lib/documents/legalMentions.test.ts
    - src/lib/documents/render.test.ts
key-decisions:
  - "APERCU stamp and PROFORMA text are rendered only when number is null"
  - "VAT exemption and payment texts printed from snapshot fields, not constants"
requirements-completed: [PAY-04, PAY-05]
duration: 15min
completed: 2026-10-04
---

# Phase 15 Plan 06: Invoice v2 and credit-note templates Summary

Numbered invoice v2 and credit-note v1 PDF templates with a ledger registry and DOC-04 extracted-text mention tests for deposit, period, final, test-series invoices and credit notes.

## Tasks

1. Ledger table, InvoiceV2, CreditNoteV1, registry: e24af83
2. Mention builders and render tests: see git log (test(15-06))

## Notes

- PROFORMA/APERCU in InvoiceV2 and CreditNoteV1 are inside a `preview` (number === null) branch; tests assert issued PDFs contain neither.
- No "Acquittee" text or test stamp; test invoices are identified by the TFA- number only.
- The seller-level VAT line in Parties still uses the existing constant (existing primitive, unchanged); the totals block prints snapshot.vatExemptionText.
- `rtk vitest run src/lib/documents`: 201 passed. `rtk tsc --noEmit`: clean.

## Deviations from Plan

None - plan executed as written.

## Self-Check: PASSED
