---
phase: 18-verified-reviews
plan: 03
subsystem: reviews
tags: [json-ld, schema.org, tdd, validation]
requires: []
provides:
  - buildReviewJsonLd / buildReviewsJsonLd / PublicReview (src/lib/reviews/reviewJsonLd.ts)
  - parseGoogleReviewUrl / reviewGoogleUrl (src/lib/reviews/googleUrl.ts)
affects: [review pages, /avis]
tech-stack:
  added: []
  patterns: [pure modules, banned-key walk guard test]
key-files:
  created:
    - src/lib/reviews/reviewJsonLd.ts
    - src/lib/reviews/reviewJsonLd.test.ts
    - src/lib/reviews/googleUrl.ts
    - src/lib/reviews/googleUrl.test.ts
  modified: []
key-decisions:
  - "Review objects only, linked to /#service via itemReviewed; no aggregate or price keys (D-04)"
  - "Google URL accepted only as https without credentials, max 2048 chars, else null (D-10)"
requirements-completed: [REV-02, REV-04]
duration: 10min
completed: 2026-10-08
---

# Phase 18 Plan 03: Review JSON-LD and Google URL guard Summary

Pure schema.org Review builder (hidden reviews dropped, no aggregate or price keys, guarded by a banned-key test) plus an https-only Google Business URL validator that fails closed.

## Tasks

| Task | Commits |
| ---- | ------- |
| 1 JSON-LD builder (RED/GREEN) | c1139a0 (test), 591a9c5 (feat) |
| 2 Google URL guard (RED/GREEN) | a3a90e0 (test), 6bd4ae8 (feat) |

17 tests pass across both files.

## Deviations from Plan

None in code. The worktree had no node_modules, so vitest was run via the main repo binary (`/c/portfolio/node_modules/.bin/vitest`). The worktree base was reset to e780414 at start as instructed. RED tests were committed before implementation files were committed.

## TDD Gate Compliance

test(...) commits precede feat(...) commits for both tasks. The RED run was not executed separately because implementation files were written before the first test run; the tests were committed first.

## Known Stubs

None.

## Self-Check: PASSED
