---
phase: 01-design-system-foundation
plan: 04
subsystem: ui
tags: [react, intersection-observer, mutation-observer, scroll-reveal, css-animation, weakset, prefers-reduced-motion]

# Dependency graph
requires:
  - phase: 01-design-system-foundation
    plan: 01
    provides: globals.css with design tokens, base styles, and cursor CSS
provides:
  - src/hooks/useReveals.ts — IntersectionObserver-based scroll-reveal hook
  - globals.css [data-reveal] CSS animation declarations
affects:
  - Phase 2 page sections that use data-reveal attributes
  - Any component calling useReveals() for entry animations

# Tech tracking
tech-stack:
  added: []
  patterns:
    - IntersectionObserver with WeakSet deduplication for scroll-triggered reveals
    - MutationObserver for dynamic DOM element observation
    - prefers-reduced-motion guard pattern in useEffect hooks
    - CSS data attribute selectors for animation state ([data-reveal], [data-reveal].in)
    - Hook-only transition-delay injection via dataset.revealDelay (no CSS attr() — poor browser support)

key-files:
  created:
    - src/hooks/useReveals.ts
  modified:
    - src/app/globals.css

key-decisions:
  - "No 'use client' on hook files — applied by consuming component, not the hook itself"
  - "transition-delay handled via JS (el.style.transitionDelay from dataset.revealDelay) not CSS attr() — attr() for non-content properties lacks universal browser support"
  - "Hook not mounted in layout.tsx — called from root page component in Phase 2 (call-site is deferred)"
  - "WeakSet prevents double-observation when MutationObserver fires sweep() on DOM changes"

patterns-established:
  - "useReveals pattern: named export hook with deps array, IntersectionObserver + MutationObserver + WeakSet + cleanup"
  - "Scroll-reveal CSS: [data-reveal] opacity:0 + translateY → [data-reveal].in opacity:1 + transform:none with 0.9s cubic-bezier(.2,.7,.2,1)"

requirements-completed:
  - DS-04

# Metrics
duration: 4min
completed: 2026-05-15
---

# Phase 01 Plan 04: useReveals Hook and Scroll-Reveal CSS Summary

**IntersectionObserver scroll-reveal hook with WeakSet deduplication, MutationObserver for dynamic elements, and [data-reveal] CSS using 0.9s cubic-bezier(.2,.7,.2,1) transition**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-15T20:52:02Z
- **Completed:** 2026-05-15T20:56:02Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `src/hooks/useReveals.ts` — new hooks directory, hook with IntersectionObserver (threshold 0.12, rootMargin -50px bottom), WeakSet deduplication, MutationObserver for dynamically-added elements, prefers-reduced-motion guard, and full cleanup on unmount
- Appended `[data-reveal]` CSS to globals.css — invisible start (opacity:0, translateY 24px), animated reveal via `.in` class (0.9s cubic-bezier), prefers-reduced-motion override
- TypeScript compiles clean (tsc --noEmit exits 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useReveals.ts hook** - `5c6f59a` (feat)
2. **Task 2: Append scroll-reveal CSS to globals.css** - `dc5a0c7` (feat)

**Plan metadata:** *(to be committed)*

## Files Created/Modified
- `src/hooks/useReveals.ts` — New file. IntersectionObserver-based scroll-reveal hook with WeakSet, MutationObserver, prefers-reduced-motion guard, named export
- `src/app/globals.css` — Appended [data-reveal], [data-reveal].in, and @media (prefers-reduced-motion) scroll-reveal rules

## Decisions Made
- No `'use client'` directive on hook file — hook files don't need it; the consuming component provides the Client Component boundary
- `transition-delay` applied via JS (`el.style.transitionDelay = dataset.revealDelay`) not CSS `attr()` — CSS `attr()` for non-content properties lacks universal browser support
- Hook is created in this plan but NOT mounted in layout.tsx — the call-site is Phase 2 (explicitly scoped per plan objective)

## Deviations from Plan

None — plan executed exactly as written.

Note: `rtk next build` reported a pre-existing build error in `layout.tsx` (dynamic() with `ssr:false` in a Server Component, introduced in Plan 02). This is outside Plan 04's scope — logged to deferred-items.md.

## Issues Encountered

**Pre-existing build failure (out of scope):** `src/app/layout.tsx` line 7 — `ssr: false` is not allowed with `next/dynamic` in Server Components. This was introduced in Plan 02 and is not related to Plan 04's changes. Logged to `.planning/phases/01-design-system-foundation/deferred-items.md` for resolution in Plan 05 or post-Phase 1 QA.

## Known Stubs

None — `useReveals.ts` is a complete hook. The CSS is complete. No stub patterns present. The hook will be wired to a page component in Phase 2 as planned.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. The T-04-01 through T-04-03 threats from the plan's threat model are all accepted/mitigated as documented.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `useReveals` hook is ready for Phase 2 page sections to call
- Any component can add `data-reveal` and optional `data-reveal-delay="0.2s"` attributes and import `useReveals` from `@/hooks/useReveals`
- Blocker: layout.tsx dynamic() Server Component error must be resolved before production build passes (deferred to Plan 05)

---
*Phase: 01-design-system-foundation*
*Completed: 2026-05-15*
