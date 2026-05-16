---
phase: 02-landing-page-rebuild
plan: "02"
subsystem: dependencies-and-cleanup
tags: [gsap, cleanup, deletion, wave-1]
dependency_graph:
  requires: []
  provides: [gsap-package, clean-component-slate]
  affects: [02-05-page-rewrite, 02-03-phonagent]
tech_stack:
  added: [gsap@3.15.0]
  patterns: [npm-install, file-deletion]
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
  - gsap 3.15.0 installed via npm — satisfies D-02 for PhoneAgent ScrollTrigger in Wave 3
  - 8 freelance-era component files deleted per D-01 — page.tsx broken imports are intentional, resolved in Wave 4
metrics:
  duration: "~2 min"
  completed: "2026-05-16T21:05:05Z"
  tasks_completed: 2
  files_changed: 10
requirements: [LAND-04, LAND-08]
---

# Phase 2 Plan 02: GSAP Install and Freelance-Era Cleanup Summary

**One-liner:** Installed gsap@3.15.0 and deleted all 8 freelance-era components (5 section files + 3 Three.js files), clearing the slate for Phase 2 section builds.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Install gsap package | bdd2481 | package.json, package-lock.json |
| 2 | Delete 8 freelance-era component files | e09d3a1 | 8 deletions (see below) |

## Task Details

### Task 1: Install gsap package

- `npm install gsap` added `"gsap": "^3.15.0"` to `dependencies` in `package.json`
- Verified: `require('gsap')` resolves, `require('gsap/ScrollTrigger')` resolves
- `node_modules/gsap/index.js` confirmed present
- gsap is now available for PhoneAgent.tsx (Wave 3, plan 02-03)

### Task 2: Delete freelance-era component files (D-01)

Files deleted:
- `src/components/sections/Hero.tsx`
- `src/components/sections/About.tsx`
- `src/components/sections/Projects.tsx`
- `src/components/sections/PhoneAgentPromo.tsx`
- `src/components/sections/Contact.tsx`
- `src/components/three/Scene.tsx`
- `src/components/three/FloatingShapes.tsx`
- `src/components/three/StarkDisplay.tsx`

Files confirmed NOT deleted (safety check):
- `src/components/sections/PartnersBanner.tsx` — present (used by services/page.tsx)
- `src/components/ui/ClientProviders.tsx` — present
- `src/components/ui/CustomCursor.tsx` — present (not in deletion list)
- `src/components/ui/CinemaIntro.tsx` — present (not in deletion list)

Note: `src/app/page.tsx` now has broken imports — this is intentional and expected. The page is completely rewritten in Wave 4 (plan 02-05), which eliminates all these imports.

The `src/components/three/` directory is now empty (directory retained, git does not track empty directories).

## Verification Results

All post-task verifications passed:
- `grep '"gsap"' package.json` → `"gsap": "^3.15.0"` ✓
- `node -e "require('gsap/ScrollTrigger'); console.log('ScrollTrigger ok')"` → `ScrollTrigger ok` ✓
- `ls src/components/sections/` → only `PartnersBanner.tsx` remains ✓
- `ls src/components/three/` → empty directory ✓
- `ls src/components/ui/ClientProviders.tsx` → file present ✓

## Deviations from Plan

None — plan executed exactly as written. Both tasks completed in the expected sequence without any blocking issues or rule triggers.

## Known Stubs

None — this plan has no UI components or data flows, only package installation and file deletion.

## Threat Flags

No new security-relevant surface introduced. The gsap package (T-02-03) and file deletion (T-02-04) are both `accept` disposition per the plan's threat model.

## Self-Check: PASSED

- `bdd2481` commit exists in git log ✓
- `e09d3a1` commit exists in git log ✓
- `package.json` contains `"gsap": "^3.15.0"` ✓
- 8 target files confirmed deleted from filesystem ✓
- `PartnersBanner.tsx` and `ClientProviders.tsx` confirmed present ✓
