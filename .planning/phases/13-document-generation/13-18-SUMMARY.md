---
phase: 13-document-generation
plan: 18
subsystem: admin-documents-ui
tags: [documents, admin, forms, project-sheet]
requires: [13-15, 13-17]
provides:
  - loadAdminDocumentsView (server view builder)
  - ContractForm, AcceptanceForm, DocumentsPanel
  - Documents section mounted in the admin project sheet
affects: [src/app/admin/projets/[id]/page.tsx]
key-files:
  created:
    - src/lib/server/documents/adminView.ts
    - src/lib/server/documents/adminView.test.ts
    - src/components/admin/projects/documents/ContractForm.tsx
    - src/components/admin/projects/documents/AcceptanceForm.tsx
    - src/components/admin/projects/documents/DocumentsPanel.tsx
  modified:
    - src/app/admin/projets/[id]/page.tsx
    - src/components/admin/projects/projectSheetUi.test.ts
    - src/components/admin/projects/documentsAdminUi.test.ts
key-decisions:
  - Client components declare local structural recap types instead of importing adminView types, to keep the existing "no @/lib/server in components" guard.
  - Invoice button is never disabled (preview-only), it opens InvoicePreviewForm which shows needQuote when no active quote.
requirements-completed: [DOC-01, DOC-02, DOC-03]
duration: ~25min
completed: 2026-10-03
---

# Phase 13 Plan 18: Admin documents section Summary

Documents section in the admin project sheet: expected documents per step with explicit Générer/Remplacer buttons, contract and acceptance forms, issued list, driven by a server view builder using the admin's RLS client.

## Tasks

| Task | Commit | Notes |
|------|--------|-------|
| 1. adminView, ContractForm, AcceptanceForm | ec6712a | 8 view tests, all behavior cases |
| 2. DocumentsPanel, page mount, guards | 05c3f79 | source guards extended |

## Verification

- `vitest run src/lib/server/documents/adminView.test.ts`: 8/8
- `vitest run src/components/admin src/app/admin`: 151/151
- `tsc --noEmit`: clean
- `next build`: 0 errors, 0 warnings (no secrets needed)
- page.tsx price-token grep: 0 matches
- `npm test` overall: 3 failures, all in `src/proxy.test.ts` (see Deferred)

## Deviations from Plan

**Test assertion wording (minor):** the plan asked to assert `'PROJECT_COPY.documents.admin.generate'` in DocumentsPanel. The panel uses the file-local alias `const COPY = PROJECT_COPY.documents.admin`, consistent with sibling components, so the guard asserts `'COPY.generate'`. It also asserts no `useEffect` at all in the panel (stricter than planned).

## Deferred Issues

`src/proxy.test.ts` (3 tests) fail in this Windows worktree: its regex matches `\n` against the CRLF working copy of `src/proxy.ts` (autocrlf). Not touched by this plan; pre-existing and out of scope. Fix would be normalising line endings in the test read.

## Known Stubs

None.

## Threat Flags

None. Mitigations T-13-65/66/67 applied: view built only on the admin page after requireAdmin with RLS client; no effect-driven action calls (source-tested); page free of admin client.

## Self-Check: PASSED
