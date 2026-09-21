---
phase: 08-landing-simplification-pricing-policy
plan: 04
subsystem: ui
tags: [react, nextjs, i18n, gsap, css-grid]

# Dependency graph
requires:
  - phase: 08-landing-simplification-pricing-policy
    plan: 03
    provides: "t.landing.servicesPreview/method/enjeux content (fr/en/th) this plan's components consume, plus the price-free t.services.pages.items[i].name/tagline join"
provides:
  - "ServicesPreview.tsx — data-driven 9-card services overview, each card an <a> to /services/[slug]"
  - "FonctionnementSection.tsx — GSAP ScrollTrigger 4-step engagement-process rail, id=\"fonctionnement\""
  - "EnjeuxSection.tsx — 4-point stakes grid, no id attribute (matches ReassuranceSection's analog, which also has no section id)"
  - ".svc-preview-grid CSS rule (3/2/1 responsive columns + anchor-as-card reset) appended to globals.css"
affects: [08-05-phoneagent-teaser-realisations-bridge, 08-06-page-composition-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New landing sections built as verbatim structural copies of an existing analog component (OptionsSection/MethodologySection/ReassuranceSection), swapping only the translation-object source line — keeps GSAP ScrollTrigger lifecycle code untouched and battle-tested"

key-files:
  created:
    - src/components/sections/ServicesPreview.tsx
    - src/components/sections/FonctionnementSection.tsx
    - src/components/sections/EnjeuxSection.tsx
  modified:
    - src/app/globals.css

key-decisions:
  - "EnjeuxSection.tsx carries no section id attribute, mirroring its analog ReassuranceSection.tsx exactly (the plan's task instructions specified an id only for FonctionnementSection, matching the id=\"work\"/id=\"phone\"/id=\"contact\" convention; Enjeux was not listed among sections needing a new anchor)"

patterns-established:
  - "svc-preview-grid card links reuse .upsell-card styling verbatim plus a scoped anchor reset (.svc-preview-grid .upsell-card) rather than modifying .upsell-card itself, since OptionsSection.tsx still uses .upsell-card on <div> elements"

requirements-completed: [LANDING-01, PRIX-01]

# Metrics
duration: 25min
completed: 2026-09-21
---

# Phase 8 Plan 4: Services Preview, Fonctionnement, Enjeux Summary

**Three new price-free landing sections — a 9-card services overview linking to each dedicated `/services/[slug]` page, a GSAP-driven 4-step engagement-process rail, and a 4-point stakes grid — all sourced from Phase 8's `t.landing.*` content, with a new `.svc-preview-grid` responsive CSS rule.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- `ServicesPreview.tsx`: renders all 9 `services` array entries via `services.map(...)`, each as an `<a href={`/services/${s.slug}`}>` card built from `t.services.pages.items[s.index].name/tagline` — no new copy written, no price/popularity token present
- Added `.svc-preview-grid` to `globals.css` (3 columns ≥900px, 2 columns 600-899px, 1 column below 600px, 16px gap) plus a scoped `.svc-preview-grid .upsell-card` anchor reset (`display:block`, `text-decoration:none`, `color:inherit`, `min-height:44px`) so the reused `.upsell-card` styling works as a full-card `<a>` link
- `FonctionnementSection.tsx`: exact structural/behavioral copy of `MethodologySection.tsx` (GSAP `ScrollTrigger` per-step activation + scrubbed rail-fill, identical cleanup), with only the content source (`t.landing.method` instead of `t.services.method`) and `id="fonctionnement"` changed
- `EnjeuxSection.tsx`: exact structural copy of `ReassuranceSection.tsx`, content source swapped to `t.landing.enjeux`
- Neither new section renders a CTA, button, or anchor beyond the 9 services-preview card links
- Ran `graphify update .` after both files compiled (AST-only, gitignored output, no API cost) per `C:\portfolio\CLAUDE.md`

## Task Commits

Each task was committed atomically:

1. **Task 1: ServicesPreview section and its grid rule** - `3440506` (feat)
2. **Task 2: Fonctionnement and Enjeux sections** - `9302840` (feat)

## Files Created/Modified

- `src/components/sections/ServicesPreview.tsx` - new; data-driven 9-card services overview
- `src/app/globals.css` - added `.svc-preview-grid` base rule, two responsive media queries, and the anchor-as-card reset (Phase 8 block appended after the existing Phase 7 block)
- `src/components/sections/FonctionnementSection.tsx` - new; GSAP ScrollTrigger 4-step rail sourced from `t.landing.method`
- `src/components/sections/EnjeuxSection.tsx` - new; 4-point stakes grid sourced from `t.landing.enjeux`

## Decisions Made

- Kept `EnjeuxSection.tsx` without a section `id` attribute, exactly mirroring `ReassuranceSection.tsx` (neither the plan text nor 08-UI-SPEC.md's suggested id list names an `id="enjeux"` anchor as required — only `id="fonctionnement"` was specified for the new sections beyond `id="services-preview"`).

## Deviations from Plan

None - plan executed exactly as written. `MethodologySection.tsx` and `ReassuranceSection.tsx` were left untouched (confirmed via `git status --short` showing no modification to either file).

## Issues Encountered

None. `npx tsc --noEmit` is clean and ESLint reports no errors on any of the four changed/created files. `npm run build` still fails at the page-data-collection step for `/api/crm/*` due to a pre-existing, already-documented missing-Supabase-env-var gap (same issue recorded in `08-01-SUMMARY.md`/`08-03-SUMMARY.md`/`deferred-items.md`) — unrelated to this plan's changes and outside its scope (`PROJECT.md` forbids touching `src/app/api/crm/*`). TypeScript compilation itself ("Compiled successfully") and `tsc --noEmit` are the authoritative signal for this plan and both pass.

`npx vitest run src/app/page.test.ts` shows 8 failing assertions, all in `HeroSection.tsx`, `Realisations.tsx`, `PhoneAgent.tsx`, and the overall `page.tsx` composition check — none touch `ServicesPreview.tsx`, `FonctionnementSection.tsx`, or `EnjeuxSection.tsx`. This exactly matches the plan's own `<verification>` block, which anticipates these failures as plan 05 (PhoneAgent/Realisations/HeroSection) and plan 06 (page.tsx composition) scope. The `-t "ServicesPreview"` filtered run (this plan's specified verification command) passes all 6 matched tests.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. All three components render entirely from existing, populated `t.landing.*`/`t.services.pages.items[*]` data and the static `services` array — no placeholder or empty-state rendering paths exist.

## Next Phase Readiness

- `ServicesPreview`, `FonctionnementSection`, and `EnjeuxSection` are ready for plan 06 to import and compose into `src/app/page.tsx` in LANDING-01 order (Problèmes → Aperçu des services → Fonctionnement → Enjeux).
- `id="services-preview"` and `id="fonctionnement"` are the anchor ids available for any future nav scroll-spy wiring; `EnjeuxSection` has no id (matches its analog).
- No blockers. `tsc --noEmit` clean; the only build failure is the pre-existing, out-of-scope Supabase-env gap.

---
*Phase: 08-landing-simplification-pricing-policy*
*Completed: 2026-09-21*

## Self-Check: PASSED

All created files verified present on disk (ServicesPreview.tsx, FonctionnementSection.tsx, EnjeuxSection.tsx, globals.css, this SUMMARY.md). All three task commits (3440506, 9302840) plus the metadata commit (e796bcf) confirmed present in `git log`.
