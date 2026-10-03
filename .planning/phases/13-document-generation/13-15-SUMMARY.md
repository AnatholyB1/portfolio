---
phase: 13-document-generation
plan: 15
subsystem: admin-ui
tags: [forms, quote, spec, invoice-preview, react]
requires: [13-12, 13-03, 13-01]
provides: [QuoteForm, SpecForm, InvoicePreviewForm]
affects: [13-18]
key-files:
  created:
    - src/components/admin/projects/documents/QuoteForm.tsx
    - src/components/admin/projects/documents/SpecForm.tsx
    - src/components/admin/projects/documents/InvoicePreviewForm.tsx
  modified:
    - src/components/admin/projects/documentsAdminUi.test.ts
decisions:
  - "Client-side totals are display-only; forms send lines in integer cents and the server recomputes."
  - "InvoicePreviewForm hardcodes canIssue={false}; no issue button exists."
metrics:
  tasks: 2
  completed: 2026-10-03
requirements: [DOC-01]
---

# Phase 13 Plan 15: Admin document input forms Summary

Three client forms (quote with free cent-based lines, structured spec, preview-only invoice) that each drive PreviewIssuePanel with a dirtyKey.

## Commits
- 2bc65e8: QuoteForm
- 646df35: SpecForm, InvoicePreviewForm, source guards (see git log, `feat(13-15)`)

## What was built
- QuoteForm: up to 30 lines (designation, quantity, unit price HT in euros parsed with toCents), deposit % (30), validity days (30), lead time; display-only recap (total, deposit, balance, 293 B line); server field errors mapped by path (`lines.N.field`).
- SpecForm: six textareas with 4000-char counters, context prefilled from projectGoal, acceptance criteria one per line.
- InvoicePreviewForm: kind radio, service date, optional order number, read-only quote recap, canIssue={false}; needQuote message when no quote.
- documentsAdminUi.test.ts extended: guards for all new files plus feature-specific assertions.

## Deviations from Plan
None. The base commit was reset to cb110a1 per the worktree check. `rtk npm ci` was run for node_modules.

## Verification
vitest src/components/admin/projects: 24 passed; tsc --noEmit clean; eslint clean on documents/.

## Known Stubs
None.

## Self-Check: PASSED
