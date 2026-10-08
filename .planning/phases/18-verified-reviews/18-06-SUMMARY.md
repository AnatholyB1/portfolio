---
phase: 18-verified-reviews
plan: 06
subsystem: mail
tags: [outbox, transactional, hmac, reviews]
requires: [18-01, 18-02]
provides:
  - "review_published_admin and review_hidden mail events/templates (transactional)"
  - "dedupeKey.reviewPublishedAdmin, dedupeKey.reviewHidden"
  - "buildReviewUrl, buildAdminReviewsUrl"
  - "review_request link derived from linkId at render time"
key-files:
  modified:
    - src/lib/server/mail/rules.ts
    - src/lib/server/mail/rules.test.ts
    - src/lib/server/mail/reminderEmails.ts
    - src/lib/server/mail/reminderEmails.test.ts
    - src/lib/server/mail/outbox.ts
    - src/lib/server/mail/outbox.test.ts
    - src/lib/server/mail/urls.ts
    - src/lib/server/mail/paymentsMailParity.test.ts
decisions:
  - "Render failures surface as last_error render_error (existing behaviour); review_token_unavailable is the thrown message"
metrics:
  completed: 2026-10-08
---

# Phase 18 Plan 06: Review mail layer Summary

The review_request mail now renders its link from `payload.linkId` via `deriveReviewToken` (no token or URL stored in the outbox), fails closed without `REVIEW_TOKEN_SECRET`, and two new transactional mails exist: admin alert "Nouvel avis publié : n sur 5" and client notice "Votre avis a été masqué" (generic reason, reply-to contact@sevalys.com).

## Commits
- 94f86fc feat(18-06): events, dedupe keys and e-mail contents
- second commit: feat(18-06): render review link from linkId and add review mail templates

## Verification
`vitest run src/lib/server/mail`: 16 files, 149 tests pass. No tsc errors in server/mail.

## Deviations from Plan
**1. [Rule 3 - Blocking] paymentsMailParity.test.ts** compared closed lists to the phase-16 migration and failed once MAIL_EVENTS grew to 19. Pointed its list checks at 20261010000000_sv_reviews.sql (dedupe literal checks unchanged). File not in the plan's files_modified.

Environment: node_modules symlinked from the main repo (git-ignored, not committed). Worktree was reset to 2fb98d9 at start per instructions.

## Known Stubs
None.

## Self-Check: PASSED
