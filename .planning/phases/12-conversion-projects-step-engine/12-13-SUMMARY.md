---
phase: 12-conversion-projects-step-engine
plan: 13
subsystem: project-ui-shared
tags: [timeline, files-panel, css, source-guard, a11y]
requires: ["12-02", "12-03"]
provides:
  - "Timeline({ state, variant }) server component shared by portal and admin"
  - "FilesPanel client component (XHR PUT upload with progress, attachment download)"
  - "project.css (pt-step-*, pt-who-*, pt-onb-*, pt-file-*, pt-consent-*) scoped under .pt-root"
  - "types.ts: FileActionsProps, FilesPanelProps, FileRowView, result types"
affects: [portal-page, admin-project-sheet]
key-files:
  created:
    - src/components/portal/project/types.ts
    - src/components/portal/project/Timeline.tsx
    - src/components/portal/project/FilesPanel.tsx
    - src/components/portal/project/project.css
    - src/components/portal/project/projectUi.test.ts
key-decisions:
  - "Upload body is FormData with cacheControl and the file under key '' (supabase-js uploadToSignedUrl format); no manual Content-Type"
  - "Empty browser MIME (ai, eps) falls back to the first allowed MIME for the extension before client-side validation"
  - "Client timeline variant never renders completedBy; admin variant appends actor kind"
requirements-completed: [PORTAL-03, PORTAL-05]
duration: 12min
completed: 2026-10-03
---

# Phase 12 Plan 13: Shared Project UI Summary

Shared accessible 6-step timeline, direct-upload files panel and scoped project stylesheet, guarded by a source-level test.

## Tasks

1. Timeline and project.css: 7010564
2. FilesPanel and types: 7c0445a
3. Source-guard test (12 assertions, green): 899d5b0

## Deviations from Plan

None in behavior. Dates use `formatDateFr` as the plan specifies (numeric fr-FR, dd/mm/yyyy), whereas the UI-SPEC example shows a long form ("12 octobre 2026"); a long-date formatter can be swapped in later without touching components' structure.

Test fix during Task 3: the scoping assertion regex initially matched `.pt-root` itself; corrected before commit.

## Known Stubs

None. FilesPanel takes Server Actions as props, which later plans (portal and admin pages) wire.

## Threat Flags

None. T-12-48 (no dangerouslySetInnerHTML, no previews, guard test) and T-12-49 (client variant omits actor) are mitigated.

## Self-Check: PASSED

All five files exist; commits 7010564, 7c0445a, 899d5b0 present; `rtk vitest run src/components/portal/project` 12 pass; `rtk tsc --noEmit` clean.
