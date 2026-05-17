# Phase 3: Services Page Rebuild - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace `src/app/services/page.tsx` with the complete Selenium Phase 02 services design. Nine sections in order: Hero, Problem (4 pain cards), Approach (6 benefits + 3 numbered cards), Offers (4 pricing packs), PhoneAgent explainer (4 steps), Maintenance (3 packs), Options (8 add-on cards), Methodology (scroll-rail, 6 steps), Reassurance (4 trust points) + Final CTA + Partners ticker + Footer. Complete rewrite of the freelance-era indigo/gradient services page. No new backend routes or functionality.

</domain>

<decisions>
## Implementation Decisions

### Methodology Scroll-Rail (SVC-08)
- **D-01:** Use **GSAP ScrollTrigger** for the Methodology section — sticky sidebar rail layout.
  - Left column = vertical step list, **pinned** while right column scrolls through step content.
  - Active step highlights (acid accent, bold) as corresponding right-side content enters view.
  - Pattern: table-of-contents that tracks scroll progress — not a full-pin like the landing PhoneAgent.
  - GSAP already installed from Phase 2 — no new package needed.
  - Follow `ClientProviders.tsx` + `dynamic(..., { ssr: false })` pattern for GSAP usage.

### PhoneAgent Explainer (SVC-05)
- **D-02:** Build a **new `PhoneAgentExplainer.tsx`** component — separate from the landing `PhoneAgent.tsx`.
  - Static 4-step numbered grid layout. No scroll effects, no GSAP.
  - Landing `PhoneAgent.tsx` remains pure (GSAP scroll-pinned). Clean separation of concerns.
  - Content from `services-i18n.jsx` `phoneAgent` section.

### CSS Polish Plan
- **D-03:** Include a **dedicated CSS plan** (last plan in Phase 3) for services-specific CSS in `globals.css`.
  - Same structure as Phase 2's `02-06` plan: services section spacing, methodology rail styles, services hero grid, any section-specific globals.
  - Includes a human checkpoint before closing the phase.

### Mockup Fidelity
- **D-04:** **Strict mockup fidelity** — follow `services-app.jsx` exactly for all 9 sections.
  - Section order, card counts, labels, content all from the mockup. No freestyle additions.
  - `services-i18n.jsx` is the source of truth for all i18n strings.

### Carried Forward from Phase 1 & 2
- **D-05:** CSS vars only — never hardcode hex. Use `var(--bg)`, `var(--acid)`, `var(--ink)`, `var(--warm)`, `var(--line)`, `var(--bg-2)`, `var(--ink-dim)`, `var(--ink-faint)`.
- **D-06:** All browser-only components (GSAP Methodology rail) via `ClientProviders.tsx` + `dynamic(..., { ssr: false })`.
- **D-07:** All i18n strings via `const { t } = useLanguage()` — keys from `services-i18n.jsx`.
- **D-08:** `data-reveal` / `data-reveal-delay` attributes on section titles and cards for scroll animations.
- **D-09:** Separate component files in `src/components/sections/` — one file per section (Phase 2 pattern).
- **D-10:** Absolute hrefs `/#contact` for all cross-page CTA links (relative hrefs fail from `/services`).
- **D-11:** Navbar, Footer, and `PartnersBanner.tsx` — direct reuse from Phase 2 output. Do not rebuild.

### Claude's Discretion
- GSAP ScrollTrigger scrub factor, snap settings, and pin spacing for the Methodology rail.
- Exact step highlight animation (color transition speed, font-weight transition).
- Grid layout specifics for each section (gap, max-width, responsive breakpoints) — follow mockup as reference.
- Whether Methodology rail GSAP logic lives in the component file or a dedicated `useMethodologyRail.ts` hook.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Mockup (primary implementation reference)
- `C:/Users/Anatholy/Downloads/portfolio/services-app.jsx` — Complete React implementation of all services sections. Authoritative reference for component structure, section order, and design patterns.
- `C:/Users/Anatholy/Downloads/portfolio/services-i18n.jsx` — All translation strings for the services page in fr/en/th. Source of truth for i18n keys, pricing content, step labels, and all section content.
- `C:/Users/Anatholy/Downloads/portfolio/03 Services.html` — HTML prototype with full CSS for the services page. Reference for visual layout, spacing, and CSS class naming.

