---
phase: 13-document-generation
plan: 17
subsystem: documents
tags: [server-actions, documents, guard-order, pdf-preview]
requires: [13-10, 13-12, 13-13]
provides:
  - prepareDocument (shared server-side preparation for preview and issue)
  - previewDocumentAction, issueDocumentAction, adminDocumentDownloadAction, verifyDocumentHashAction, loadSnapshotAction
affects: [admin documents UI wiring]
key-files:
  created:
    - src/lib/server/documents/prepare.ts
    - src/lib/server/documents/prepare.test.ts
    - src/app/admin/projets/documents.actions.test.ts
  modified:
    - src/app/admin/projets/actions.ts
decisions:
  - "Spec input is re-parsed with specInputSchema after the union schema so the transformed shape reaches buildSnapshot"
metrics:
  tasks: 2
  completed: 2026-10-03
---

# Phase 13 Plan 17: Admin document actions Summary

Guarded admin server actions for document preview, issue, download, hash verification and snapshot read, built on a shared prepareDocument that re-reads everything server-side.

## What was built

- `prepareDocument(rls, input, mode, now)`: reloads the project bundle, documents and prerequisite snapshot (quote for contract and invoice, spec for acceptance), applies checkIssuable or checkPreviewable, then builds the snapshot with SELLER_V1, the Paris date and the computed revision. It performs no storage, RPC or service_role call.
- Five actions in `actions.ts`, each starting with `requireAdmin()`, then zod or uuid validation, then `getAccessibleProject`, then the server module. Preview returns base64 and writes nothing. Issue refuses invoices before any module, calls `issueDocument`, and on success revalidates admin and portal paths (`refresh` now includes `/espace-client/documents`). Error codes map to the French copy in `PROJECT_COPY.documents.admin`.
- Tests: 13 for prepare, plus guarded-table, outcome and mapping tests in `documents.actions.test.ts`. `vitest run src/app/admin/projets src/lib/server/documents` passes (98), `tsc --noEmit` is clean.

## Deviations from Plan

**1. [Rule 1 - Bug] documentInputSchema does not apply the spec transform**
- **Found during:** Task 2 (tsc error on `acceptanceCriteriaList`)
- **Issue:** The discriminated union only runs specInputSchema inside superRefine, so parsed spec data lacks `acceptanceCriteriaList` and the defaults. buildSnapshot would have thrown at runtime.
- **Fix:** local `parseDocumentInput` in actions.ts re-parses spec input with `specInputSchema`; added a test.
- **Files modified:** src/app/admin/projets/actions.ts, src/app/admin/projets/documents.actions.test.ts
- **Commit:** 7136cde

Also: the worktree base was reset to the required sha at start (merge-base differed), and `npm ci` was run.

## Commits

- 5d47d46: feat(13-17): add server-side document preparation
- 7136cde: feat(13-17): add admin document actions

## Known Stubs

None.

## Self-Check: PASSED
