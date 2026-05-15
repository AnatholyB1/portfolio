---
phase: 01-design-system-foundation
plan: "02"
subsystem: ui
tags: [next.js, google-fonts, bricolage-grotesque, manrope, jetbrains-mono, typography]

# Dependency graph
requires: []
provides:
  - Bricolage Grotesque loaded via next/font/google with CSS variable --font-bricolage and axes opsz
  - Manrope loaded via next/font/google with CSS variable --font-manrope and weights 300/400/500/600/700
  - JetBrains Mono loaded via next/font/google with CSS variable --font-jetbrains and weights 300/400/500
  - Inter fully removed from layout.tsx
  - Body className cleaned of legacy gradient classes (bg-linear-to-br, from-gray-900, via-black, text-white)
affects: [01-03-PLAN, 01-04-PLAN, 01-05-PLAN, globals.css font vars in 01-01-PLAN]

# Tech tracking
tech-stack:
  added: [Bricolage_Grotesque, Manrope, JetBrains_Mono from next/font/google]
  patterns: [next/font/google variable font loading with CSS custom properties]

key-files:
  created: []
  modified: [src/app/layout.tsx]

key-decisions:
  - "Use next/font/google for all three typefaces — fonts served locally by Next.js at build time, no external CDN, no FOUIT (D-01)"
  - "Bricolage Grotesque loaded as variable font with axes: [opsz] for optical sizing at large display sizes (D-02)"
  - "Manrope weights 300/400/500/600/700 cover all body text weight needs (D-03)"
  - "JetBrains Mono weights 300/400/500 cover code and mono display needs (D-04)"

patterns-established:
  - "Font variable pattern: each font declares variable: --font-{name} on body, consumed by globals.css --font-display/body/mono aliases"
  - "Body className minimal: only font variables + antialiased — all color/bg tokens handled in globals.css"

requirements-completed: [DS-02]

# Metrics
duration: 5min
completed: 2026-05-15
---

# Phase 01 Plan 02: Google Fonts Swap Summary

**Bricolage Grotesque, Manrope, and JetBrains Mono loaded via next/font/google with CSS variable injection; Inter fully removed and legacy gradient body classes cleaned**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-15T00:00:00Z
- **Completed:** 2026-05-15T00:05:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced Inter with three project typefaces: Bricolage Grotesque (display, variable font + opsz), Manrope (body), JetBrains Mono (code/mono)
- Each font exposes a CSS variable on `<body>`: `--font-bricolage`, `--font-manrope`, `--font-jetbrains`
- Body className stripped of legacy Tailwind gradient utilities (`bg-linear-to-br`, `from-gray-900`, `via-black`, `to-gray-900`, `text-white`, `min-h-screen`, `font-sans`) — these are now handled by `globals.css` (Plan 01)
- Metadata export (lines 24-77) and LanguageProvider wrapper preserved without any changes

## Task Commits

1. **Task 1: Swap Inter for three Google Fonts and clean body className** - `95e4b35` (feat)

**Plan metadata:** (committed with this SUMMARY)

## Files Created/Modified

- `src/app/layout.tsx` - Replaced Inter import/declaration with Bricolage_Grotesque/Manrope/JetBrains_Mono; updated body className to inject three CSS font variables

## Decisions Made

None - followed plan as specified. All font config values (variable names, weights, axes) taken from CONTEXT.md D-01 through D-05 as planned.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Build passed with 0 errors, 0 warnings after changes.

## User Setup Required

None - no external service configuration required. Fonts are downloaded by Next.js at build time from Google Fonts and served locally.

## Next Phase Readiness

- Font CSS variables (`--font-bricolage`, `--font-manrope`, `--font-jetbrains`) are now available on `<body>` for `globals.css` (Plan 01) to alias as `--font-display`, `--font-body`, `--font-mono`
- Plan 03 (CustomCursor) and Plan 05 (CinemaIntro) can add their dynamic imports to the now-clean layout.tsx
- No blockers

## Self-Check: PASSED

- FOUND: src/app/layout.tsx
- FOUND: .planning/phases/01-design-system-foundation/01-02-SUMMARY.md
- FOUND commit: 95e4b35 (feat(01-02): swap Inter for three Google Fonts in layout.tsx)
- All acceptance criteria verified: Bricolage_Grotesque imported, Inter absent, font-inter absent, LanguageProvider preserved, body className correct

---
*Phase: 01-design-system-foundation*
*Completed: 2026-05-15*
