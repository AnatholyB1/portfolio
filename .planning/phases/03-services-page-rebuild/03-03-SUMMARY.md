---
phase: 03-services-page-rebuild
plan: "03"
subsystem: ui
tags: [react, nextjs, i18n, sections, pricing]

# Dependency graph
requires:
  - phase: 03-01
    provides: services i18n namespace (t.services.offers, t.services.phone, t.services.maintenance, t.services.upsell)
provides:
  - OffersSection — 4 pricing packs with popular badge and feature lists
  - PhoneAgentExplainer — static 4-step numbered grid (new component, no GSAP)
  - MaintenanceSection — 3 maintenance packs with popular badge on Business and perks row
  - OptionsSection — 8 add-on cards in upsell-grid with 01-08 sequential numbering
affects: [03-04, 03-05, 03-06, services-page-assembly]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Section shell: sec + border-t + wrap + sec-head (sec-num, sec-title, sec-intro) + data-reveal"
    - "Popular badge: pop-tag className rendered conditionally on mpack/offer cards"
    - "Numbered labels: String(i+1).padStart(2,'0') for monospace 01-08 display"
    - "CTA absolute href: href='/#contact' per D-10 cross-page anchor convention"

key-files:
  created:
    - src/components/sections/OffersSection.tsx
    - src/components/sections/PhoneAgentExplainer.tsx
    - src/components/sections/MaintenanceSection.tsx
    - src/components/sections/OptionsSection.tsx
  modified: []

key-decisions:
  - "popular = i === 1 for OffersSection (Rebranding + Site Premium is the featured pack)"
  - "PhoneAgentExplainer is a brand-new component distinct from the landing PhoneAgent.tsx — no GSAP, no scroll-pin, static grid only (D-02)"
  - "href='/#contact' used for all CTA anchors to ensure cross-page navigation works (D-10)"
  - "data-reveal-delay={String(i % 4)} for upsell cards so max delay is 3 (grid wraps every 4)"

patterns-established:
  - "Offer card: offer + popular className, pop-tag badge, o-feats/o-feat list with checkmark span.c"
  - "Maintenance pack: mpack + popular, price-row with pcur/pval/pnote/pper spans, mfeats/mfeat list"
  - "Upsell card: upsell-card with un (padStart number), h4 name, p desc"
  - "Phone step: ph-step with ico (padStart number), h4 label, p desc"

requirements-completed: [SVC-04, SVC-05, SVC-06, SVC-07]

# Metrics
duration: 15min
completed: 2026-05-17
---

# Phase 3 Plan 03: Commercial Sections Summary

**Four services-page sections built — OffersSection (4 pricing packs), PhoneAgentExplainer (static 4-step grid), MaintenanceSection (3 packs with popular badge), and OptionsSection (8 add-ons) — all i18n-wired, no GSAP, no hex values**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-17T20:07:00Z
- **Completed:** 2026-05-17T20:22:42Z
- **Tasks:** 3 (Task 3 created 2 files)
- **Files modified:** 4

## Accomplishments
- OffersSection: 4 pricing packs from t.services.offers.items, popular badge on index 1 (Rebranding + Site Premium), feature lists with checkmarks, href="/#contact" CTAs
- PhoneAgentExplainer: brand-new static 4-step grid component (D-02), ico class with padStart numbers 01-04, zero GSAP or scroll effects
- MaintenanceSection: 3 packs (Essentiel/Business/Premium), popular badge on Business pack (p.popular=true from translations), price row with pcur/pval/pnote/pper, perks row below grid
- OptionsSection: 8 upsell-cards in upsell-grid, sequential 01-08 numbering via padStart(2,'0'), data-reveal-delay uses i%4

## Task Commits

Each task was committed atomically:

1. **Task 1: OffersSection** - `1b3f25c` (feat)
2. **Task 2: PhoneAgentExplainer** - `c01ec7e` (feat)
3. **Task 3: MaintenanceSection + OptionsSection** - `88e7b68` (feat)

## Files Created/Modified
- `src/components/sections/OffersSection.tsx` - 4 pricing packs with popular badge, feature lists, and CTA links
- `src/components/sections/PhoneAgentExplainer.tsx` - Static 4-step phone explainer grid with monospace numbered labels
- `src/components/sections/MaintenanceSection.tsx` - 3 maintenance packs with popular badge on Business, price row, and perks bar
- `src/components/sections/OptionsSection.tsx` - 8 add-on option cards with sequential 01-08 numbering

## Decisions Made
- `popular = i === 1` for OffersSection: second card (Rebranding + Site Premium) is the featured pack per plan specification
- PhoneAgentExplainer is intentionally a new component, not derived from landing PhoneAgent.tsx (D-02 constraint)
- `data-reveal-delay={String(i % 4)}` for OptionsSection upsell cards to cap delay at 3 for the 4-column grid layout

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — TypeScript passed cleanly (zero errors) after each file creation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 commercial section components are ready for assembly into the services page
- Components follow the established sec/wrap/sec-head shell pattern from Phase 2
- All sections use the t.services.* i18n namespace from 03-01
- Ready for 03-04 (MethodSection + ReassuranceSection) and final page assembly

---
*Phase: 03-services-page-rebuild*
*Completed: 2026-05-17*
