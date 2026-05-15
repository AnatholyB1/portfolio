# BRICON ANATHOLY · Portfolio

## What This Is

Agency website for BRICON ANATHOLY, a web & AI agency based in Tours, France, targeting local SMBs (restaurants, shops, schools, service businesses). The site presents the agency's services, showcases client work, and features a live phone agent demo. It also includes a `/demo` CRM dashboard used for client demos.

## Core Value

A patron de PME lands on the site and immediately understands what we do, trusts us, and knows how to contact us — in under 60 seconds.

## Requirements

### Validated

- ✓ Next.js 14 app with i18n (fr/en/th) via LanguageContext — Phase 0 (existing)
- ✓ VAPI phone agent integration + CRM API routes — Phase 0 (existing)
- ✓ /demo CRM dashboard with Supabase Realtime — Phase 0 (existing)
- ✓ /demo/feuillette branded pitch page — Phase 0 (existing)
- ✓ Mentions légales page — Phase 0 (existing)

### Active

<!-- Milestone v1.0 — Visual Redesign -->
- [ ] Landing page rebuilt with Selenium Phase 02 design system
- [ ] Services page rebuilt with 9 sections + new design system
- [ ] Mentions légales rethemed to new design system
- [ ] /demo CRM dashboard rethemed to new design system
- [ ] Remove freelance-era signals (bio, skills bars, StarkDisplay Iron Man, "Hire me")
- [ ] Design system implemented (CSS vars, fonts: Bricolage Grotesque + Manrope + JetBrains Mono)

### Out of Scope

- /demo/feuillette — branded client pitch, intentionally separate
- Backend/API changes — no functional changes to CRM or VAPI in this milestone
- New content languages — i18n structure preserved, content already written in mockup

## Context

- **Tech stack**: Next.js 14, TypeScript, Tailwind (or raw CSS), React, Three.js (canvas), Supabase
- **Design mockup**: Available in `~/Downloads/portfolio/` — JSX components (landing-app.jsx, landing-hero.jsx, landing-i18n.jsx, services-app.jsx, services-i18n.jsx) + HTML prototypes
- **Design system**: Acid `#C4F542`, bg `#0A0B0C`, ink `#ECEAE3`, warm `#E07856`, line `#1F1F1F`
- **Fonts**: Bricolage Grotesque (display), Manrope (body), JetBrains Mono (mono) — all via Google Fonts
- **Previous look**: Indigo→purple gradient, skills bars, personal freelance framing — all to be removed
- **Target audience shift**: From developer-facing to SMB owner-facing

## Constraints

- **i18n**: Must preserve fr/en/th via existing LanguageContext — do not break language switching
- **Demo pages**: /demo/feuillette must NOT be touched
- **CRM API**: No changes to src/app/api/crm/* routes
- **SSR/SSG**: Three.js canvas components require dynamic import with ssr:false
- **Performance**: prefers-reduced-motion must be respected on all animations

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild pages (not patch) | Mockup is React component-based, fundamentally different structure from current TSX | — Pending |
| Keep LanguageContext | Already handles fr/en/th, mockup translations slot in as new keys | — Pending |
| CSS vars for design tokens | Mockup uses :root CSS vars — matches Next.js globals.css approach | — Pending |
| Dynamic import for 3D canvas | Three.js / canvas not SSR-safe | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-15 — Milestone v1.0 started*
