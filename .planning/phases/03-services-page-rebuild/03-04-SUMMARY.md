---
phase: 3
plan: "03-04"
subsystem: methodology-section
tags: [gsap, scroll-trigger, methodology, client-providers, ssr-safe]
dependency_graph:
  requires: [03-01]
  provides: [methodology-section-component, methodology-section-lazy-export]
  affects: [src/app/services/page.tsx]
tech_stack:
  added: []
  patterns: [GSAP ScrollTrigger per-step active detection, dynamic ssr:false named export from ClientProviders]
key_files:
  created:
    - src/components/sections/MethodologySection.tsx
  modified:
    - src/components/ui/ClientProviders.tsx
decisions:
  - "railFill uses percentage (0-100%) driven by ScrollTrigger onUpdate progress, not px — avoids needing DOM measurement"
  - "Cleanup kills all ScrollTrigger instances via getAll().forEach(t => t.kill()) per T-03-04 threat mitigation"
  - "MethodologySectionLazy NOT rendered in ClientProviders return — section-scoped, consumed by services/page.tsx (Plan 5)"
metrics:
  duration: "8 min"
  completed: "2026-05-17"
  tasks_completed: 2
  files_modified: 2
---

# Phase 3 Plan 04: MethodologySection GSAP Rail Summary

**One-liner:** GSAP ScrollTrigger scroll-driven 6-step methodology rail with per-step active state detection and rail fill progress, registered as MethodologySectionLazy in ClientProviders for SSR-safe dynamic loading.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | MethodologySection — GSAP scroll-driven 6-step rail | bfda37b | src/components/sections/MethodologySection.tsx |
| 2 | Register MethodologySection in ClientProviders as lazy export | 31af033 | src/components/ui/ClientProviders.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` — PASSED, zero errors
- `grep "MethodologySectionLazy" src/components/ui/ClientProviders.tsx` — returns the named export
- `grep "ssr: false" src/components/ui/ClientProviders.tsx` — returns MethodologySection dynamic import
- `grep -c "ScrollTrigger" src/components/sections/MethodologySection.tsx` — returns 5 (import + registerPlugin + 2 creates + kill loop)
- `grep "method-rail" src/components/sections/MethodologySection.tsx` — returns method-rail and method-rail-active divs

## Known Stubs

None — component renders live scroll-driven data; i18n keys from t.services.method are fully populated in translations.ts (fr/en/th from Plan 01).

## Threat Flags

None — GSAP ScrollTrigger reads scroll position only; no user data processed; cleanup implemented per T-03-04 mitigation.

## Self-Check: PASSED

- src/components/sections/MethodologySection.tsx — FOUND
- src/components/ui/ClientProviders.tsx — FOUND
- commit bfda37b — FOUND
- commit 31af033 — FOUND
