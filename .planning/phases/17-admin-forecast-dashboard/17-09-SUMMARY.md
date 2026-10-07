---
phase: 17-admin-forecast-dashboard
plan: 09
subsystem: pilotage-ui
tags: [server-components, drill-down, vitest, source-guards]
requires: ["17-07", "17-08"]
provides:
  - "SourceTable.tsx: signed revenue by frozen lead source (amended D-11 label)"
  - "ProjectMarginTable.tsx: per-project margin with pilotageHref drill-down links"
  - "DetailPanel.tsx: reconciliation drill-down, composed realized-margin detail, pagination"
  - "pilotageUi.test.ts: source guards over every pilotage component"
affects: [17-12]
tech-stack:
  added: []
  patterns: ["components render view-model totals without recomputation", "hrefs only via pilotageHref"]
key-files:
  created:
    - src/components/admin/pilotage/SourceTable.tsx
    - src/components/admin/pilotage/ProjectMarginTable.tsx
    - src/components/admin/pilotage/DetailPanel.tsx
    - src/components/admin/pilotage/pilotageUi.test.ts
  modified: []
key-decisions:
  - "Links use next/link, consistent with 17-08 tiles"
requirements-completed: []
duration: 10min
completed: 2026-10-07
---

# Phase 17 Plan 09: Source, project margin and drill-down Summary

Three server components (signed by frozen lead source, per-project margin, drill-down panel) plus a guard test that bans service_role, GSAP, cursor, cinema pieces, dangerouslySetInnerHTML and literal `?` hrefs across the pilotage folder.

## Tasks

| Task | Commit |
|------|--------|
| 1 and 2 components and guard test | 827c9a6 |

Vitest (pilotage components, linkAudit): 22 pass. tsc clean.

## Deviations from Plan

- Tasks 1 and 2 were committed together in a single commit, and the guard test was written in the same step as the components rather than as a separate RED commit. The test file was written first and covers both tasks.

## Known Stubs

None.

## Self-Check: PASSED
