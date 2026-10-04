---
phase: 14-electronic-signature
plan: 09
subsystem: signature
tags: [pdf-lib, seal, certificate, storage, rpc]
requires:
  - phase: 14-01
    provides: loadCertificateFonts, pdf-lib compatibility
  - phase: 14-03
    provides: buildCertificateData, pdfSafe
  - phase: 14-04
    provides: sv_seal_document RPC
provides:
  - "appendCertificatePages (Surface E layout, multi-page reserves)"
  - "buildSealedPdf and idempotent finalizeSignature (A/B/C)"
  - "afterFactPosted exported from facts.ts"
affects: [14-10, 14-11]
key-files:
  created:
    - src/lib/server/signature/certificatePdf.ts
    - src/lib/server/signature/seal.ts
    - src/lib/server/signature/seal.test.ts
  modified:
    - src/lib/server/projects/facts.ts
    - src/lib/server/projects/facts.test.ts
key-decisions:
  - "buildSealedPdf takes an optional third argument signedAt (Date) used for PDF creation/modification dates, because CertificateData holds formatted strings only"
  - "appendCertificatePages takes an optional fonts argument defaulting to loadCertificateFonts()"
requirements-completed: [SIGN-04, SIGN-05]
completed: 2026-10-04
---

# Phase 14 Plan 09: Sealed PDF and finalization Summary

Original pages are kept byte-identical and one or more certificate pages are appended with pdf-lib; finalizeSignature re-hashes the original, uploads with upsert:false to a random path, then calls sv_seal_document, so no fact exists without a seal.

## Tasks

| Task | Commit | Content |
| ---- | ------ | ------- |
| 1 | 497596a | certificatePdf.ts: Surface E layout, word wrap, reserve table paginated with footer on every certificate page |
| 2 | 14e49a4 | seal.ts, seal.test.ts, afterFactPosted extracted from post() in facts.ts with tests |

## Verification

`rtk vitest run src/lib/server/signature src/lib/server/projects`: 85 passed. Tests use real renderDocument output (quote, acceptance with 2 and 40 reserves), compare original page content streams, extract the certificate text with unpdf, and cover each failure code (not_signed, hash_mismatch, too_large, upload_failed, seal_failed, already_sealed) including that no RPC or fact happens on upload failure.

## Deviations from Plan

- Worktree base reset to 0db2ff8 as the startup check required.
- Added the optional `signedAt` and `fonts` parameters described above.
- finalizeSignature additionally returns `code: 'error'` for read/download failures (not in the plan's list).

## Deferred Issues

`rtk tsc --noEmit` reports one pre-existing error in `src/lib/signature/verifyChain.test.ts` (eventType typing, plan 14-03 file). Out of scope, untouched.

No stubs. No new threat surface beyond the plan's threat model.

## Self-Check: PASSED

- certificatePdf.ts, seal.ts, seal.test.ts: FOUND
- Commits 497596a and 14e49a4: FOUND
