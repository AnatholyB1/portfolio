---
phase: 12-conversion-projects-step-engine
plan: 16
subsystem: admin-project-actions
tags: [server-actions, facts, links, files, admin-forms]
requires: ["12-03", "12-08", "12-09", "12-13"]
provides:
  - "postFactAction, revokeFactAction, addLinkAction, adminRequestUploadAction, adminConfirmUploadAction, adminDownloadAction"
  - "PostFactForm, RevokePanel, LinkForm client components"
affects: [admin-project-sheet]
key-files:
  created:
    - src/app/admin/projets/actions.ts
    - src/app/admin/projets/actions.test.ts
    - src/components/admin/projects/PostFactForm.tsx
    - src/components/admin/projects/RevokePanel.tsx
    - src/components/admin/projects/LinkForm.tsx
key-decisions:
  - "Every action calls requireAdmin() first, then zod, then getAccessibleProject on the admin RLS client, then the service_role service"
  - "No action sets or advances a step; step is only derived from facts (D-08)"
  - "Service failures map to generic French copy; changed=false maps to the already-recorded message"
requirements-completed: [PORTAL-04, PORTAL-05, ADM-01]
duration: 15min
completed: 2026-10-03
---

# Phase 12 Plan 16: Admin Project Actions Summary

Guarded admin Server Actions to record and correct facts, add https links and handle project files, with three client forms (fact with ahead warning and mail status line, mandatory-reason revoke panel, link form).

## Tasks

1. Admin Server Actions and tests (25 tests green): 07b1160
2. PostFactForm, RevokePanel, LinkForm: 0a96538

## Deviations from Plan

None in behavior. Button labels are literal strings in the components (rather than PROJECT_COPY references) so the plan's grep acceptance criteria hold; text matches PROJECT_COPY.

## Known Stubs

None. The forms are wired to the actions; 12-17 mounts them on the admin sheet.

## Threat Flags

None. T-12-56 to T-12-59 mitigated (requireAdmin first with tests asserting no service call on rejection, system-only facts excluded by schema, mandatory reason with admin actor id, https-only link schema).

## Self-Check: PASSED

Five files exist; commits 07b1160 and 0a96538 present; `rtk vitest run src/app/admin/projets/actions.test.ts` 25 pass; `rtk tsc --noEmit` and lint clean.
