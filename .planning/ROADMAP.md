# Roadmap: BRICON ANATHOLY Portfolio

## Overview

Milestone v1.0 replaces the freelance-era portfolio with the Selenium Phase 02 agency brand. Four phases deliver the complete visual redesign: a global design system foundation, a full landing page rebuild, a full services page rebuild, and a final retheme pass covering the demo and legal pages with integration QA.

## Milestones

- 🚧 **v1.0 — Visual Redesign (Selenium Phase 02)** — Phases 1-4 (in progress)

## Phases

- [x] **Phase 1: Design System Foundation** — CSS vars, fonts, cursor, scroll-reveal, cinema intro wired globally
- [x] **Phase 2: Landing Page Rebuild** — Full page.tsx rebuild with all hero, editorial, and contact sections
- [ ] **Phase 3: Services Page Rebuild** — Full services/page.tsx with all 9 sections and i18n
- [ ] **Phase 4: Rethemes + QA** — /mentions-legales and /demo retheme, i18n wiring, integration QA

## Phase Details

### Phase 1: Design System Foundation
**Goal**: The global design system is live and every page inherits it
**Depends on**: Nothing (first phase)
**Requirements**: DS-01, DS-02, DS-03, DS-04, DS-05
**Success Criteria** (what must be TRUE):
  1. Any page renders with bg `#0A0B0C`, acid `#C4F542`, ink `#ECEAE3`, warm `#E07856` colors from CSS vars — no hard-coded legacy colors remain in globals.css
  2. Bricolage Grotesque, Manrope, and JetBrains Mono load on every page with no flash of unstyled text
  3. A custom cursor dot + ring with mix-blend-mode:difference tracks the mouse on all pages
  4. Elements tagged with data-reveal appear on scroll via IntersectionObserver with configurable delay
  5. A cinema intro overlay plays exactly once on first load and is skipped on return visits (localStorage flag set)
**Plans**: 5 plans
Plans:
- [x] 01-01-PLAN.md — CSS design tokens + Tailwind v4 @theme inline integration
- [x] 01-02-PLAN.md — Font loading (Bricolage Grotesque, Manrope, JetBrains Mono)
- [x] 01-03-PLAN.md — Custom cursor component (dot + ring, mix-blend-mode:difference)
- [x] 01-04-PLAN.md — Scroll-reveal hook (useReveals) and [data-reveal] CSS
- [x] 01-05-PLAN.md — Cinema intro component (1700ms auto-dismiss, localStorage)
**UI hint**: yes

### Phase 2: Landing Page Rebuild
**Goal**: The landing page fully delivers the Selenium Phase 02 agency pitch with no freelance-era content
**Depends on**: Phase 1
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06, LAND-07, LAND-08
**Success Criteria** (what must be TRUE):
  1. Visitor sees a Bricolage Grotesque 3-line display title, animated 3D icosphere canvas, and 4-stat meta grid in the hero
  2. Manifeste, Réalisations (4 project cards), Phone Agent (pinned scroll with SVG particle flow), Partners ticker, Contact form (4 fields), and Footer are all visible and functional in sequence
  3. No personal bio, no skills bars, no "Hire me" CTA, and no StarkDisplay Iron Man component appear anywhere on the page
  4. SEO metadata reflects agency positioning — no freelance or hire-developer keywords in page title or meta description
**Plans**: 6 plans
Plans:
- [x] 02-01-PLAN.md — i18n landing namespace extension + projects data file
- [x] 02-02-PLAN.md — Install gsap + delete 8 freelance-era component files
- [x] 02-03-PLAN.md — HeroSection (Canvas icosphere + title + stat grid) + Manifeste + Realisations
- [x] 02-04-PLAN.md — PhoneAgent (scroll-driven sticky + SVG particle) + Partners ticker + ContactSection
- [x] 02-05-PLAN.md — Navbar rebuild + Footer rebuild + page.tsx rewrite + SEO metadata
- [x] 02-06-PLAN.md — Landing CSS in globals.css + human verification checkpoint
**UI hint**: yes

### Phase 3: Services Page Rebuild
**Goal**: The services page presents the full agency offer across 9 sections with new design system and i18n
**Depends on**: Phase 2
**Requirements**: SVC-01, SVC-02, SVC-03, SVC-04, SVC-05, SVC-06, SVC-07, SVC-08, SVC-09, SVC-10
**Success Criteria** (what must be TRUE):
  1. Hero renders "Sites, outils, agents." display title with 2 CTAs and 3 meta stats
  2. Problem (4 warm-accent pain cards), Approach (6 benefits + 3 numbered cards), Offers (4 pricing packs), and Phone Agent explainer (4 steps) all render with correct design tokens
  3. Maintenance packs (Essentiel €49, Business €79, Premium €129) display with popular badge; 8 add-on cards appear in the Options grid
  4. Methodology section scroll-rail highlights the active step as the user scrolls through 6 steps
  5. Reassurance grid (4 trust points), final CTA, Partners ticker, and Footer are present and complete the page
**Plans**: TBD
**UI hint**: yes

### Phase 4: Rethemes + QA
**Goal**: Every remaining page uses the new design system and the full site passes integration QA
**Depends on**: Phase 3
**Requirements**: THEME-01, THEME-02, I18N-01, I18N-02, QA-01, QA-02, QA-03, QA-04
**Success Criteria** (what must be TRUE):
  1. /mentions-legales renders with new CSS vars, Bricolage Grotesque headings, and Manrope body — legal content is word-for-word identical to before
  2. /demo CRM dashboard uses new CSS vars and fonts — all Supabase Realtime data updates and table interactions work exactly as before
  3. Language switcher cycles fr/en/th on both landing and services pages — all new content keys resolve in all three locales without fallback warnings
  4. All pages are usable at 900px viewport width and all animations are absent or simplified when prefers-reduced-motion is set
  5. /demo/feuillette loads without any visual change and passes a side-by-side screenshot comparison against the pre-milestone baseline
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Design System Foundation | 5/5 | Complete | 2026-05-15 |
| 2. Landing Page Rebuild | 6/6 | Complete | 2026-05-17 |
| 3. Services Page Rebuild | 0/TBD | Not started | - |
| 4. Rethemes + QA | 0/TBD | Not started | - |
