---
phase: 12-conversion-projects-step-engine
plan: 17
subsystem: admin-project-sheet
tags: [admin, project-sheet, fact-journal, rls]
requires: ["12-10", "12-13", "12-15", "12-16"]
provides:
  - "/admin/projets/[id] sheet"
  - "FactJournal, InfoCard, OnboardingSummaryCard, ConsentCard, LinksCard"
affects: [admin-projects]
key-files:
  created:
    - src/app/admin/projets/[id]/page.tsx
    - src/components/admin/projects/FactJournal.tsx
    - src/components/admin/projects/ProjectSideCards.tsx
    - src/components/admin/projects/projectSheetUi.test.ts
key-decisions:
  - "Page order: requireAdmin(), UUID_RE check, loadProjectBundle via RLS client, notFound on null"
  - "FilesPanel file kind is derived from the filename extension via ALLOWED_FILE_TYPES (no stored kind)"
  - "Only https URLs render as links, with rel noopener noreferrer"
requirements-completed: [ADM-01, PORTAL-04, PORTAL-05, PORTAL-06]
duration: 15min
completed: 2026-10-03
---

# Phase 12 Plan 17: Admin Project Sheet Summary

Admin project sheet at /admin/projets/[id]: admin timeline, status block (step n/6, waiting on, since n days, expected action), fact form, append-only fact journal with revoke entry points, files panel and side cards (info, onboarding summary, consent history, links).

## Tasks

1. FactJournal and ProjectSideCards: 39ae8a7
2. Page and guard test (7 tests green): 68e5633

## Deviations from Plan

None in behavior.

## Deferred Issues

`src/lib/priceScope.test.ts` (b) fails pre-existing: `src/app/api/cron/mail/route.ts` imports `@/lib/server/mail/outbox`. Not caused by this plan (files not touched here); left for the owner of the mail plans.

## Known Stubs

None.

## Self-Check: PASSED
