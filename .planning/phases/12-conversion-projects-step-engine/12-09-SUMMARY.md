---
phase: 12-conversion-projects-step-engine
plan: 09
subsystem: projects
tags: [storage, signed-urls, rls, consent, links]
requires: ["12-01", "12-03", "12-04"]
provides:
  - getAccessibleProject
  - requestUpload, confirmUpload, createDownloadUrl
  - addProjectLink, setPresentationConsent
affects: [client/admin file and consent server actions]
tech-stack:
  added: []
  patterns: [RLS read as authorization before service_role Storage call, server-built storage path, append-only consent with text snapshot]
key-files:
  created:
    - src/lib/server/projects/access.ts
    - src/lib/server/projects/files.ts
    - src/lib/server/projects/files.test.ts
    - src/lib/server/projects/content.ts
    - src/lib/server/projects/content.test.ts
decisions:
  - "Storage path {clientId}/{projectId}/{uuid}-{sanitized name} built server-side; the pending row id equals the uuid prefix"
  - "confirmUpload checks existence via storage list(dir, {search}) and exact name match; no fallback to blind ready was needed"
  - "Downloads: createSignedUrl(path, 120, {download: filename}) only for status ready"
metrics:
  tasks: 2
  files: 5
  completed: 2026-10-03
---

# Phase 12 Plan 09: Files, links and consent services Summary

Private file flow (signed upload, confirm, 120 s attachment download) authorized by an RLS read before any service_role Storage call, plus admin-only https links and an append-only presentation consent writer that refuses stale text versions.

## Commits
- a269b2a: access.ts, files.ts and tests (11 tests)
- 6cb6cbb: content.ts and tests (6 tests)

## Verification
`rtk vitest run` on both test files: 17 passed; tsc clean. content.ts has no .update( or .delete( calls.

## Deviations from Plan
None - plan executed exactly as written. Note: the existence check relies on the mocked list API; real Storage behaviour (RESEARCH A6) is to be confirmed in the live integration plan.

## Known Stubs
None.

## Self-Check: PASSED
