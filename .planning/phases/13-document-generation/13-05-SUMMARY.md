---
phase: 13-document-generation
plan: 05
subsystem: documents
tags: [react-pdf, unpdf, legal-mentions, quote, invoice]
requires: [13-01, 13-03]
provides:
  - PDF primitives (DocPage, HeaderBand, Parties, LinesTable, TotalsBlock, PaymentConditions, SignatureBox, ...)
  - QuoteV1 and InvoiceV1 templates (pure functions of a snapshot)
  - sample snapshots (fixtures.ts)
  - DOC-04 mention test on text extracted from real PDFs
key-files:
  created:
    - src/lib/documents/pdf/primitives.tsx
    - src/lib/documents/pdf/templates/quote/v1/QuoteV1.tsx
    - src/lib/documents/pdf/templates/invoice/v1/InvoiceV1.tsx
    - src/lib/documents/fixtures.ts
    - src/lib/documents/addressFormat.ts
    - src/lib/documents/legalMentions.ts
    - src/lib/documents/legalMentions.test.ts
key-decisions:
  - "formatAddress and formatSiretPrint live in a pure addressFormat.ts (re-exported by primitives.tsx) so legalMentions.ts does not load react-pdf or fonts"
  - "Each Mention carries a strip function; the non-vacuity test removes the matched text and asserts findMissingMentions reports the id"
  - "Fixture line designations kept under about 40 characters so table rows do not wrap and extraction order stays row-wise"
requirements-completed: [DOC-01, DOC-04]
duration: ~25 min
completed: 2026-10-03
---

# Phase 13 Plan 05: Quote and invoice templates with DOC-04 mention test Summary

Quote v1 and invoice v1 (PROFORMA, APERCU stamp) templates render from frozen snapshots using shared primitives, and a Vitest test extracts text from real rendered PDFs with unpdf and fails when any mandatory French mention is missing.

## Tasks

| Task | Commit | Content |
|------|--------|---------|
| 1 | b9be6d2 | primitives.tsx, fixtures.ts |
| 2 | 87e1667 | QuoteV1.tsx, InvoiceV1.tsx |
| 3 | see git log (test(13-05)) | legalMentions.ts, legalMentions.test.ts, addressFormat.ts |

## Verification

- `vitest run src/lib/documents`: 77 tests pass; `tsc --noEmit` clean.
- Coverage: SELLER_V1 (placeholder) and sampleSeller x billing identical/different; invoice also vat number / not subject and deposit / balance.
- Delivery-address line appears only when billing differs; no VAT rate or amount line; no `\d/\d` in text.
- Sabotage check done once locally: deleting the `RECOVERY_INDEMNITY_TEXT` line from PaymentConditions made the test fail with `recovery_40` missing; restored afterwards.

## Deviations from Plan

**1. [Rule 3 - Blocking] Pure address/SIRET helpers moved to addressFormat.ts.** legalMentions.ts must be pure (no react-pdf), but it needs formatAddress. primitives.tsx re-exports both helpers, so the plan's export contract holds.

**2. [Rule 1 - Bug] Placeholder SIRET.** `digitsIncluded` stripped whitespace from the non-numeric placeholder "À COMPLÉTER" and never matched; it now compares non-numeric values as is.

## Known Stubs

None. SELLER_V1 placeholder values come from 13-03 and are intentional until plan 13-11.

## Threat Flags

None.

## Notes

Accountant review of the mention list is still pending (STATE.md blocker); this test only guards against regressions.

## Self-Check: PASSED
