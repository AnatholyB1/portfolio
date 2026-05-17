---
phase: 3
plan: "03-05"
subsystem: services-page-assembly
tags: [services-page, reassurance, final-cta, page-assembly, use-client, use-reveals, methodology-lazy]
dependency_graph:
  requires: [03-02, 03-03, 03-04]
  provides: [reassurance-section, final-cta-section, services-page-complete]
  affects: [src/app/services/page.tsx]
tech_stack:
  added: []
  patterns: [useReveals at page level, MethodologySectionLazy SSR-safe import, 'use client' page with no metadata export]
key_files:
  created:
    - src/components/sections/ReassuranceSection.tsx
    - src/components/sections/FinalCtaSection.tsx
  modified:
    - src/app/services/page.tsx
decisions:
  - "services/page.tsx 'use client' with no metadata export — metadata lives in layout.tsx per App Router rules"
  - "MethodologySectionLazy imported from ClientProviders as named export — SSR-safe dynamic load"
  - "useReveals() called once at page level — sweeps all [data-reveal] across all 9 sections"
  - "FinalCtaSection href=/#contact (absolute) per D-10 decision"
metrics:
  duration: "12 min"
  completed: "2026-05-17"
  tasks_completed: 2
  files_modified: 3
---

# Phase 3 Plan 05: Services Page Final Assembly Summary

**One-liner:** ReassuranceSection (4 trust points, 01-04 rn numbering, data-reveal stagger) + FinalCtaSection (3-line split title, absolute /#contact CTA, mailto link) + complete rewrite of services/page.tsx wiring all 9 sections with useReveals and MethodologySectionLazy.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ReassuranceSection + FinalCtaSection | 310b74c | src/components/sections/ReassuranceSection.tsx, src/components/sections/FinalCtaSection.tsx |
| 2 | Rewrite services/page.tsx — wire all 9 sections + layout | 55cc39b | src/app/services/page.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` — PASSED, zero errors
- `grep "useReveals" src/app/services/page.tsx` — returns import and hook call
- `grep "MethodologySectionLazy" src/app/services/page.tsx` — returns import and JSX usage
- `grep "export const metadata" src/app/services/page.tsx` — returns EMPTY (correct — no metadata in page)
- `grep "metadata" src/app/services/layout.tsx` — returns SEO metadata (layout.tsx unchanged)
- All 9 section components present in src/components/sections/

## Known Stubs

None — all sections render live i18n data from t.services.*; translations fully populated in Plans 01-04.

## Threat Flags

None — mailto address is intentionally public on marketing page (T-03-05 accepted per plan threat register).

## Self-Check: PASSED

- src/components/sections/ReassuranceSection.tsx — FOUND
- src/components/sections/FinalCtaSection.tsx — FOUND
- src/app/services/page.tsx — FOUND (rewritten)
- commit 310b74c — FOUND
- commit 55cc39b — FOUND
