---
phase: 13-document-generation
plan: 12
subsystem: admin-ui
tags: [react, admin, documents, preview, snapshot]
requires: ["13-01", "13-03", "13-04"]
provides:
  - DocumentActions / result types contract for server actions (13-17)
  - PreviewIssuePanel (preview iframe + inline issue confirmation)
  - IssuedDocumentsList and read-only SnapshotPanel
affects: [13-15, 13-17, 13-18]
tech-stack:
  added: []
  patterns: [server actions passed as props, blob URL preview revoked on change, source-guard tests]
key-files:
  created:
    - src/components/admin/projects/documents/types.ts
    - src/components/admin/projects/documents/PreviewIssuePanel.tsx
    - src/components/admin/projects/documents/IssuedDocumentsList.tsx
    - src/components/admin/projects/documents/SnapshotPanel.tsx
    - src/components/admin/projects/documentsAdminUi.test.ts
  modified:
    - src/components/admin/projects/projects.css
key-decisions:
  - "Émettre enabled only when previewKey === dirtyKey; same documentId for preview and issue (T-13-40/41)"
  - "Snapshot rendered as React text and JSON in a pre, no HTML injection (T-13-39)"
requirements-completed: [DOC-01, DOC-02]
duration: 15min
completed: 2026-10-03
---

# Phase 13 Plan 12: Admin document components Summary

Reusable admin components for preview-then-issue, the issued-documents table and a read-only snapshot panel, with the typed server-action contract (types.ts) that 13-17 implements.

## Task Commits
1. Task 1: types.ts, PreviewIssuePanel, pt-doc-* CSS: 3695c8c
2. Task 2: IssuedDocumentsList, SnapshotPanel, source-guard test: 9b3b379

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CSS gap tripped existing guard**
- **Found during:** Task 2 verification
- **Issue:** `.pt-doc-snapshot { gap: 12px }` violated the existing projectsAdminUi test (no 12px in css).
- **Fix:** Changed to 8px.
- **Files modified:** src/components/admin/projects/projects.css
- **Commit:** 9b3b379

Minor: the iframe fallback link is rendered beside the iframe rather than as iframe children (always visible, same copy). The issue button is not rendered when canIssue is false, so aria-describedby for blockedReason is placed on the Aperçu button.

## Known Stubs
None.

## Verification
`tsc --noEmit` clean; `vitest run src/components/admin/projects` 20/20 pass.

## Self-Check: PASSED
