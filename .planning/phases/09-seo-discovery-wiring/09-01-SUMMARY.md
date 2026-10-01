---
phase: 09-seo-discovery-wiring
plan: 01
subsystem: seo
tags: [sitemap, llms-txt, vitest, seo]
requires: []
provides:
  - sitemap with 9 service pages + /simulateur derived from services data
  - llms.txt link inventory with individual service pages
affects: [09-seo-discovery-wiring]
tech-stack:
  added: []
  patterns: [drift-guard tests derived from src/data/services.ts]
key-files:
  created: [src/app/sitemap.test.ts, src/app/llms.test.ts]
  modified: [src/app/sitemap.ts, public/llms.txt]
key-decisions:
  - "Service pages and /simulateur use priority 0.8 monthly in sitemap"
requirements-completed: [SEO-01]
duration: 4min
completed: 2026-10-01
---

# Phase 9 Plan 01: Sitemap and llms.txt discovery wiring Summary

Sitemap now derives 9 `/services/{slug}` entries from `services` plus `/simulateur` (15 unique URLs), and llms.txt lists all service pages and the simulator with the "tarifs" label removed, both guarded by vitest.

## Tasks
1. Sitemap entries (TDD): RED 2 commits, GREEN `feat(09-01): add service pages and /simulateur to sitemap`
2. llms.txt relabel + 10 links (TDD): RED test commit, GREEN `feat(09-01): relabel llms.txt ...`

## Deviations from Plan
None - plan executed exactly as written. Verification: vitest src/app src/lib src/data 314 passed; tsc clean.

## Issues
`graphify update .` failed ("expected string or bytes-like object, got 'NoneType'"); graph not refreshed, unrelated to plan code.

## Self-Check: PASSED
