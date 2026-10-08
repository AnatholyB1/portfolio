---
phase: 18-verified-reviews
plan: 08
subsystem: reviews
tags: [api, supabase-rpc, reviews]
requires: [18-01, 18-02, 18-03, 18-04, 18-06]
provides: [getPublishedReviews, getReviewLinkState, "POST /api/avis", "GET /api/avis/recent"]
affects: [public review pages, home excerpt]
key-files:
  created:
    - src/lib/reviews/publicReviews.ts
    - src/lib/reviews/linkState.ts
    - src/app/api/avis/route.ts
    - src/app/api/avis/recent/route.ts
metrics:
  tasks: 2
  completed: 2026-10-08
---

# Phase 18 Plan 08: Review data modules and API routes Summary

Public review read modules (outside src/lib/server) plus a throttled POST /api/avis that publishes through sv_submit_review and a CDN-cacheable GET /api/avis/recent.

## Commits
- 3174110: public data modules (publicReviews, linkState) with tests
- Task 2 commit: submit and recent routes with tests (see git log, "feat(18-08): POST /api/avis")

## Behavior
- POST: throttle (review-ip, 10 per 10 min) -> 415 / 400 (field codes) -> 410 for malformed token or non-published outcome -> RPC -> admin outbox mails (failure logged, still 200). No branch on rating or content.
- recent: max 3, display fields only, `public, s-maxage=300, stale-while-revalidate=600`.
- Tests: 7 (data modules) + 23 including priceScope; all green.

## Deviations from Plan
None - plan executed exactly as written.

## Self-Check: PASSED
