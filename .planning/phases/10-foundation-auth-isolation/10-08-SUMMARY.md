---
phase: 10-foundation-auth-isolation
plan: 08
subsystem: ui
tags: [nextjs, css, metadata, noindex, shells]
requires:
  - phase: 10-01
    provides: privateRoutes constants
provides:
  - src/app/portal.css (all pt-* scoped styles)
  - AuthCard, ShellHeader, ShellFooter, ShellMain, NoAccess components
  - noindex layouts for /connexion, /auth, /espace-client, /admin
  - static test privateShells.test.ts
affects: [10-05, 10-10, 10-11]
key-files:
  created:
    - src/app/portal.css
    - src/components/portal/AuthCard.tsx
    - src/components/portal/ShellHeader.tsx
    - src/components/portal/ShellFooter.tsx
    - src/components/portal/ShellMain.tsx
    - src/components/portal/NoAccess.tsx
    - src/app/connexion/layout.tsx
    - src/app/auth/layout.tsx
    - src/app/espace-client/layout.tsx
    - src/app/admin/layout.tsx
    - src/app/privateShells.test.ts
key-decisions:
  - "alternates: {} on each private layout drops the inherited root canonical (D-15)"
  - "Layouts hold no auth checks; authorization stays in pages/actions via the DAL"
requirements-completed: [FOUND-05]
completed: 2026-10-02
---

# Phase 10 Plan 08: Private shells Summary

Scoped `pt-*` stylesheet (existing tokens only, 150-200ms colour transitions, reduced-motion respected), five server-component shell building blocks, and four noindex/nofollow segment layouts with canonical override, guarded by a 20-case static test.

## Tasks

| Task | Commit |
| ---- | ------ |
| 1. Stylesheet + shell components | f3c2e38 |
| 2. RED test (privateShells.test.ts) | see git log (test(10-08)) |
| 2. Layouts (GREEN) | see git log (feat(10-08) layouts) |

## Deviations from Plan

None - plan executed as written. Extra classes beyond the contract list (`pt-card-footer`, `pt-back`, `pt-header-title`, `pt-header-actions`) were added for components; `ShellHeader` takes the logout control through the `actions` slot.

## Notes
- Worktree reset to base b57dcc8 at start; node_modules symlinked from main repo (not committed).
- Verification: `npx tsc --noEmit` clean; `npm test` 25 files, 380 tests pass (privateShells: 20).

## Known Stubs
None.

## Self-Check: PASSED
