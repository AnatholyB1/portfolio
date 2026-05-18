# BRICON ANATHOLY · Portfolio

## What This Is

Agency website for BRICON ANATHOLY, a web & AI agency based in Tours, France, targeting local SMBs (restaurants, shops, schools, service businesses). The site presents the Selenium Phase 02 agency brand — landing page, services page, phone agent demo — and includes a `/demo` CRM dashboard used for client demos. The freelance-era design has been fully replaced.

## Core Value

A patron de PME lands on the site and immediately understands what we do, trusts us, and knows how to contact us — in under 60 seconds.

## Requirements

### Validated

- ✓ Next.js 14 app with i18n (fr/en/th) via LanguageContext — Phase 0 (existing)
- ✓ VAPI phone agent integration + CRM API routes — Phase 0 (existing)
- ✓ /demo CRM dashboard with Supabase Realtime — Phase 0 (existing)
- ✓ /demo/feuillette branded pitch page — Phase 0 (existing)
- ✓ Mentions légales page — Phase 0 (existing)
- ✓ Design system implemented (CSS vars, Bricolage Grotesque + Manrope + JetBrains Mono, custom cursor, scroll-reveal, cinema intro) — v1.0
- ✓ Landing page rebuilt with Selenium Phase 02 design system — v1.0
- ✓ Services page rebuilt with 9 sections + new design system — v1.0
- ✓ Mentions légales rethemed to new design system — v1.0
- ✓ /demo CRM dashboard rethemed to new design system — v1.0
- ✓ Remove freelance-era signals (bio, skills bars, StarkDisplay Iron Man, "Hire me") — v1.0

### Active

*(Start next milestone with `/gsd:new-milestone` to define v1.1 requirements)*

Candidates from v1.0 deferred work:
- [ ] Footer nav labels wired to LanguageContext (t.nav.* keys — currently hardcoded)
- [ ] JS-level prefers-reduced-motion guards in CinemaIntro, CustomCursor, PhoneAgent, MethodologySection

### Out of Scope

- /demo/feuillette — branded client pitch, intentionally separate
- Backend/API changes — no functional changes to CRM or VAPI
- New content languages — fr/en/th sufficient

## Context

- **Tech stack**: Next.js 14, TypeScript, Tailwind v4 (@theme inline), React, Three.js (canvas), GSAP (ScrollTrigger), Supabase
- **Design system**: Acid `#C4F542`, bg `#0A0B0C`, ink `#ECEAE3`, warm `#E07856`, line `#1F1F1F`
- **Fonts**: Bricolage Grotesque (display, variable), Manrope (body), JetBrains Mono (mono) — all via Google Fonts
- **Current state**: v1.0 shipped — full agency rebrand complete. ~2,868 lines added, ~3,005 removed across 39 files. Clean codebase: no freelance-era components remain.
- **ClientProviders pattern**: All ssr:false dynamic imports routed through `ClientProviders.tsx` ('use client' boundary) — required by Next.js Turbopack
- **Nav hrefs**: Absolute (`/#manifeste`, `/#work`, `/#contact`) — relative hrefs fail from /services

## Constraints

- **i18n**: Must preserve fr/en/th via existing LanguageContext — do not break language switching
- **Demo pages**: /demo/feuillette must NOT be touched
- **CRM API**: No changes to src/app/api/crm/* routes
- **SSR/SSG**: Three.js and GSAP components require dynamic import with ssr:false via ClientProviders
- **Performance**: prefers-reduced-motion must be respected on all animations

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild pages (not patch) | Mockup is React component-based, fundamentally different structure from current TSX | ✓ Good — clean result, no regression |
| Keep LanguageContext | Already handles fr/en/th, mockup translations slot in as new keys | ✓ Good — zero breaking changes |
| CSS vars for design tokens | Mockup uses :root CSS vars — matches Next.js globals.css approach | ✓ Good — consistent across all pages |
| Dynamic import for 3D canvas | Three.js / canvas not SSR-safe | ✓ Good — Turbopack compatible |
| ClientProviders.tsx pattern | ssr:false forbidden in Next.js Server Components (Turbopack) | ✓ Good — adopted for Methodology too |
| Absolute hrefs in nav | Relative hrefs (#manifeste) fail when navigating from /services | ✓ Good — cross-page navigation works |
| CSS-only services block | 171 lines using CSS vars only, no hex literals — scoped to .s-* classes | ✓ Good — no conflicts with Phase 2 classes |
| Baseline 5f36fa0 for feuillette QA | Pre-Phase-1 planning commit, before any code changes | ✓ Good — clean integrity check |

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
*Last updated: 2026-05-18 after v1.0 milestone*
