---
phase: 3
plan: "03-02"
subsystem: sections
tags: [services, hero, problem, approach, components, i18n, data-reveal]
dependency_graph:
  requires: [services-i18n-namespace]
  provides: [ServicesHeroSection, ProblemSection, ApproachSection]
  affects: [src/app/services/page.tsx]
tech_stack:
  added: []
  patterns: [useLanguage hook, data-reveal stagger, CSS vars only, padStart numbering]
key_files:
  created:
    - src/components/sections/ServicesHeroSection.tsx
    - src/components/sections/ProblemSection.tsx
    - src/components/sections/ApproachSection.tsx
  modified: []
decisions:
  - "CTA href=\"/#contact\" (absolute) per D-10 — ensures cross-page anchor works from /services"
  - "crumb-back link points to / (not specific locale) — matches original services-app.jsx breadcrumb intent"
  - "ProblemSection has no border-t (first section after hero) — ApproachSection has border-t per services-app.jsx"
metrics:
  duration: "8 min"
  completed: "2026-05-17"
  tasks_completed: 3
  files_modified: 3
---

# Phase 3 Plan 02: ServicesHeroSection, ProblemSection, ApproachSection Summary

**One-liner:** Three self-contained section components for the top of /services — 3-line split hero title with meta grid, 4 warm-accent pain cards with A-D pn labels, and 6 benefits plus 3 numbered approach cards.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ServicesHeroSection — 3-line title, 2 CTAs, 3 meta stats | 2b6ed53 | src/components/sections/ServicesHeroSection.tsx |
| 2 | ProblemSection — 4 warm-accent pain cards with A-D labels | 7792fa2 | src/components/sections/ProblemSection.tsx |
| 3 | ApproachSection — 6 benefits + 3 numbered approach cards | 9134185 | src/components/sections/ApproachSection.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` — PASSED, zero errors
- `grep -l "t.services" ...` — returns all 3 files
- `grep "/#contact" ServicesHeroSection.tsx` — returns CTA anchor href="/#contact"
- `grep "pn" ProblemSection.tsx` — returns className="pn" for letter labels
- `grep "padStart" ApproachSection.tsx` — returns String(i + 1).padStart(2, '0')

## Known Stubs

None — all strings sourced live from t.services.{hero|problem|approach} via useLanguage(). No placeholder text or hardcoded mock data.

## Threat Flags

None — static translation-driven render components, no new network surface introduced.

## Self-Check: PASSED

- src/components/sections/ServicesHeroSection.tsx — FOUND
- src/components/sections/ProblemSection.tsx — FOUND
- src/components/sections/ApproachSection.tsx — FOUND
- commit 2b6ed53 — FOUND
- commit 7792fa2 — FOUND
- commit 9134185 — FOUND
