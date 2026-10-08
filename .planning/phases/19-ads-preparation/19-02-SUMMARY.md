---
phase: 19-ads-preparation
plan: 02
subsystem: ads
tags: [uuid, uuidv5, event-taxonomy, conversions]
requires: []
provides:
  - "src/lib/ads/events.ts: closed event taxonomy, conversion ranks, eventIdFor, newPreLeadEventId"
affects: [19-03, 19-05, 19-07, 19-10]
tech-stack:
  added: [uuid@14.0.2]
  patterns: [pure shared module, deterministic UUIDv5 ids]
key-files:
  created: [src/lib/ads/events.ts, src/lib/ads/events.test.ts]
  modified: [package.json, package-lock.json]
decisions:
  - "uuid (not node:crypto) so event ids derive identically in browser, proxy and server"
metrics:
  completed: 2026-10-08
---

# Phase 19 Plan 02: Event taxonomy and deterministic event_id Summary

Pure `src/lib/ads/events.ts` defining the closed 9-event taxonomy, the 4-step conversion ladder and UUIDv5 `eventIdFor` under the frozen namespace, backed by `uuid@14.0.2`.

## Tasks

| Task | Commit | Notes |
|------|--------|-------|
| 1 Install uuid | 762c4b0 | exact pin 14.0.2 |
| 2 RED tests | see git log (test(19-02)) | failed: module missing |
| 2 GREEN impl | see git log (feat(19-02)) | 19 tests pass (events + priceScope) |

## Supply-chain check (T-19-SC)
- `npm view uuid@14.0.2 scripts.postinstall`: empty
- `npm view uuid@14.0.2 repository.url`: git+https://github.com/uuidjs/uuid.git
- Ships its own types (`dist/index.d.ts`); no @types package needed.

## Verification
- vitest events.test.ts + priceScope.test.ts: 19 passed
- tsc --noEmit: clean
- grep for node:/next/supabase/server-only/€/cents in events.ts: 0

## Deviations from Plan
None. The worktree was reset to the plan base commit 032ee1c at startup as instructed.

## Known Stubs
None.

## Self-Check: PASSED
