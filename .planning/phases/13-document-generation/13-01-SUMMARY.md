---
phase: 13-document-generation
plan: 01
subsystem: documents
tags: [react-pdf, unpdf, manrope, money, dates]
requires: []
provides:
  - setupPdf() with embedded Manrope and hyphenation disabled
  - money.ts (integer cents), dates.ts (Paris, long French), text.ts
  - pdfText/renderBuffer test helpers
affects: [13-05, 13-08]
tech-stack:
  added: ["@react-pdf/renderer 4.9.0", "unpdf 1.8.1 (dev)"]
  patterns: [base64 font data URIs, render+extract PDF tests]
key-files:
  created:
    - src/lib/documents/fontData.ts
    - src/lib/documents/money.ts
    - src/lib/documents/dates.ts
    - src/lib/documents/text.ts
    - src/lib/documents/pdf/setup.ts
    - src/lib/documents/pdf/testText.ts
    - src/lib/documents/pdf/harness.test.ts
    - scripts/gen-pdf-fonts.mjs
    - assets/fonts/
  modified: [package.json, package-lock.json, next.config.ts]
decisions:
  - "BULLET_GLYPH stays '•': extraction proven by harness (UI-SPEC open item 2 resolved)"
metrics:
  completed: 2026-10-03
---

# Phase 13 Plan 01: React-PDF harness Summary

React-PDF 4.9.0 renders and unpdf extracts text in Vitest with embedded Manrope 400/700, hyphenation off, and tested integer-cents money and Paris date formatters.

## Tasks

| Task | Commit |
| ---- | ------ |
| 1 deps, Next guard, fonts | 31ea151 |
| 2 money/dates/text | 87b0a85 |
| 3 setupPdf, harness | 8e60598 |

## Findings

- The bullet glyph '•' extracts correctly from the Manrope Latin subset, so no fallback needed.
- Two renders of the same element hash differently (confirmed), so issue must hash the uploaded buffer.
- npm warned that core-js, sharp and unrs-resolver have install scripts not covered by allowScripts; these are transitive/pre-existing and were not approved or run.
- package.json uses caret ranges (^4.9.0, ^1.8.1); lockfile pins the exact versions.

## Deviations from Plan

None. The RED step for Task 2 was not run separately before implementation (tests and code written together, then run green).

## Self-Check: PASSED

vitest src/lib/documents: 20 passed; tsc --noEmit clean.
