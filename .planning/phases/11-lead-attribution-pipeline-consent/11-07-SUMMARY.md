---
phase: 11-lead-attribution-pipeline-consent
plan: 07
subsystem: api
tags: [proxy, attribution, consent, cookies, vitest]

requires:
  - phase: 11-02
    provides: attribution params, touch and cookie modules
  - phase: 11-03
    provides: sv_consent parsing and ATTR_COOKIE_BEFORE_CONSENT switch
provides:
  - src/proxy.ts public attribution branch (sv_attr_ft / sv_attr_lt) plus anonymous visit counter
  - src/lib/leads/visits.ts recordVisit
affects: [11-11, 11-12]

key-files:
  created:
    - src/lib/leads/visits.ts
  modified:
    - src/proxy.ts
    - src/proxy.test.ts

key-decisions:
  - "Private branch moved verbatim into privateBranch(); public branch never calls Supabase auth"
  - "Matcher gained one static object entry with missing[] for prefetch headers"

requirements-completed: [LEAD-01]

duration: 8min
completed: 2026-10-02
---

# Phase 11 Plan 07: Proxy Attribution Branch Summary

**Server-side arrival capture in the proxy: httpOnly first/last-touch cookies gated by consent (click ids only when accepted, 10-minute first-touch enrichment after Accept), plus a waitUntil anonymous visit counter, with the phase-10 private gate unchanged.**

## Tasks

1. proxy.test.ts rewrite (static matcher + 20 behaviour tests) and visits.ts - 4b61266 (RED: 13 of 20 failed)
2. Public attribution branch in proxy.ts - 9429703

## Verification

`npx vitest run src/proxy.test.ts src/lib/privateRoutes.test.ts src/lib/priceScope.test.ts`: 3 files, 40 tests pass. eslint and `tsc --noEmit` clean. `updateSession` appears twice in proxy.ts, no `@/lib/server` import, no `runtime` export.

## Deviations from Plan

None - plan executed as written.

## Known Stubs

None.

## Self-Check: PASSED
