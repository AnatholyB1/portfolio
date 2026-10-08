---
phase: 18-verified-reviews
plan: 04
subsystem: routing-privacy
tags: [privacy, robots, noindex, price-scope, throttle]
requires: []
provides:
  - PRIVATE_SUBPATH_PREFIXES ['/avis/'] and isPrivatePath subpath rule
  - robots Disallow /avis/ and X-Robots-Tag on /avis/:path+
  - price-scope zone src/app/api/avis
  - ThrottleKind review-ip and review-view-ip
affects: [18-08, 18-09]
key-files:
  modified:
    - src/lib/privateRoutes.ts
    - src/lib/privateRoutes.test.ts
    - src/proxy.test.ts
    - src/app/robots.ts
    - next.config.ts
    - src/app/sitemap.test.ts
    - src/lib/priceScope.ts
    - src/lib/priceScope.test.ts
    - src/lib/throttle.ts
decisions:
  - "/avis stays public; only strict subpaths /avis/<token> are private (D-15)"
metrics:
  tasks: 2
  completed: 2026-10-08
---

# Phase 18 Plan 04: Private token route, price-scope zone, throttle kinds Summary

Token URLs `/avis/<token>` are now private (no attribution visit, robots Disallow, noindex header) while `/avis` and `/politique-des-avis` stay public; `src/app/api/avis` is a price-scope zone and the two review throttle kinds exist.

## Commits
- c351003: private subpath, robots, next.config header, pinned tests
- Task 2 commit: priceScope zone (15 entries), throttle kinds, tests

## Verification
`vitest run` on privateRoutes, proxy, sitemap, priceScope: all green (59 tests).

## Deviations from Plan
None. The proxy matcher needed no change: the public catch-all already routes `/avis/*` to the proxy, where `isPrivatePath` now selects the private branch (session refresh, no recordVisit). The worktree had no node_modules; a symlink to the main checkout's was used (untracked, not committed).

## Known Stubs
None.

## Self-Check: PASSED
