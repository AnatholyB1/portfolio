---
phase: 12-conversion-projects-step-engine
plan: 15
subsystem: admin-projects-list
tags: [admin, table, filters, sorting, source-guard]
requires: ["12-02", "12-03", "12-10"]
provides:
  - "/admin/projets page (requireAdmin, RLS client, whitelisted etape/blocage/tri/ordre)"
  - "ProjectsTable (sortable, aria-sort, badges Client/Sevalys/Termine + Dormant)"
  - "ProjectFilters (GET form), projects.css (pt-proj-*), AdminNav 'Projets' entry"
affects: [admin-project-sheet]
key-files:
  created:
    - src/app/admin/projets/page.tsx
    - src/components/admin/projects/ProjectsTable.tsx
    - src/components/admin/projects/ProjectFilters.tsx
    - src/components/admin/projects/projects.css
    - src/components/admin/projects/projectsAdminUi.test.ts
  modified:
    - src/components/admin/AdminNav.tsx
key-decisions:
  - "Dormant badge shows days since last activity (daysSince(lastActivityAt)), not daysWaiting"
  - "Pager omitted: whole list is loaded and sorted in memory by the pure helpers"
requirements-completed: [ADM-01]
duration: 8min
completed: 2026-10-03
---

# Phase 12 Plan 15: Admin Projects List Summary

/admin/projets lists every project with step, who is waiting and a Dormant badge, with GET filters and sortable columns, all read through the admin RLS client.

## Tasks

1. AdminNav entry, ProjectFilters, ProjectsTable, projects.css: c03e594
2. Page and source-guard test (7 assertions, green): 806ced9

## Deviations from Plan

None functionally. The optional pager (only if more than 50 rows) was not added; in-memory sort over the full list makes server paging inapplicable for now.

## Verification

tsc clean; `vitest run src/components/admin` 16 passed.

## Known Stubs

None.

## Self-Check: PASSED
