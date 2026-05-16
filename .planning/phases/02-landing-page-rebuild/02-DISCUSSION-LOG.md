# Phase 2: Landing Page Rebuild - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 02-landing-page-rebuild
**Areas discussed:** Component cleanup, Phone Agent scroll, Réalisations data, Contact form, Navbar scope

---

## Component Cleanup Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Delete + recreate in src/components/sections/ | Clean break, same folder pattern | ✓ |
| Delete + recreate in src/components/landing/ | Isolated subfolder for page-specific components | |
| Gut and rewrite in place | Keep filenames, rewrite contents | |

**User's choice:** Option 1 — delete freelance files, new components in `src/components/sections/`
**Notes:** Files to delete: Hero.tsx, About.tsx, Projects.tsx, PhoneAgentPromo.tsx, Contact.tsx, Scene.tsx, FloatingShapes.tsx, StarkDisplay.tsx.

---

## Phone Agent Pinned Scroll

| Option | Description | Selected |
|--------|-------------|----------|
| CSS sticky + custom JS scroll listener | No new packages, moderate complexity | |
| GSAP ScrollTrigger | Industry standard, needs gsap package (~60KB) | ✓ |
| CSS scroll-snap (no pin) | Simplest, least visual impact | |

**User's choice:** Option 2 — GSAP ScrollTrigger
**Notes:** Pin the panel while user scrolls through steps. SVG particles scrubbed to scroll progress.

---

## Réalisations: Data Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded JSX | Fast, zero abstraction | |
| src/data/projects.ts (TS data file) | Mapped by component, easier to update | ✓ |

**User's choice:** Option 2 — `src/data/projects.ts`
**Notes:** Same 4 projects as mockup. Content strings via LanguageContext i18n keys.

**Projects confirmed from landing-i18n.jsx:**
1. Feuillette — IA/VOIX/CRM · 2025
2. Gecko Cabane — SITE/RESA · 2024
3. Les Folies Temps Danse — WEB/GESTION · 2024
4. Ghjulianu Codani — SITE/EDITORIAL · 2025

---

## Contact Form Submission

| Option | Description | Selected |
|--------|-------------|----------|
| Existing API route (src/app/api/crm/*) | Use Phase 0 endpoint | |
| New API route → Resend email | New route, needs RESEND_API_KEY | |
| n8n webhook (NEXT_PUBLIC_FORM_URL) | Keep existing pattern | ✓ |

**User's choice:** Keep n8n webhook — same `NEXT_PUBLIC_FORM_URL` env var, same POST JSON pattern.
**Notes:** User confirmed: "en ce moment c'est un webhook n8n non ? on peut garder le meme avec le meme body." New form adds `projectType` field to body. Webhook handles gracefully.

---

## Navbar Scope in Phase 2

| Option | Description | Selected |
|--------|-------------|----------|
| Full rebuild in Phase 2 | New design alongside page rebuild | ✓ |
| Defer to Phase 4 | Retheme with everything else | |
| Minimal update now, full rebuild Phase 4 | Only CSS vars applied now | |

**User's choice:** Option 1 — full Navbar rebuild in Phase 2.
**Notes:** New nav: dark bg, acid accent, Bricolage Grotesque, fr/en/th switcher matches mockup.

---

## Claude's Discretion

- Three.js icosphere geometry and material details
- GSAP ScrollTrigger scrub/timing parameters
- SVG particle path geometry for Phone Agent flow
- Whether to reuse PartnersBanner.tsx or rewrite
- `useReveals()` mounting location in page.tsx

## Deferred Ideas

None.
