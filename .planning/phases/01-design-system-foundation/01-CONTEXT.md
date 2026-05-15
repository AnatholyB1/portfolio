# Phase 1: Design System Foundation - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the complete global design system — CSS custom properties, Google Fonts, custom cursor, scroll-reveal, and cinema intro — so that every page inherits the Selenium Phase 02 brand automatically. No page-level components are built in this phase; Phase 2 and 3 consume what Phase 1 establishes.

</domain>

<decisions>
## Implementation Decisions

### Fonts (DS-02)
- **D-01:** Use `next/font/google` for all three typefaces — fonts served locally by Next.js, no FOUIT, no external CDN dependency.
- **D-02:** Bricolage Grotesque loaded as a **variable font** (full weight range, `axes: ['opsz']` enabled for optical sizing at 96). CSS var: `--font-display`.
- **D-03:** Manrope loaded with weights `['300','400','500','600','700']`. CSS var: `--font-body`.
- **D-04:** JetBrains Mono loaded with weights `['300','400','500']`. CSS var: `--font-mono`.
- **D-05:** All three fonts use `subsets: ['latin']`.

### CSS Design Tokens (DS-01)
- **D-06:** Establish all 9 tokens in Phase 1 (not just the 5 core DS-01 ones) so Phase 2/3 components have the full palette available immediately.

  ```css
  :root {
    /* Core (DS-01) */
    --bg:        #0A0B0C;
    --acid:      #C4F542;
    --ink:       #ECEAE3;
    --warm:      #E07856;
    --line:      #1F1F1F;

    /* Extended (from mockup — used by Phase 2/3) */
    --bg-2:      #111213;                  /* cards, nav bg */
    --ink-dim:   #9A9690;                  /* secondary text */
    --ink-faint: #5A5751;                  /* labels, mono details */
    --grid:      rgba(236,234,227,0.04);   /* hero bg grid pattern */
  }
  ```

- **D-07:** Remove all legacy color values from `globals.css` (Inter font reference, `#0a0a0a`, `#ededed`, indigo scrollbar, indigo selection color).

### Tailwind Integration
- **D-08:** Keep Tailwind. Extend `tailwind.config.js` to expose CSS vars as Tailwind tokens so Phase 2/3 components can use class-based utilities (e.g. `text-ink`, `bg-acid`, `border-line`).

  ```js
  // tailwind.config.js
  theme: { extend: { colors: {
    bg:   'var(--bg)',
    acid: 'var(--acid)',
    ink:  'var(--ink)',
    warm: 'var(--warm)',
    line: 'var(--line)',
    'bg-2':      'var(--bg-2)',
    'ink-dim':   'var(--ink-dim)',
    'ink-faint': 'var(--ink-faint)',
  }}}
  ```

### Custom Cursor (DS-03)
- **D-09:** Two elements: `.cursor-dot` (small, instant tracking) + `.cursor-ring` (larger, lagged tracking at 0.18 lerp factor). Disabled on `max-width: 900px` (touch devices).
- **D-10:** Both elements use `mix-blend-mode: difference` at all times (not just on hover).
- **D-11:** Hover state (on `a`, `button`, `[data-hover]`): ring **expands** (default ~40px → hover ~56px) and dot **shrinks** (default ~8px → hover ~3px). Class `.hover` added to both elements.
- **D-12:** Implemented as a `<CustomCursor />` React component, mounted in `layout.tsx` via dynamic import with `ssr: false`.

### Scroll-Reveal (DS-04)
- **D-13:** IntersectionObserver with `threshold: 0.12, rootMargin: '0px 0px -50px 0px'`.
- **D-14:** Default reveal: `opacity: 0 → 1`, `translateY(24px → 0)`, transition `0.9s cubic-bezier(.2,.7,.2,1)`.
- **D-15:** Attribute: `data-reveal`. Optional: `data-reveal-delay` (e.g. `"0.15s"`) for staggered reveals.
- **D-16:** Implemented as a `useReveals()` React hook (not a component), re-exported from a shared file. Includes `MutationObserver` to catch dynamically-added elements.
- **D-17:** `prefers-reduced-motion`: when set, skip the transition (elements appear immediately, `opacity: 1, transform: none` without animation).

