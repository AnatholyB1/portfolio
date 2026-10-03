---
phase: 12-conversion-projects-step-engine
plan: 19
subsystem: client-portal-page
tags: [portal, timeline, who-waits, onboarding, files, consent]
requires: ["12-10", "12-13", "12-18"]
provides:
  - "/espace-client project page (hero, who-waits, timeline, onboarding, files, links, consent, interlocutor)"
  - "ClientNav, WhoWaits, PortalLinks, ProjectSelector components"
affects: []
key-files:
  created:
    - src/components/portal/project/ClientNav.tsx
    - src/components/portal/project/WhoWaits.tsx
    - src/components/portal/project/PortalLinks.tsx
    - src/components/portal/project/ProjectSelector.tsx
    - src/components/portal/project/portalPage.test.ts
  modified:
    - src/app/espace-client/page.tsx
    - src/components/portal/project/project.css
key-decisions:
  - "Active project = pickActiveProject with ?projet= accepted only if RLS-visible; empty activity map falls back to started_at"
  - "File kind computed from filename extension via ALLOWED_FILE_TYPES, same as admin sheet"
  - "Client nav/selector styles appended to project.css under .pt-root"
requirements-completed: [PORTAL-02, PORTAL-03, PORTAL-05, PORTAL-06]
duration: 15min
completed: 2026-10-03
---

# Phase 12 Plan 19: Client Project Page Summary

The `/espace-client` placeholder is replaced by the real project page: hero with who-waits panel, client timeline, and the 12-18 OnboardingCard and ConsentCard now mounted, with FilesPanel, read-only https links, selector and nav.

## Tasks

1. ClientNav, WhoWaits, PortalLinks, ProjectSelector: 5a2569c
2. Page rewrite and guard test (9 tests): ebea7aa

## Deviations from Plan

None in behavior. `sr-only` uses the repo's `pt-sr-only` class.

## Deferred Issues

Full suite: 1020 pass, 1 pre-existing failure in `src/app/linkAudit.test.ts` (unknown template href `/admin/projets/${projectId}` in `src/app/admin/leads/[id]/page.tsx`, from plan 12-14). Not caused by this plan; needs an explicit entry in the link audit.

## Known Stubs

None.

## Self-Check: PASSED

Files exist, commits 5a2569c and ebea7aa present; tsc clean; portal tests 44 pass.
