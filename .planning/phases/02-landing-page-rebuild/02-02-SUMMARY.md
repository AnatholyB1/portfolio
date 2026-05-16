---
phase: 02-landing-page-rebuild
plan: "02"
subsystem: dependencies-and-cleanup
tags: [gsap, animation, cleanup, deletion, wave-1]
dependency_graph:
  requires: []
  provides: [gsap-package, freelance-era-files-removed]
  affects: [02-04-PhoneAgent, 02-05-page-rewrite]
tech_stack:
  added: [gsap@3.15.0]
  patterns: []
key_files:
  created: []
  modified:
    - package.json
    - package-lock.json
  deleted:
    - src/components/sections/Hero.tsx
    - src/components/sections/About.tsx
    - src/components/sections/Projects.tsx
    - src/components/sections/PhoneAgentPromo.tsx
    - src/components/sections/Contact.tsx
    - src/components/three/Scene.tsx
    - src/components/three/FloatingShapes.tsx
    - src/components/three/StarkDisplay.tsx
decisions:
  - "gsap core only — no @gsap/react; dynamic import in useEffect avoids SSR issues per D-02"
  - "page.tsx left with broken imports intentionally — resolved in Wave 4 (plan 02-05)"
metrics:
  duration: "~2 min"
  completed: "2026-05-16T21:04:49Z"
  tasks_completed: 2
  tasks_total: 2
requirements: [LAND-04, LAND-08]
---

# Phase 02 Plan 02: GSAP Install + Freelance-Era Cleanup Summary

**One-liner:** Installed gsap 3.15.0 (with ScrollTrigger) and permanently deleted 8 freelance-era section/Three.js components that block the clean Wave 4 page rewrite.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install gsap package | bdd2481 | package.json, package-lock.json |
| 2 | Delete freelance-era component files (D-01) | e09d3a1 | 8 files deleted |

## What Was Done

### Task 1: Install gsap package

Ran `npm install gsap` from the project root. GSAP 3.15.0 was added to `dependencies` in `package.json`. Both `require('gsap')` and `require('gsap/ScrollTrigger')` confirm importable. Only the core `gsap` package was installed — no `@gsap/react` — as the PhoneAgent section will use dynamic import inside `useEffect` per decision D-02.

### Task 2: Delete freelance-era component files

All 8 files identified in decision D-01 were deleted:
- **Sections:** Hero.tsx, About.tsx, Projects.tsx, PhoneAgentPromo.tsx, Contact.tsx
- **Three.js:** Scene.tsx, FloatingShapes.tsx, StarkDisplay.tsx

Safety checks confirmed before deletion:
- `src/app/services/page.tsx` only imports `PartnersBanner` from sections — unaffected
- `PartnersBanner.tsx`, `ClientProviders.tsx`, `CinemaIntro.tsx`, `CustomCursor.tsx`, `useReveals.ts` all remain intact

`src/app/page.tsx` now has 5 broken imports — this is intentional and documented. Plan 02-05 (Wave 4) will completely rewrite page.tsx, eliminating all these import references.

## Deviations from Plan

None — plan executed exactly as written. Both tasks matched their acceptance criteria on first attempt.

## Verification

All success criteria confirmed:

1. `grep '"gsap"' package.json` -> `"gsap": "^3.15.0"` (version with semver)
2. `node -e "require('gsap/ScrollTrigger'); console.log('ScrollTrigger ok')"` -> exits 0
3. `ls src/components/sections/` -> only `PartnersBanner.tsx` remains
4. `src/components/three/` -> empty (all 3 files deleted)
5. `ls src/components/ui/ClientProviders.tsx` -> confirmed present
6. `src/app/services/page.tsx` imports only `PartnersBanner` from sections — no breakage

## Known Stubs

None — this plan installs a package and deletes files. No UI or data stubs created.

## Threat Flags

No new network endpoints, auth paths, or file access patterns introduced. gsap is a widely-used animation library; version pinned via package-lock.json (T-02-03: accepted per threat model).

## Self-Check: PASSED

- `package.json` confirmed: gsap ^3.15.0 in dependencies
- Commit bdd2481 confirmed: `feat(02-02): install gsap 3.15.0 package`
- Commit e09d3a1 confirmed: `feat(02-02): delete 8 freelance-era component files (D-01)`
- 8 deleted files confirmed gone via `ls` checks
- PartnersBanner.tsx and ClientProviders.tsx confirmed present
