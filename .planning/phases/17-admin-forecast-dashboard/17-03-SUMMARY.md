---
phase: 17-admin-forecast-dashboard
plan: 03
subsystem: pilotage
tags: [pipeline, signed-revenue, attribution, pure-modules, tdd]
requires: []
provides:
  - "quotes.ts: buildQuoteStates, pipeline, signedInRange, signedAsOf, signedNow, quoteTotalCents, effectiveSignedAt"
  - "attribution.ts: signedBySource, DIRECT_NO_LEAD, LEAD_MISSING"
affects: [17-07]
tech-stack:
  added: []
  patterns: ["pure modules, structural range type", "base at signing + dated amendment deltas"]
key-files:
  created:
    - src/lib/server/pilotage/quotes.ts
    - src/lib/server/pilotage/quotes.test.ts
    - src/lib/server/pilotage/attribution.ts
    - src/lib/server/pilotage/attribution.test.ts
  modified: []
key-decisions:
  - "Invalid snapshot totals become quote_invalid_amount anomalies and the doc is treated as absent, never 0"
  - "Contract without any quote at signing: base 0, no amendments, contract_without_quote anomaly"
  - "Attribution rows: not-found lead row sorts just before the no-lead row"
requirements-completed: []
duration: 15min
completed: 2026-10-07
---

# Phase 17 Plan 03: Pipeline, signed revenue and source attribution Summary

Pure, tested quote-side rules: pipeline from active quote heads, signed revenue reconstructible at any date through dated amendment deltas, and signed revenue split by the frozen lead source.

## Tasks

| Task | Commits |
|------|---------|
| 1. quotes.ts | RED: test(17-03) quotes; GREEN: feat(17-03) quotes |
| 2. attribution.ts | RED: test(17-03) attribution; GREEN: feat(17-03) attribution |

20 tests pass (13 quotes, 7 attribution). Telescoping (signedNow = head total) and period additivity are covered.

## Deviations from Plan

None in behavior. Minor: the attribution header comment says "jamais la première touche" instead of "first_touch" so the acceptance grep for first_touch returns 0.

## Known Stubs

None.

## Self-Check: PASSED
