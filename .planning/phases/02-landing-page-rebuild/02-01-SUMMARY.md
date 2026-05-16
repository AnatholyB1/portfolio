---
phase: 02-landing-page-rebuild
plan: 01
subsystem: i18n / data
tags: [translations, i18n, data, typescript, landing]
dependency_graph:
  requires: []
  provides:
    - src/lib/translations.ts (landing namespace — all 7 sub-namespaces for fr/en/th)
    - src/data/projects.ts (Project interface + 4 typed project objects)
  affects:
    - src/context/LanguageContext.tsx (Translations type re-export — no change needed)
    - future: src/components/sections/Realisations.tsx (imports projects)
    - future: all landing section components (consume t.landing.*)
tech_stack:
  added: []
  patterns:
    - Translations interface extension with additive landing namespace
    - Locale-agnostic project data (index references i18n items at render time)
key_files:
  modified:
    - src/lib/translations.ts
  created:
    - src/data/projects.ts
decisions:
  - "landing namespace is additive — existing fr.hero, fr.contact, fr.footer etc. unchanged"
  - "Project.index maps to t.landing.work.items[i] — keeps data file locale-agnostic (D-03)"
  - "Pre-existing TSC errors in page.tsx (5 missing section imports) are Wave 3 scope — not fixed here"
metrics:
  duration: "~6 min"
  completed: "2026-05-16"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
  files_created: 1
---

# Phase 2 Plan 1: i18n Extension + Projects Data Summary

Extended `src/lib/translations.ts` with a `landing` namespace covering all 7 sub-namespaces (hero, manifeste, work, phone, partners, contact, footer) in fr/en/th, and created `src/data/projects.ts` with 4 typed locale-agnostic project objects matching D-03 and D-04.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend translations.ts with landing namespace | 158f011 | src/lib/translations.ts |
| 2 | Create src/data/projects.ts | d17e658 | src/data/projects.ts |

## Verification Results

- `npx tsc --noEmit`: 5 pre-existing errors in `src/app/page.tsx` (missing old section imports — Wave 3 scope). Zero errors in `translations.ts` or `projects.ts`.
- `grep -c "landing:" src/lib/translations.ts` → 4 (interface + fr + en + th)
- `grep "manifeste: string;" src/lib/translations.ts` → matches interface nav block
- `grep -c "title_l2_it" src/lib/translations.ts` → 16 (fr/en/th hero + manifeste sections)
- `grep "Feuillette" src/data/projects.ts` → 1 match
- `grep "Ghjulianu Codani" src/data/projects.ts` → 1 match
- `grep "  index:" src/data/projects.ts` → 5 lines (interface + 4 data objects)
- Existing nav keys (home, about, services, projects, contact) preserved in all 3 locales

## Deviations from Plan

None — plan executed exactly as written. The pre-existing TypeScript errors in `page.tsx` were present before this plan and are out of scope (Wave 3 resolves them by rewriting `page.tsx`).

## Known Stubs

None — `translations.ts` is fully populated with real data from `landing-i18n.jsx`. `projects.ts` contains real project data matching D-04. No placeholders or TODO strings.

## Threat Flags

No new threat surface introduced. Both files are static build-time modules with no user input, no network calls, and no write paths — consistent with the plan's threat model (T-02-01, T-02-02: accept).

## Self-Check: PASSED
