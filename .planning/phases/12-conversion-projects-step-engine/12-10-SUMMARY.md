---
phase: 12-conversion-projects-step-engine
plan: 10
subsystem: projects-read
tags: [tdd, rls, read-layer, vitest]
requires: ["12-01", "12-02", "12-03", "12-04"]
provides:
  - "read.ts: loadClientProjects, loadProjectBundle, loadAdminProjects, latestConsent, pickActiveProject, ProjectBundle and row types"
affects: [portal-page, admin-projects-table, admin-project-sheet]
key-files:
  created:
    - src/lib/server/projects/read.ts
    - src/lib/server/projects/read.test.ts
key-decisions:
  - "All reads use the caller's RLS client with explicit column lists; the only service_role read is sv_client_last_sign_in via callRpc"
  - "Sign-in RPC failure is non-fatal: sign-ins treated as null"
  - "Fact.createdAt is mapped from created_at (matches steps.ts ordering)"
requirements-completed: [PORTAL-03, ADM-01]
duration: 10min
completed: 2026-10-03
---

# Phase 12 Plan 10: Read Layer Summary

One tested read layer giving portal and admin pages RLS-only, explicit-column loads with step state, blocking and dormant classification computed in one place.

## Tasks

1. Portal loaders and 2. loadAdminProjects: both implemented in one commit, 596f6a7 (12 tests pass via `rtk vitest run src/lib/server/projects/read.test.ts`).

## Deviations from Plan

The two TDD tasks share one file pair and were committed together (tests and implementation in a single feat commit) rather than separate RED/GREEN commits. No functional deviation.

## Known Stubs

None.

## Threat Flags

None. T-12-39 (explicit columns, no actor_id/uploaded_by), T-12-40 (single RPC call, admin precondition documented), T-12-41 (projet whitelisted against visible list) mitigated.

## Self-Check: PASSED
