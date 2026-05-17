---
phase: 3
plan: "03-01"
subsystem: i18n
tags: [translations, services, i18n, fr, en, th]
dependency_graph:
  requires: []
  provides: [services-i18n-namespace]
  affects: [src/app/services/page.tsx, src/components/sections/*Section.tsx]
tech_stack:
  added: []
  patterns: [TypeScript interface replacement, locale data migration]
key_files:
  created: []
  modified:
    - src/lib/translations.ts
    - src/app/services/page.tsx
    - src/components/sections/PartnersBanner.tsx
decisions:
  - "services.partners removed from Translations interface — PartnersBanner sourced from landing.partners.items instead"
  - "services/page.tsx rewritten to use new key structure (desc not description, t/d not title/description, etc.)"
metrics:
  duration: "11 min"
  completed: "2026-05-17"
  tasks_completed: 3
  files_modified: 3
---

# Phase 3 Plan 01: Services i18n Namespace Replacement Summary

**One-liner:** Complete replacement of the freelance-era services namespace in translations.ts with the Selenium Phase 02 10-subsection structure for fr/en/th locales, verbatim from services-i18n.jsx.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace services namespace in Translations interface | cf2c936 | src/lib/translations.ts |
| 2 | Replace services data for fr locale | cf2c936 | src/lib/translations.ts |
| 3 | Replace services data for en and th locales | cf2c936 | src/lib/translations.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated services/page.tsx to use new interface keys**
- **Found during:** Task 3 verification (npx tsc --noEmit)
- **Issue:** `src/app/services/page.tsx` still referenced 29 removed keys: `hero.title`, `hero.subtitle`, `hero.description`, `problem.title`, `problem.subtitle`, `problem.items[].icon`, `problem.items[].description`, `services.solution.*`, `offers.title`, `offers.subtitle`, `services.phoneAgent.*`, `maintenance.badge`, `maintenance.title`, `maintenance.subtitle`, `maintenance.currency_symbol`, `maintenance.annual_discount`, `maintenance.no_commitment`, `maintenance.scalable`, `upsell.title`, `upsell.subtitle`, `upsell.options[].icon`, `upsell.options[].description`, `services.methodology.*`, `reassurance.title`, `reassurance.points[].icon`, `reassurance.points[].title`, `reassurance.points[].description`, `services.cta_final.*`
- **Fix:** Rewrote all section components in services/page.tsx to consume new key names (`title_l1`, `title_l2_it`, `desc`, `num`, `intro`, `t`, `d`, `n`, etc.). Renamed SolutionSection → ApproachSection, MethodologySection → MethodSection, PhoneAgentSection updated to use `phone` namespace.
- **Files modified:** src/app/services/page.tsx
- **Commit:** 1293313

**2. [Rule 1 - Bug] Updated PartnersBanner.tsx to remove services.partners dependency**
- **Found during:** Task 3 verification (npx tsc --noEmit)
- **Issue:** `PartnersBanner.tsx` referenced `t.services.partners` (title, selenium_role, gecko_role, victor_role, ghjulianu_role, folies_role, ajmg_role) — all removed from the interface.
- **Fix:** Sourced role labels from `t.landing.partners.items` by matching partner names. Title sourced from `t.landing.partners.title`. Fallback to partner name if no match found.
- **Files modified:** src/components/sections/PartnersBanner.tsx
- **Commit:** 1293313

## Verification Results

- `npx tsc --noEmit` — PASSED, zero errors
- `grep -n "title_l1" src/lib/translations.ts` — returns entries for fr, en, th locales (60 matches)
- `grep -n "Sites," src/lib/translations.ts` — returns fr hero title_l1 at line 360
- `grep -c "method" src/lib/translations.ts` — 5 (present in interface + all 3 locales)

## Known Stubs

None — all locale data copied verbatim from services-i18n.jsx source of truth.

## Threat Flags

None — static string data file, no new network surface introduced.

## Self-Check: PASSED

- src/lib/translations.ts — FOUND
- src/app/services/page.tsx — FOUND
- .planning/phases/03-services-page-rebuild/03-01-SUMMARY.md — FOUND
- commit cf2c936 — FOUND
- commit 1293313 — FOUND
