---
phase: 01-design-system-foundation
plan: "01"
subsystem: ui
tags: [css, tailwind, design-tokens, tailwind-v4]

requires: []
provides:
  - "All 9 design tokens declared as CSS custom properties in :root"
  - "8 color tokens exposed as Tailwind v4 utilities via @theme inline (bg-bg, text-acid, text-ink, text-warm, border-line, bg-bg-2, text-ink-dim, text-ink-faint)"
  - "Font CSS vars wired to next/font variables (--font-bricolage, --font-manrope, --font-jetbrains)"
  - "Dark base styles: body background #0A0B0C, ink text #ECEAE3"
  - "6px scrollbar (#222 thumb / #000 track) and acid/black ::selection"
affects:
  - "02-landing-page-rebuild"
  - "03-services-page"
  - "04-retheme-existing-pages"
  - "01-02"
  - "01-03"
  - "01-04"
  - "01-05"

tech-stack:
  added: []
  patterns:
    - "Tailwind v4 @theme inline token exposure pattern"
    - "CSS custom properties for design system tokens"

key-files:
  created: []
  modified:
    - "src/app/globals.css"

key-decisions:
  - "Used Tailwind v4 @theme inline block (not tailwind.config.js) to expose CSS vars as utility classes — matches existing project setup"
  - "Excluded --grid from @theme inline since rgba values are not color utilities in Tailwind v4"

patterns-established:
  - "Design token pattern: :root CSS vars → @theme inline --color-* → Tailwind utilities"
  - "Font vars pattern: CSS vars pointing to next/font injected variables"

requirements-completed:
  - DS-01

duration: 5min
completed: 2026-05-15
---

# Phase 01 Plan 01: Design System Tokens Summary

**9 CSS design tokens declared in :root and wired into Tailwind v4 @theme inline, replacing all legacy indigo/inter/background vars in globals.css**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-15T20:35:00Z
- **Completed:** 2026-05-15T20:40:10Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Declared all 9 design tokens in `:root`: `--bg`, `--acid`, `--ink`, `--warm`, `--line`, `--bg-2`, `--ink-dim`, `--ink-faint`, `--grid`
- Wired 8 color tokens into Tailwind v4 `@theme inline` block, enabling `bg-bg`, `text-acid`, `border-line`, etc. as utility classes
- Added font CSS vars block (`--font-display`, `--font-body`, `--font-mono`) pointing to next/font-injected variables
- Replaced 8px indigo scrollbar with 6px `#222`/`#000` scrollbar
- Replaced indigo `::selection` with acid (`#C4F542`) background and `#000` text
- Removed all legacy references: `--background`, `--foreground`, `--font-inter`, `#0a0a0a`, `#ededed`, `#4f46e5`, `rgba(99, 102, 241`

## Task Commits

1. **Task 1: Rewrite globals.css with design tokens, @theme inline, and base styles** - `a7927c0` (feat)

**Plan metadata:** (committed below)

## Files Created/Modified

- `src/app/globals.css` - Full rewrite: 9 design tokens, Tailwind v4 @theme integration, body base rule, 6px scrollbar, acid selection, no legacy vars

## Decisions Made

- Used `@theme inline` block (Tailwind v4 convention) rather than creating `tailwind.config.js` — project already uses `@import "tailwindcss"` with no config file; this is the correct v4 pattern
- Excluded `--grid` from `@theme inline` because it is an rgba transparency value used for background overlay patterns, not a named color utility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All downstream plans in Phase 01 (01-02 through 01-05) can now use `bg-bg`, `text-acid`, `text-ink`, `text-warm`, `border-line`, `bg-bg-2`, `text-ink-dim`, `text-ink-faint` as Tailwind utilities
- Phase 02 landing page rebuild can use design tokens immediately
- Font vars (`--font-body`, `--font-display`, `--font-mono`) will resolve once layout.tsx is updated in Plan 01-02

---
*Phase: 01-design-system-foundation*
*Completed: 2026-05-15*
