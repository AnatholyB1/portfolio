---
phase: 19-ads-preparation
plan: 08
subsystem: admin
tags: [utm, admin, link-generator, attribution]
requires: [19-01]
provides:
  - "/admin/liens campaign link generator and convention card"
affects: [admin-nav]
tech-stack:
  added: []
  patterns: ["client live builder over shared pure rules module", "source-guard tests"]
key-files:
  created:
    - src/app/admin/liens/page.tsx
    - src/components/admin/links/LinkBuilder.tsx
    - src/components/admin/links/links.css
    - src/components/admin/links/linksUi.test.ts
  modified:
    - src/components/admin/AdminNav.tsx
key-decisions:
  - "Service labels for destinations come from translations.fr.services.pages.items[index].name"
  - "Debounced (300 ms) snapshot of the fields feeds buildTrackedUrl; no server round-trip"
requirements-completed: [ADS-01]
duration: ~15min
completed: 2026-10-08
---

# Phase 19 Plan 08: Admin campaign link generator Summary

Admin-only `/admin/liens` page with a live LinkBuilder validated by the same `buildTrackedUrl` rules as capture, plus a module-driven Convention card and a "Liens" nav entry.

## Tasks
1. Nav entry, page shell, convention card (requireAdmin, noindex, tables from module constants): 51d16d7
2. LinkBuilder client component and links.css (select-only destination, copy/open, Google preset, French error mapping): 9f68f8f

## Verification
vitest (src/components/admin, src/app/admin, priceScope) green; tsc --noEmit and eslint clean on new files.

## Deviations from Plan
None - plan executed as written. The worktree HEAD was reset to the specified base SHA first.

## Known Stubs
None.

## Self-Check: PASSED
