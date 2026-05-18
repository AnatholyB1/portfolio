# Requirements: BRICON ANATHOLY

**Defined:** 2026-05-15
**Core Value:** Patron de PME lands on the site and immediately understands, trusts, and knows how to contact us in under 60 seconds.

## v1.0 Requirements

### Design System

- [ ] **DS-01**: New CSS design tokens applied globally (bg `#0A0B0C`, acid `#C4F542`, ink `#ECEAE3`, warm `#E07856`, line `#1F1F1F`)
- [ ] **DS-02**: Google Fonts loaded: Bricolage Grotesque (variable), Manrope, JetBrains Mono
- [ ] **DS-03**: Custom cursor (dot + ring, mix-blend-mode:difference) implemented globally
- [ ] **DS-04**: Scroll-reveal system (IntersectionObserver, data-reveal / data-reveal-delay) available globally
- [x] **DS-05**: Cinema intro animation plays on first load, skipped on return visits (localStorage)

### Landing Page

- [ ] **LAND-01**: Landing page hero: Bricolage Grotesque display title (3 lines), animated 3D wireframe canvas (icosphere), 4-stat meta grid
- [ ] **LAND-02**: Landing page Manifeste section: editorial agency positioning (2 columns, editorial paragraphs + italic quote)
- [ ] **LAND-03**: Landing page Réalisations section: 4 project cards in editorial list format with tags and year
- [ ] **LAND-04**: Landing page Phone Agent section: scroll-driven pinned section with animated SVG particle flow (4 steps)
- [ ] **LAND-05**: Landing page Partners section: typographic auto-scrolling ticker
- [ ] **LAND-06**: Landing page Contact section: 4-field form (name, email, type select, message)
- [ ] **LAND-07**: Landing page Wordmark + Footer with navigation links
- [ ] **LAND-08**: Personal/freelance signals removed: personal bio, skills bars, "Hire me" CTA, StarkDisplay Iron Man component, freelance SEO metadata

### Services Page

- [ ] **SVC-01**: Services hero: "Sites, outils, agents." display title + 2 CTAs + 3 meta stats
- [ ] **SVC-02**: Problem section: 4 pain cards (warm `#E07856` accent, letters A-D)
- [ ] **SVC-03**: Approach section: 6 benefits list + 3 approach cards (numbered 01-03)
- [ ] **SVC-04**: Offers section: 4 pricing packs with features list (Landing Page, Rebranding+Premium, Sur Mesure, Agent Vocal IA)
- [ ] **SVC-05**: Phone Agent section: 4-step numbered explainer
- [ ] **SVC-06**: Maintenance section: 3 packs (Essentiel €49, Business €79, Premium €129) with popular badge
- [ ] **SVC-07**: Options/Upsell section: 8 add-on cards in grid
- [ ] **SVC-08**: Methodology section: scroll-driven rail with active step highlight (6 steps)
- [ ] **SVC-09**: Reassurance section: 4 trust points grid
- [ ] **SVC-10**: Final CTA section + Partners ticker + Footer

### Rethemes

- [ ] **THEME-01**: /mentions-legales page rethemed: uses new CSS vars, Bricolage Grotesque + Manrope, same layout structure — content unchanged
- [ ] **THEME-02**: /demo CRM dashboard rethemed: uses new CSS vars and fonts — functionality and Supabase wiring unchanged

### i18n & Quality

- [x] **I18N-01**: All new landing content wired to LanguageContext (fr/en/th keys from landing-i18n.jsx)
- [x] **I18N-02**: All new services content wired to LanguageContext (fr/en/th keys from services-i18n.jsx)
- [ ] **QA-01**: All pages responsive at 900px mobile breakpoint
- [ ] **QA-02**: All animations respect prefers-reduced-motion
- [ ] **QA-03**: SEO metadata updated to agency positioning (remove freelance/hire-developer keywords)
- [ ] **QA-04**: /demo/feuillette page remains untouched

## Out of Scope

| Feature | Reason |
|---------|--------|
| /demo/feuillette | Branded client pitch, intentionally isolated |
| CRM API route changes | Functional, working, not part of visual redesign |
| New i18n languages | Current fr/en/th sufficient |
| Backend changes | Design-only milestone |
| New features | Pure redesign — no new functionality |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DS-01 | Phase 1 | Pending |
| DS-02 | Phase 1 | Pending |
| DS-03 | Phase 1 | Pending |
| DS-04 | Phase 1 | Pending |
| DS-05 | Phase 1 | Complete |
| LAND-01 | Phase 2 | Pending |
| LAND-02 | Phase 2 | Pending |
| LAND-03 | Phase 2 | Pending |
| LAND-04 | Phase 2 | Pending |
| LAND-05 | Phase 2 | Pending |
| LAND-06 | Phase 2 | Pending |
| LAND-07 | Phase 2 | Pending |
| LAND-08 | Phase 2 | Pending |
| SVC-01 | Phase 3 | Pending |
| SVC-02 | Phase 3 | Pending |
| SVC-03 | Phase 3 | Pending |
| SVC-04 | Phase 3 | Pending |
| SVC-05 | Phase 3 | Pending |
| SVC-06 | Phase 3 | Pending |
| SVC-07 | Phase 3 | Pending |
| SVC-08 | Phase 3 | Pending |
| SVC-09 | Phase 3 | Pending |
| SVC-10 | Phase 3 | Pending |
| THEME-01 | Phase 4 | Pending |
| THEME-02 | Phase 4 | Pending |
| I18N-01 | Phase 4 | Complete |
| I18N-02 | Phase 4 | Complete |
| QA-01 | Phase 4 | Pending |
| QA-02 | Phase 4 | Pending |
| QA-03 | Phase 4 | Pending |
| QA-04 | Phase 4 | Pending |

**Coverage:**
- v1.0 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-15*
*Last updated: 2026-05-15 — traceability expanded per-requirement after roadmap creation*
