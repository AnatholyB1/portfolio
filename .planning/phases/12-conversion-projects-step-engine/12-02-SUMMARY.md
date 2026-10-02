---
phase: 12-conversion-projects-step-engine
plan: 02
subsystem: projects-engine
tags: [tdd, pure-functions, vitest, step-engine]
requires: []
provides:
  - "steps.ts: FACT_TYPES, STEPS, FACT_LABELS, ADMIN_POSTABLE_FACTS, DONE_COPY, effectiveFacts, deriveProjectState, isFactAhead"
  - "blocking.ts: DORMANT_AFTER_DAYS, lastActivity, daysSince, classifyProject, filterProjects, sortProjects, SORT_KEYS, ETAPE_FILTERS, BLOCAGE_FILTERS"
affects: [12-03, portal, admin-projects, step_changed-mail]
key-files:
  created:
    - src/lib/projects/steps.ts
    - src/lib/projects/steps.test.ts
    - src/lib/projects/blocking.ts
    - src/lib/projects/blocking.test.ts
key-decisions:
  - "Step derived only from effective facts with prefix gates; no setter exported"
  - "D-21 scoped deviation: 'fichier demandé non fourni' not modeled in phase 12"
requirements-completed: [PORTAL-03, PORTAL-04, ADM-01]
duration: 10min
completed: 2026-10-03
---

# Phase 12 Plan 02: Step Engine and Blocking Summary

Pure, client-safe step engine (facts to current step, who waits, since when) and blocking/filter/sort logic with whitelisted query-param values.

## Tasks

1. steps.ts: RED 3c29148, GREEN d3f62e5 (12 tests)
2. blocking.ts: RED 43379cd, GREEN 327d452 (14 tests)

## Verification

`npx vitest run src/lib/projects` passes (33 tests including 12-01 guards); no tsc errors in src/lib/projects.

## Deviations from Plan

None. Default sort ranks admin-waiting, then client-waiting, then done (done last), each by daysWaiting desc.

## TDD Gate Compliance

test then feat commits present for both tasks. No refactor needed.

## Known Stubs

None.

## Self-Check: PASSED
