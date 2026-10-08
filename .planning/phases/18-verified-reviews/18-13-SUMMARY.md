---
phase: 18-verified-reviews
plan: 13
subsystem: admin-reviews
tags: [admin, reviews, reissue, server-actions]
requires: ["18-01", "18-02", "18-06", "18-12"]
provides:
  - "reissueReviewLinkAction (src/app/admin/avis/reissue.actions.ts)"
  - "loadReviewLinkStatus, loadOpenReviewLinks, reviewLinkStatusOf (src/lib/server/reviews/linksAdmin.ts)"
  - "ReviewLinkStatus type (src/lib/reviews/linkStatus.ts)"
  - "ReissueReviewLinkCard on project sheet and /admin/avis"
key-files:
  created:
    - src/app/admin/avis/reissue.actions.ts
    - src/app/admin/avis/reissue.actions.test.ts
    - src/lib/server/reviews/linksAdmin.ts
    - src/lib/server/reviews/linksAdmin.test.ts
    - src/lib/reviews/linkStatus.ts
    - src/components/admin/reviews/ReissueReviewLinkCard.tsx
  modified:
    - src/app/admin/projets/[id]/page.tsx
    - src/app/admin/avis/page.tsx
requirements: [REV-01]
metrics:
  tasks: 2
  completed: 2026-10-08
---

# Phase 18 Plan 13: Review link reissue Summary

Admins can reissue a review link (old one invalidated by the RPC, journaled with actor and detail); the new URL is returned once and lives only in component state.

## Commits
- 0d839e8: reissue action and link-status loader with tests (11 tests)
- db2f374: reissue card and page integrations
- Follow-up commit: ReviewLinkStatus moved to a non-server module (see deviation)

## Verification
`vitest run src/app/admin src/lib/server/reviews src/lib/priceScope.test.ts`: 241/241 pass. `tsc --noEmit` clean.

## Deviations from Plan
**[Rule 3 - Blocking] ReviewLinkStatus type location.** The priceScope server-only boundary test fails when a 'use client' file imports from a server-only module, even with `import type`. Moved the type to `src/lib/reviews/linkStatus.ts` and re-exported it from linksAdmin.ts; the card imports from the new module.

Other notes: client name column is `sv_clients.name`; the project-sheet link-status load is wrapped in `.catch(() => null)` so a read failure hides the card rather than breaking the page.

## Known Stubs
None.

## Self-Check: PASSED
