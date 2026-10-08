---
phase: 19-ads-preparation
plan: 04
subsystem: attribution
tags: [utm, canonicalisation, cookie, attribution]
requires: [19-01]
provides:
  - parseAttrParamsWithRaw (canonical params + raw audit values)
  - Touch.raw and Touch.eid optional fields
  - cookie fields w (raw) and e (pre-lead event id)
affects: [19-05]
key-files:
  modified:
    - src/lib/attribution/params.ts
    - src/lib/attribution/params.test.ts
    - src/lib/attribution/touch.ts
    - src/lib/attribution/touch.test.ts
    - src/lib/attribution/cookie.ts
    - src/lib/attribution/cookie.test.ts
decisions:
  - raw is recomputed on decode from legacy cookies so older cookies still gain audit data
metrics:
  tasks: 2
  completed: 2026-10-08
---

# Phase 19 Plan 04: Canonical UTM at capture Summary

Pure attribution layer now canonicalises utm_source/utm_medium aliases at parse time (via utm.ts), keeps the original value as `raw`, and carries an optional pre-lead v4 event id through the cookie.

## Tasks
1. Parse-time canonicalisation, `parseAttrParamsWithRaw`, `Touch.raw/eid` - commit 32d1822
2. Cookie `w`/`e` fields with strict validation, size guard drops w then e first - commit 8e81984

## Verification
`vitest run src/lib/attribution` 87 tests pass; `tsc --noEmit` clean. Idempotence tested over all aliases.

## Deviations from Plan
None in behaviour. The worktree started from an older base and was reset to the specified SHA as instructed. Files were normalised to LF to match the repo.

## Known Stubs
None.

## Self-Check: PASSED
