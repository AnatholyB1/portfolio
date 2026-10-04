---
phase: 14-electronic-signature
plan: 08
subsystem: signature
tags: [audit-trail, signed-urls, rls, sha256]
requires: [14-02, 14-03, 14-04]
provides:
  - chain.ts (logDocumentOpened, logSealDownloaded, recordConsent, submitAcceptance, exportSignatureChain, verifySignatureChainInDb)
  - links.ts (createPreviewUrl, createSealedDownloadUrl, PREVIEW_LINK_SECONDS)
key-files:
  created:
    - src/lib/server/signature/chain.ts
    - src/lib/server/signature/chain.test.ts
    - src/lib/server/signature/closedLists.test.ts
    - src/lib/server/signature/links.ts
    - src/lib/server/signature/links.test.ts
metrics:
  completed: 2026-10-04
---

# Phase 14 Plan 08: Trail wrappers and signed links Summary

Server-only wrappers for the signature audit RPCs (consent as canonical JSON of the exact texts, export self-verified by verifyChainExport) plus RLS-first 300 s preview and hash-checked 120 s sealed download links.

## Commits
- 71d40f6: chain.ts, chain.test.ts, closedLists.test.ts
- 92e1b8b: links.ts, links.test.ts

## Decisions
- createPreviewUrl logs the opening (best effort) once the RLS row read succeeds, before signing; no download option.
- createSealedDownloadUrl reads the seal row and the document filename through RLS, storage_path only via service_role, rehashes bytes before signing; hash_mismatch logs nothing and issues no URL.
- SQL error codes mapped to short codes: acceptance_refused, acceptance_mismatch, invalid_answer, document_superseded.

## Deviations from Plan
None. Worktree HEAD was reset to the specified base 0db2ff8 at start.

## Deferred Issues
- Pre-existing TS error in src/lib/signature/verifyChain.test.ts line 20 (eventType typed as string), from an earlier plan, out of scope.

## Verification
`vitest run src/lib/server/signature`: 25 tests pass.

## Self-Check: PASSED