### Existing Codebase (Phase 2 output — reuse directly)
- `src/app/services/page.tsx` — File to be completely rewritten. Current freelance-era version is reference for what to remove.
- `src/app/services/layout.tsx` — May contain Navbar/layout wrapper — inspect before rewriting page.tsx.
- `src/context/LanguageContext.tsx` — i18n hook — all user-facing strings via `useLanguage()`.
- `src/components/sections/PhoneAgent.tsx` — Landing PhoneAgent (GSAP scroll-pinned). Do NOT modify — SVC-05 gets a new `PhoneAgentExplainer.tsx`.
- `src/components/ui/ClientProviders.tsx` — Pattern for all `ssr:false` dynamic imports (GSAP Methodology).
- `src/app/globals.css` — All CSS vars live here. Services-specific CSS added in final plan.

### Phase 1 & 2 Patterns
- `src/hooks/useReveals.ts` — Call once in `services/page.tsx` to activate `data-reveal` animations.
- `src/components/sections/PartnersBanner.tsx` — Reuse directly for SVC-10 Partners ticker.
- `src/components/layout/Navbar.tsx` — Reuse from Phase 2. No changes.
- `src/components/layout/Footer.tsx` — Reuse from Phase 2. No changes.

### Requirements
- `.planning/REQUIREMENTS.md` — SVC-01 through SVC-10 are the acceptance criteria for this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PartnersBanner.tsx` — Horizontal auto-scroll ticker. Import directly for SVC-10.
- `Navbar.tsx` / `Footer.tsx` — Rebuilt in Phase 2 with Selenium Phase 02 design. Import as-is.
- `useReveals.ts` — Mount once in `services/page.tsx`; all `data-reveal` elements animate automatically.
- `ClientProviders.tsx` — Required wrapper for GSAP Methodology component (ssr:false).
- `gsap` package — Already installed in Phase 2 for landing PhoneAgent. No reinstall needed.

### Established Patterns
- Dynamic import: `const MethodologySection = dynamic(() => import('@/components/sections/MethodologySection'), { ssr: false })` — route through `ClientProviders`.
- Translation: `const { t } = useLanguage(); const ts = t.services.hero;` — namespace per section.
- Scroll reveal: add `data-reveal` to section wrappers/cards, `data-reveal-delay="0.1s"` for stagger.
- CSS vars: `bg-[var(--bg)]` via Tailwind or direct `var(--acid)` in CSS — never hex literals.
- Cross-page CTAs: `href="/#contact"` not `href="#contact"`.

### Integration Points
- `src/app/services/page.tsx` — complete rewrite; imports all new section components + `useReveals`.
- `src/app/globals.css` — final CSS plan adds services-specific rules (section spacing, methodology rail layout).
- No new API routes, no Supabase, no form backend changes.

</code_context>

<specifics>
## Specific Ideas

- Methodology rail: left column step list should be visually minimal — step number (acid color, JetBrains Mono) + step label. Active state: acid underline or left border accent, bold weight.
- SVC-01 hero title: "Sites, outils, agents." — verify exact text + punctuation from `services-i18n.jsx`.
- Problem section (SVC-02) uses `var(--warm)` (#E07856) accent on pain cards — not acid.
- Maintenance popular badge (SVC-06): Business pack (€79) — verify which pack gets the badge in `services-app.jsx`.
- PhoneAgentExplainer numbered steps: use JetBrains Mono for step numbers (consistent with Phase 1 mono usage).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 3 scope.

</deferred>

---

*Phase: 03-services-page-rebuild*
*Context gathered: 2026-05-17*
