---
phase: 13-document-generation
plan: 10
subsystem: documents
tags: [rls, supabase-storage, signed-url, sha256]
requires: [13-03, 13-04]
provides:
  - loadProjectDocuments, loadDocumentsForProjects, loadDocumentSnapshot, loadActiveSnapshot
  - createDocumentDownloadUrl, verifyDocumentHash, SV_DOCUMENTS_BUCKET
key-files:
  created:
    - src/lib/server/documents/read.ts
    - src/lib/server/documents/read.test.ts
    - src/lib/server/documents/download.ts
    - src/lib/server/documents/download.test.ts
metrics:
  tasks: 2
  files: 4
completed: 2026-10-03
---

# Phase 13 Plan 10: Document read and download layer Summary

Server-only RLS read layer for documents (lists, frozen snapshots, chain-head lookup) plus a 120 s signed-URL download and a stored-bytes SHA-256 verification service.

## Commits
- 9560da5: read.ts and tests
- 497de35: download.ts and tests

## Decisions
- read.ts never touches service_role or storage_path; all reads use the caller's RLS client with explicit columns.
- download.ts authorises via an RLS read of the id first, then resolves storage_path with the admin client only after a visible row exists.
- Hash verification re-downloads stored bytes; no re-rendering.

## Deviations from Plan
None. Worktree base was reset to f7aab26 as instructed; `npm ci` run for node_modules.

## Verification
vitest src/lib/server/documents: 14 tests pass; tsc --noEmit clean.

## Known Stubs
None.

## Self-Check: PASSED
