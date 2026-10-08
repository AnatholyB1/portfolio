---
phase: 18-verified-reviews
plan: 07
subsystem: reminders
tags: [sweep, reviews, tdd, fail-closed]
requires: [18-01, 18-02, 18-03]
provides:
  - ensureReviewLink(admin, projectId, secret)
  - reviewConfigReady(env)
  - reviewCandidates(input, now), planReminders review_request payload { projectTitle, linkId, stage }
affects: [18-08, 18-17]
key-files:
  created:
    - src/lib/server/reviews/links.ts
    - src/lib/server/reviews/links.test.ts
  modified:
    - src/lib/server/reminders/sweep.ts
    - src/lib/server/reminders/sweep.test.ts
    - src/lib/server/mail/flags.ts
    - src/lib/server/mail/flags.test.ts
    - .env.example
requirements-completed: [REV-01, REV-02]
completed: 2026-10-08
---

# Phase 18 Plan 07: Sweep review links Summary

The daily sweep now creates the hashed review link through `sv_ensure_review_link` at J+7, reuses the same link id at J+21, skips held, reviewed and over-60-day projects, and fails closed (`review_config_invalid`) when the secret or Google URL is invalid.

## Commits
- a947e5c feat(18-07): ensureReviewLink wrapper and reviewConfigReady guard
- edf7a5f feat(18-07): sweep creates and reuses review links, stops on filed review

## Verification
`vitest run src/lib/server/reminders src/app/api/cron src/lib/server/reviews src/lib/server/mail/flags.test.ts`: all green. tsc shows no errors in touched files.

## Deviations from Plan
- Review eligibility is now marked before the link lookup (per plan), so a project whose link is unavailable keeps its open row alive; the old "no link means stale" test was rewritten accordingly. An injected `opts.reviewLink` bypasses the ensure pre-step.
- Worktree needed a node_modules symlink (git-ignored, not committed); worktree was reset to the expected base 2fb98d9 first.
- `reviewUrl` consumers outside the sweep (mail template) are out of scope for this plan and belong to the template plan.

## Known Stubs
None.

## Self-Check: PASSED
