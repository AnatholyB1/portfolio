---
phase: 02-landing-page-rebuild
plan: 03
subsystem: sections / canvas
tags: [hero, canvas, icosphere, manifeste, realisations, i18n, react]
dependency_graph:
  requires:
    - src/lib/translations.ts (landing namespace — from 02-01)
    - src/data/projects.ts (Project interface — from 02-01)
    - src/context/LanguageContext.tsx (useLanguage hook — Phase 1)
  provides:
    - src/components/sections/HeroSection.tsx (Canvas icosphere + 3-line title + 4-stat grid)
    - src/components/sections/Manifeste.tsx (2-col editorial layout)
    - src/components/sections/Realisations.tsx (4 project cards from projects array)
  affects:
    - future: src/app/page.tsx (imports these 3 components in Wave 3)
tech_stack:
  added: []
  patterns:
    - Canvas 2D icosphere via manual golden-spiral geometry + RAF loop
    - useRef stateRef pattern for mutable render state (avoids React re-renders in animation loop)
    - Conditional JSX element type via Wrapper variable (avoids TypeScript JSX element union error)
    - data-reveal + data-reveal-delay attributes for scroll animation (useReveals hook in page.tsx)
key_files:
  created:
    - src/components/sections/HeroSection.tsx
    - src/components/sections/Manifeste.tsx
    - src/components/sections/Realisations.tsx
decisions:
  - "HeroCanvas is a local component (not exported) — keeps canvas RAF state co-located with its mount lifecycle"
  - "stateRef pattern used for canvas state (t, mx, my, w, h, dpr, points, edges) — avoids triggering React re-renders from animation loop"
  - "Wrapper = project.href ? 'a' : 'div' pattern avoids TypeScript conditional JSX element type error"
  - "minHeight: 400px on hero-canvas-wrap prevents getBoundingClientRect returning 0x0 before CSS loads"
  - "Pre-existing TSC errors (5 missing imports in page.tsx) remain — Wave 3 scope"
metrics:
  duration: "~5 min"
  completed: "2026-05-16"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 0
  files_created: 3
---

# Phase 2 Plan 3: Landing Sections — HeroSection, Manifeste, Realisations Summary

Three self-contained landing section components: Canvas 2D icosphere hero with golden-spiral geometry and mouse parallax, 2-column Manifeste editorial section, and Realisations project card list resolving i18n desc/tags via project index.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build HeroSection.tsx (Canvas icosphere + title + stat grid) | 3197905 | src/components/sections/HeroSection.tsx |
| 2 | Build Manifeste.tsx and Realisations.tsx | 95c1ede | src/components/sections/Manifeste.tsx, src/components/sections/Realisations.tsx |

## Verification Results

- `npx tsc --noEmit`: only pre-existing 5 errors in page.tsx (Wave 3 scope) — zero errors in new files
- `grep "cancelAnimationFrame" HeroSection.tsx` → 1 match (RAF cleanup confirmed)
- `grep "useLanguage" HeroSection.tsx` → 2 matches (import + call)
- `grep -c "data-reveal" Manifeste.tsx` → 3 matches (sec-head + both col divs)
- `grep "w.items\[project.index\]" Realisations.tsx` → 1 match
- `ls src/components/sections/` → HeroSection.tsx, Manifeste.tsx, Realisations.tsx confirmed present

## Deviations from Plan

None — plan executed exactly as written. All code matches canonical references (landing-hero.jsx geometry copied verbatim, landing-app.jsx JSX structure matched).

## Known Stubs

None — all strings resolved from t.landing.* translation keys populated in 02-01. All 4 project cards resolve real data from projects array + work.items[index].

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: T-02-06 mitigated | src/components/sections/HeroSection.tsx | cancelAnimationFrame + removeEventListener in useEffect cleanup — RAF DoS prevented |

## Self-Check: PASSED

- `src/components/sections/HeroSection.tsx` — FOUND
- `src/components/sections/Manifeste.tsx` — FOUND
- `src/components/sections/Realisations.tsx` — FOUND
- Commit 3197905 — FOUND (feat(02-03): add HeroSection)
- Commit 95c1ede — FOUND (feat(02-03): add Manifeste and Realisations)
