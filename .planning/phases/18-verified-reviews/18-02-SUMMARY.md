---
phase: 18-verified-reviews
plan: 02
subsystem: reviews
tags: [hmac, zod, tdd, tokens]
requires: []
provides:
  - reviewSecret, deriveReviewToken, hashReviewToken, isWellFormedReviewToken
  - reviewSubmissionSchema, DISPLAY_MODES, composeDisplayName, REVIEW_FIELD_ERRORS
affects: [18-09]
tech-stack:
  added: []
  patterns: [HMAC-derived deterministic token, technical-only zod validation with field codes as messages]
key-files:
  created:
    - src/lib/reviews/token.ts
    - src/lib/reviews/token.test.ts
    - src/lib/reviews/schema.ts
    - src/lib/reviews/schema.test.ts
  modified: []
key-decisions:
  - "Zod issue messages are the field codes themselves; REVIEW_FIELD_ERRORS maps code to French copy"
  - "Empty firstName/lastInitial strings are treated as absent; mode-dependent requirement enforced in superRefine"
requirements-completed: [REV-01]
duration: 10min
completed: 2026-10-08
---

# Phase 18 Plan 02: Review token and submission schema Summary

HMAC-SHA256 base64url review token (deterministic, only sha256 stored) and a technical-only zod submission schema with display-name composer.

## Commits
- ba4fd2d test(18-02): add failing token tests
- 9a7bc6e feat(18-02): review token derivation
- 0ac2ed5 test(18-02): add failing review schema tests
- 20462bd feat(18-02): review submission schema

## Verification
`vitest run src/lib/reviews`: 2 files, 42 tests pass. No tsc errors in src/lib/reviews.

## Deviations from Plan
None. Environment note: the worktree had no node_modules, so a symlink to the main repo's node_modules was created (git-ignored, not committed).

## Known Stubs
None.

## Self-Check: PASSED
