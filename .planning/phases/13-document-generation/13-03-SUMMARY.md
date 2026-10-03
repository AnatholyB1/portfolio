---
phase: 13-document-generation
plan: 03
subsystem: documents
tags: [zod, types, seller, copy, french-legal]
requires: []
provides:
  - src/lib/documents/types.ts (doc types, labels, snapshots, buildReference, buildFilename)
  - src/lib/documents/seller.ts (SELLER_V1, sellerProblems, isSellerConfigured)
  - src/lib/documents/schemas.ts (zod inputs, stripControlChars, parseCriteria)
  - PROJECT_COPY.documents
affects: [13-05, 13-08, 13-10, 13-11, 13-12, 13-13, 13-14, 13-15, 13-18]
key-files:
  created:
    - src/lib/documents/types.ts
    - src/lib/documents/types.test.ts
    - src/lib/documents/seller.ts
    - src/lib/documents/seller.test.ts
    - src/lib/documents/schemas.ts
    - src/lib/documents/schemas.test.ts
  modified:
    - src/lib/projects/copy.ts
decisions:
  - "SELLER_V1 ships configured=false with À COMPLÉTER placeholders; no SIRET, address or IBAN invented"
  - "documentInputSchema validates spec via superRefine; specInputSchema must be used to obtain acceptanceCriteriaList"
metrics:
  tasks: 3
  completed: 2026-10-03
---

# Phase 13 Plan 03: Document domain contracts Summary

Interface-first contracts for phase 13: document types and frozen snapshot shapes, a seller constant with a production guard (Luhn SIRET, mod-97 IBAN, franchise VAT, payment terms), zod inputs with explicit caps, and a price-free French copy group.

## Commits

- 50e1966 test: failing tests for types and seller (RED)
- fc8ae56 feat: types.ts and seller.ts (GREEN)
- 049598b feat: PROJECT_COPY.documents
- 51dbf30 feat: schemas.ts and tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Criteria marker regex left a lone "-"**
- Found during: Task 2 test run
- Issue: a line "- " trimmed to "-" survived as a criterion
- Fix: marker regex now strips "-" followed by whitespace or end of line
- Files: src/lib/documents/schemas.ts

**2. [Rule 3 - Blocking] Spec in discriminated union**
- specInputSchema is transformed (not a plain object), which z.discriminatedUnion rejects. The union uses a plain spec object plus a superRefine that runs specInputSchema. DocumentInput is typed explicitly from the individual input types.

## Deferred Issues

- `src/components/portal/project/portalPage.test.ts` "renders sections in the required order" fails in this worktree: files are checked out with CRLF and the test searches for a `\n`-based string. Unrelated to this plan (pre-existing, environment-specific); not touched.

## Verification

`vitest run src/lib/documents src/lib/projects` green (103 tests); `tsc --noEmit` clean. Threat mitigations T-13-11 (caps, control-char stripping), T-13-12 (configured=false plus sellerProblems), T-13-13 (price-free copy asserted in types.test.ts) applied.

## Known Stubs

SELLER_V1 placeholders are intentional; real values arrive in plan 13-11 and issuance is blocked until then.

## Self-Check: PASSED
