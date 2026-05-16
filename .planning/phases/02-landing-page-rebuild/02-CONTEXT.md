# Phase 2: Landing Page Rebuild - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace `src/app/page.tsx` with the complete Selenium Phase 02 landing page. Seven sections in order: Hero (display title + 3D icosphere + stat grid), Manifeste, Réalisations (4 project cards), Phone Agent (pinned scroll + SVG particle flow), Partners ticker, Contact form, Footer. Delete all freelance-era section and Three.js components. Rebuild Navbar to match new design. No new backend routes — form uses existing n8n webhook.

</domain>

<decisions>
## Implementation Decisions

### Component Cleanup (D-01)
- **D-01:** Delete freelance-era files entirely — do NOT rewrite in place.
  - Delete: `src/components/sections/Hero.tsx`, `About.tsx`, `Projects.tsx`, `PhoneAgentPromo.tsx`, `Contact.tsx`
  - Delete: `src/components/three/Scene.tsx`, `FloatingShapes.tsx`, `StarkDisplay.tsx`
  - Create all new Phase 2 components fresh in `src/components/sections/` (same folder pattern as before).
  - Keep: `src/components/ui/CustomCursor.tsx`, `CinemaIntro.tsx`, `ClientProviders.tsx`, `src/hooks/useReveals.ts`

### Phone Agent Section (D-02)
- **D-02:** Use **GSAP ScrollTrigger** for the pinned scroll + SVG particle flow effect.
  - Install `gsap` package.
  - ScrollTrigger pins the section panel while user scrolls through steps.
  - SVG particle animation driven by GSAP tweens, scrubbed to scroll position.
  - Import GSAP dynamically or inside `useEffect` to avoid SSR issues (follow ClientProviders pattern).

### Réalisations — Data Structure (D-03)
- **D-03:** `src/data/projects.ts` — array of 4 project objects. Content strings are i18n keys, not hardcoded strings.
- **D-04:** The 4 projects match the mockup exactly:
  1. **Feuillette** — Phone agent boulangerie · tags: IA/VOIX/CRM · 2025
  2. **Gecko Cabane** — Site vitrine + réservation restaurant · tags: SITE/RESA · 2024
  3. **Les Folies Temps Danse** — Plateforme inscription école de danse · tags: WEB/GESTION · 2024
  4. **Ghjulianu Codani** — Portfolio professionnel · tags: SITE/EDITORIAL · 2025
  - `desc` and tag labels come from LanguageContext translation keys (fr/en/th already in landing-i18n.jsx).

### Contact Form (D-05)
- **D-05:** Keep `NEXT_PUBLIC_FORM_URL` n8n webhook. Same POST JSON pattern as current `Contact.tsx`.
- **D-06:** New form has 4 fields: `name`, `email`, `projectType`, `message`. Body: `{ name, email, projectType, message }`. The extra `projectType` field is additive — webhook handles or ignores it gracefully.

### Navbar (D-07)
- **D-07:** Full Navbar rebuild in Phase 2. New design: dark bg (`var(--bg)`), acid accent (`var(--acid)`), Bricolage Grotesque nav labels, fr/en/th language switcher. Matches mockup `nav` section.

### Claude's Discretion
- Three.js icosphere implementation details (geometry parameters, shader/material choice, rotation speed).
- GSAP ScrollTrigger scrub factor and step transition timing for Phone Agent section.
- Exact SVG particle path geometry for the Phone Agent flow diagram.
- CSS specifics for the stat grid layout in the hero (grid-cols count, gap).
- PartnersBanner.tsx: reuse if compatible with new design tokens, otherwise rewrite.
- Whether to call `useReveals()` in `page.tsx` directly or mount it inside a dedicated `<RevealInit />` wrapper.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Mockup (primary implementation reference)
- `C:/Users/Anatholy/Downloads/portfolio/landing-app.jsx` — Complete React implementation of all landing sections: Hero, Manifeste, Réalisations, Phone Agent, Partners, Contact, Footer, Navbar. Use as the authoritative component structure reference.
- `C:/Users/Anatholy/Downloads/portfolio/landing-hero.jsx` — Hero section detail (display title animation, icosphere canvas, stat grid layout).
- `C:/Users/Anatholy/Downloads/portfolio/landing-i18n.jsx` — All translation strings for the landing page in fr/en/th. Source of truth for i18n keys, project data, and section content.

### Existing Codebase
- `src/app/page.tsx` — File to be completely rewritten in Phase 2.
- `src/components/sections/Contact.tsx` — Existing form submission pattern (`NEXT_PUBLIC_FORM_URL` webhook, POST JSON). Reference for submission logic before deleting.
- `src/context/LanguageContext.tsx` — i18n hook — new sections use `useLanguage()` for all user-facing strings.
- `src/app/layout.tsx` — Navbar and Footer are imported here — update imports after rebuild.

### Phase 1 Output (reuse directly)
- `src/hooks/useReveals.ts` — Scroll-reveal hook. Call in `page.tsx` or a wrapper to activate `data-reveal` on all landing sections.
- `src/components/ui/ClientProviders.tsx` — Pattern for all `ssr:false` dynamic imports (GSAP, Three.js icosphere).
- `src/app/globals.css` — All CSS vars (`--bg`, `--acid`, `--ink`, `--warm`, `--line`, `--bg-2`, `--ink-dim`, `--ink-faint`) are live. Use them, never hardcode hex values.

### Requirements
- `.planning/REQUIREMENTS.md` — LAND-01 through LAND-08 are the acceptance criteria for this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useReveals.ts` — Call once in page.tsx, all `data-reveal` elements across sections animate on scroll.
- `ClientProviders.tsx` — Wrap any `dynamic(..., { ssr: false })` import through this provider (required for Next.js + Turbopack compatibility — locked in Phase 1).
- `PartnersBanner.tsx` — May be reusable as the Partners ticker if it already animates a horizontal scroll; inspect before rewriting.

### Established Patterns
- All browser-only components (Three.js, GSAP) go through `ClientProviders` + `dynamic(..., { ssr: false })`.
- Translation via `const { t } = useLanguage()` — no prop drilling.
- `data-reveal` + `data-reveal-delay` attributes trigger scroll animations automatically once `useReveals()` is mounted.
- Form submission: `fetch(NEXT_PUBLIC_FORM_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })`.

### Integration Points
- `src/app/page.tsx` — complete rewrite; imports all new section components.
- `src/app/layout.tsx` — Navbar + Footer imports updated after rebuild.
- `src/data/projects.ts` — new file; imported by Réalisations section component.

</code_context>

<specifics>
## Specific Ideas

- Hero display title is 3 lines: "Des outils / qui *travaillent* / pour vos clients." (fr) — the italic word comes from `title_l2_it` i18n key. Render with Bricolage Grotesque variable font at large optical size.
- Stat grid in hero: 4 stats from mockup meta section — verify exact values in `landing-i18n.jsx`.
- Phone Agent step labels come from `landing-i18n.jsx` `phone` section — `steps[]` array.
- Partners ticker content comes from mockup `partners` section — horizontal auto-scroll with CSS animation or GSAP.
- Contact section info block (email, availability) pulls from `landing-i18n.jsx` `contact.info[]` array.
- SEO: page `<title>` and `<meta description>` must reflect agency positioning — no freelance/hire-developer keywords. Update `src/app/page.tsx` metadata export.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 2 scope.

</deferred>

---

*Phase: 02-landing-page-rebuild*
*Context gathered: 2026-05-16*
