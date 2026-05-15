---
phase: 01-design-system-foundation
plan: "03"
subsystem: ui
tags: [cursor, raf, animation, css, next.js, dynamic-import]

requires:
  - "01-01: globals.css design tokens (cursor CSS appended after ::selection rule)"
  - "01-02: layout.tsx three-font setup (dynamic import added to existing import block)"
provides:
  - "CustomCursor React component with RAF loop, 0.18 lerp ring tracking, instant dot tracking"
  - "Cursor CSS in globals.css: dot 8px default / 3px hover, ring 40px default / 56px hover"
  - "mix-blend-mode:difference on both cursor elements at all times"
  - "Cursor hidden at max-width 900px via CSS media query"
  - "CustomCursor mounted globally in layout.tsx via dynamic import with ssr:false"
affects:
  - "All pages — cursor renders on every route"
  - "01-04-PLAN, 01-05-PLAN — layout.tsx now has CustomCursor mount point"

tech-stack:
  added: []
  patterns:
    - "RAF loop with lerp for smooth cursor ring tracking (factor 0.18)"
    - "next/dynamic with ssr:false for browser-only components"
    - "mix-blend-mode:difference CSS technique for contrast-agnostic cursor"

key-files:
  created:
    - "src/components/ui/CustomCursor.tsx"
  modified:
    - "src/app/globals.css"
    - "src/app/layout.tsx"

key-decisions:
  - "Dot tracks instantly (dx=mx, dy=my every frame) while ring lerps at 0.18 — matches PATTERNS.md spec"
  - "dynamic import with ssr:false prevents hydration mismatch since window/document are used in useEffect"
  - "CustomCursor placed after </LanguageProvider> so it is outside the language context subtree (cursor is UI infrastructure, not content)"

patterns-established:
  - "Browser-only components pattern: 'use client' + useEffect + dynamic ssr:false import in layout.tsx"
  - "RAF cleanup pattern: cancelAnimationFrame + removeEventListener in useEffect return"

requirements-completed:
  - DS-03

duration: ~4min
completed: 2026-05-15
---

# Phase 01 Plan 03: Custom Cursor Component Summary

**CustomCursor component with RAF loop and 0.18 lerp ring tracking, cursor CSS with mix-blend-mode:difference, and ssr:false dynamic import in layout.tsx**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-15T20:44:55Z
- **Completed:** 2026-05-15T20:48:25Z
- **Tasks:** 2
- **Files modified:** 2 (globals.css, layout.tsx)
- **Files created:** 1 (CustomCursor.tsx)

## Accomplishments

- Created `src/components/ui/CustomCursor.tsx` with full RAF loop, two HTMLDivElement refs, 0.18 lerp factor for ring, instant tracking for dot
- Hover class toggling: detects `a`, `button`, `[data-hover]` via `closest()` — adds/removes `hover` class on both dot and ring refs
- Cleanup on unmount: `cancelAnimationFrame(raf)` + `window.removeEventListener` + `document.removeEventListener`
- Returns early on `max-width: 900px` via `window.matchMedia` — no RAF loop, no listeners on mobile
- Appended cursor CSS block to `globals.css`: shared rules (position:fixed, pointer-events:none, border-radius:50%, mix-blend-mode:difference, z-index:9998, will-change:transform), dot defaults (8px), ring defaults (40px, 1.5px border, negative margins for centering), hover states, 900px media query
- Added `import dynamic from "next/dynamic"` and `CustomCursor` dynamic import (ssr:false) to `layout.tsx`
- Mounted `<CustomCursor />` inside `<body>` after `</LanguageProvider>`

## Task Commits

1. **Task 1: Create CustomCursor.tsx with RAF-based mouse tracking** - `3089a24` (feat)
2. **Task 2: Append cursor CSS to globals.css and wire dynamic import in layout.tsx** - `f121498` (feat)

**Plan metadata:** (committed with this SUMMARY)

## Files Created/Modified

- `src/components/ui/CustomCursor.tsx` - New file: 'use client', RAF loop with lerp, hover toggling, cleanup, returns early on mobile
- `src/app/globals.css` - Cursor CSS appended: .cursor-dot, .cursor-ring, hover states, 900px media query
- `src/app/layout.tsx` - dynamic import added, <CustomCursor /> mounted after </LanguageProvider>

## Decisions Made

- Dot tracks instantly (`dx=mx, dy=my` on every mousemove) while ring lerps at factor 0.18 per tick — this creates the visual lag that makes the ring feel like it is following the dot
- `ssr: false` on the dynamic import is required because the component reads `window.matchMedia`, `window.addEventListener`, and `document.addEventListener` in `useEffect` — these APIs do not exist in Node.js SSR context
- `<CustomCursor />` placed after `</LanguageProvider>` (not inside it) because the cursor is global UI infrastructure with no dependency on language context

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript check passed with 0 errors. Next.js build passed with 0 errors, 0 warnings.

## Known Stubs

None - CustomCursor is fully wired: RAF loop runs, DOM refs are connected, CSS classes exist in globals.css, component is mounted in layout.tsx.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Threat mitigations T-03-02 and T-03-03 from plan threat model are present:
- T-03-02 (dangerouslySetInnerHTML): CustomCursor uses only `className` and `style.transform` — no innerHTML assignment
- T-03-03 (RAF memory leak): `cancelAnimationFrame(raf)` called in useEffect cleanup, both event listeners removed

## User Setup Required

None.

## Next Phase Readiness

- Plan 04 (ScrollProgress) can proceed — layout.tsx is clean, no conflicts
- Plan 05 (CinemaIntro) can add its dynamic import after `<CustomCursor />` in layout.tsx
- All pages already display the cursor — no per-page wiring needed

## Self-Check: PASSED

- FOUND: src/components/ui/CustomCursor.tsx
- FOUND: src/app/globals.css (contains .cursor-dot, .cursor-ring, mix-blend-mode:difference)
- FOUND: src/app/layout.tsx (contains CustomCursor dynamic import and JSX usage)
- FOUND commit: 3089a24 (feat(01-03): create CustomCursor RAF component)
- FOUND commit: f121498 (feat(01-03): add cursor CSS and mount CustomCursor in layout)

---
*Phase: 01-design-system-foundation*
*Completed: 2026-05-15*
