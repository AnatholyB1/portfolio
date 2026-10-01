---
phase: 10-foundation-auth-isolation
plan: 06
subsystem: auth
tags: [seo, posthog, robots, vitest, boundaries]
requires:
  - phase: 10-01
    provides: PRIVATE_PREFIXES, isPrivatePath
provides:
  - route-aware ClientProviders (no cinema/cursor on private paths)
  - PostHog opt-out and lazy init on private paths
  - robots disallow, X-Robots-Tag headers, sitemap/llms exclusion tests
  - priceScope zones and import-boundary guard tests
affects: [10-08, 10-10, 10-11]
key-files:
  created: [src/lib/priceScope.ts, src/lib/priceScope.test.ts]
  modified:
    - src/components/ui/ClientProviders.tsx
    - src/components/analytics/PostHogProvider.tsx
    - src/app/robots.ts
    - next.config.ts
    - src/app/sitemap.test.ts
    - src/app/llms.test.ts
key-decisions:
  - "GUARDED_PUBLIC_FILES lists the 8 existing guard test files"
  - "Header/robots cases appended to sitemap.test.ts"
requirements-completed: [FOUND-05, FOUND-06]
completed: 2026-10-02
---

# Phase 10 Plan 06: Route-aware providers, indexing exclusion, price scope Summary

Private routes get no cinema intro, no custom cursor, no PostHog capture, and are excluded from robots, sitemap, llms and tagged noindex; the no-price scope is now explicit constants with import-boundary tests.

## Tasks
| Task | Commit |
| ---- | ------ |
| 1. Providers + indexing exclusion | 328f5ad |
| 2. priceScope + boundary guards | 5f726f0 |

## Deviations from Plan
None. Existing assertions untouched (only additions). Worktree: symlinked main repo node_modules (gitignored, not committed); reset to base b57dcc8 at startup.

## Verification
`npx tsc --noEmit` clean; `npm test`: 25 files, 372 tests pass. Manual dev-server spot check not performed.

## Known Stubs
None.

## Self-Check: PASSED