### Cinema Intro (DS-05)
- **D-18:** Full-screen overlay, `position: fixed, z-index: 9999`, `background: var(--bg)`.
- **D-19:** Content: pulsing acid dot (`.intro-mark`), label text **"BRICON·ANATHOLY."** in JetBrains Mono, animated progress bar (`.intro-progress`).
- **D-20:** Auto-dismisses after **1700ms** — no click/keypress skip.
- **D-21:** First-visit only: `localStorage.getItem('ba_intro_seen')`. On dismiss, sets `'ba_intro_seen': '1'`. Return visits skip immediately.
- **D-22:** Implemented as a `<CinemaIntro />` React component with `onDone` callback. Supports a `force` prop (for preview/dev) to replay regardless of localStorage.

### Claude's Discretion
- Exact pixel dimensions for cursor-dot and cursor-ring (approximately 8px dot, 40px ring — tune visually).
- Exact easing / keyframe details for the intro-mark pulse and intro-progress animation.
- Whether to put cursor + intro in a single `<DesignSystem />` wrapper component or mount separately in `layout.tsx`.
- CSS class naming conventions for the reveal system (`.in` class mirrors the mockup).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System Mockup
- `C:/Users/Anatholy/Downloads/portfolio/landing-app.jsx` — Complete React implementations of `CustomCursor`, `CinemaIntro`, and `useReveals` hook. Use as the authoritative implementation reference for Phase 1 components.
- `C:/Users/Anatholy/Downloads/portfolio/01 Direction creative.html` — Full CSS token set (`:root` vars), scroll-reveal CSS (`[data-reveal]` / `.in`), font loading via `<link>`, typography scale, motion language section. The `[data-reveal]` CSS block (line ~382) and the IntersectionObserver script (lines ~882–888) are the reference implementations.

### Existing Codebase
- `src/app/globals.css` — File to be replaced/rewritten in Phase 1. Currently contains Inter font reference, legacy indigo colors, Tailwind @import and @theme block.
- `src/app/layout.tsx` — File to be updated: font swap (Inter → three new fonts), `<body>` class cleanup, add cursor + intro components.

### Requirements
- `.planning/REQUIREMENTS.md` — DS-01 through DS-05 are the acceptance criteria for this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/context/LanguageContext.tsx` — Must be preserved and kept as the `<LanguageProvider>` wrapping in `layout.tsx`. Phase 1 does not touch it.
- `src/app/layout.tsx` — Current font setup (Inter) and body classes to be replaced; `<LanguageProvider>` wrapper to be kept.

### Established Patterns
- Dynamic imports with `ssr: false` are the pattern for Three.js components already (mentioned in PROJECT.md). Apply same pattern to `<CustomCursor />` and `<CinemaIntro />`.
- Tailwind is in use across all existing components — CSS var integration (D-08) keeps existing components functional during transition.

### Integration Points
- `layout.tsx` is the injection point for `<CustomCursor />` and `<CinemaIntro />` — rendered once, applies globally.
- `globals.css` is the injection point for `:root` tokens, font CSS vars, `[data-reveal]` CSS, cursor CSS, and scrollbar/selection overrides.
- `tailwind.config.js` gets the `colors` extension (D-08). No other Tailwind changes in Phase 1.

</code_context>

<specifics>
## Specific Ideas

- The direction document (01 Direction creative.html) uses `selection { background: var(--acid); color: #000 }` — replace the current indigo selection color with this.
- Scrollbar: replace current indigo scrollbar with `#222` thumb on `#000` track, `width: 6px` (matches direction doc).
- The `useReveals` hook should use a `WeakSet` to avoid re-observing elements already registered (already in the mockup implementation).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-design-system-foundation*
*Context gathered: 2026-05-15*
