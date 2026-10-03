---
phase: 13-document-generation
plan: 04
subsystem: documents
tags: [tdd, pure-functions, step-guard, derived-status]
requires: [13-02, 13-03]
provides: [DOC_STEP_GUARD, checkIssuable, checkPreviewable, chainHeads, replacedByMap, expectedDocTypes, documentStatus, withStatuses, sortForDisplay]
affects: [13-05+ server actions and document lists]
tech-stack:
  added: []
  patterns: [pure client-safe modules, status derived from effective facts, SQL closed-list cross-check]
key-files:
  created:
    - src/lib/documents/steps.ts
    - src/lib/documents/steps.test.ts
    - src/lib/documents/status.ts
    - src/lib/documents/status.test.ts
    - src/lib/documents/docTypesSql.test.ts
  modified: []
decisions:
  - "A signed quote or acceptance trips wrong_step before signed_no_replace, since the signing fact closes the step; signed_no_replace is reachable for the contract (step 3 stays open until deposit)."
  - "documentStatus invoiceKind defaults to 'balance'."
metrics:
  tasks: 1
  files: 5
completed: 2026-10-03
---

# Phase 13 Plan 04: Document step guard and derived status Summary

Pure TDD modules deciding which document may be issued (step guard, prerequisites, signed-replacement refusal) and which status a document shows (derived from effective facts and replacement chain), plus a test tying the SQL doc_type list to ISSUABLE_DOC_TYPES.

## Commits
- ee05835 test(13-04): failing tests (RED)
- feat(13-04): implementation (GREEN), see git log

## Verification
`vitest run src/lib/documents`: 96 tests pass (all files in the folder), no type errors in documents.

## Deviations from Plan
None - plan executed as written. No refactor step was needed.

## TDD Gate Compliance
test commit precedes feat commit. RED confirmed (modules missing), GREEN passes.

## Known Stubs
None.

## Self-Check: PASSED
