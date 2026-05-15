---
phase: 01-design-system-foundation
plan: 05
subsystem: global-layout
tags: [cinema-intro, client-component, localStorage, animation, layout]
dependency_graph:
  requires:
    - 01-01-SUMMARY.md  # design tokens (--bg, --acid, --ink-faint, --line, --font-mono)
    - 01-02-SUMMARY.md  # font CSS vars registered
    - 01-03-SUMMARY.md  # layout.tsx Server Component structure, LanguageProvider
  provides:
    - CinemaIntro component with localStorage first-visit gate
    - Cinema intro CSS animations (pulse, progress)
    - ClientProviders.tsx pattern for ssr:false dynamic imports in Server Components
  affects:
    - All pages (global layout renders CinemaIntro on every first visit)
tech_stack:
  added:
    - ClientProviders.tsx ('use client' wrapper for dynamic ssr:false imports)
  patterns:
    - localStorage first-visit gate (ba_intro_seen key)
    - CSS transition for opacity+visibility fade-out (.intro.gone)
    - @keyframes pulse + progress for overlay animation
key_files:
  created:
    - src/components/ui/CinemaIntro.tsx
    - src/components/ui/ClientProviders.tsx
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
decisions:
  - "ClientProviders.tsx introduced as 'use client' boundary: dynamic()+ssr:false is forbidden in Next.js Server Components (Turbopack enforces this). All browser-only dynamic imports are now routed through ClientProviders."
  - "CinemaIntro uses gone state + CSS transition (opacity/visibility) not conditional rendering — avoids layout shift on dismiss"
metrics:
  duration: ~8 min
  completed: 2026-05-15T21:04:06Z
  tasks_completed: 2
  files_modified: 4
---

# Phase 1 Plan 05: CinemaIntro First-Visit Overlay Summary

**One-liner:** Full-screen cinema intro overlay with localStorage first-visit gate, 1700ms auto-dismiss, pulse + progress CSS animations, mounted globally via ClientProviders pattern.

## What Was Built

`CinemaIntro.tsx` — a 'use client' React component that:
- Checks `localStorage.getItem('ba_intro_seen')` on mount
- Returns early (gone=true) on return visits unless `force=true`
- On first visit, fires a 1700ms `setTimeout` that sets gone=true, writes `ba_intro_seen='1'` to localStorage, and calls `onDone?.()`
- Cleans up via `clearTimeout` on unmount
- Drives `.intro` / `.intro.gone` class toggling for CSS fade-out

`ClientProviders.tsx` — a 'use client' boundary component that:
- Hosts `dynamic(() => import(...), { ssr: false })` calls for both `CustomCursor` and `CinemaIntro`
- Resolves the Next.js Turbopack constraint that forbids `ssr:false` in Server Components

`globals.css` — cinema intro CSS block appended:
- `.intro`: fixed full-screen overlay, z-index 9999, flex-centered, `var(--bg)` background
- `.intro.gone`: opacity 0, visibility hidden, pointer-events none (CSS fade-out)
- `.intro-mark`: 10px acid-green circle with `pulse` keyframe animation
- `.intro-label`: mono 11px uppercase with `var(--ink-faint)` color, 0.18em letter-spacing
- `.intro-progress`: 160px×1px bar with `progress` keyframe filling left-to-right over 1.5s
- `@keyframes pulse` and `@keyframes progress`

`layout.tsx` — Server Component updated to import `ClientProviders` and render `<ClientProviders />` after `</LanguageProvider>`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Next.js Turbopack forbids `dynamic()+ssr:false` in Server Components**

- **Found during:** Task 2 build verification
- **Issue:** Turbopack (Next.js 15) raises a hard error when `dynamic(() => ..., { ssr: false })` is called at module level in a Server Component. This was a known blocker documented in STATE.md from Plan 03/04.
- **Fix:** Created `src/components/ui/ClientProviders.tsx` as a `'use client'` boundary component. Moved both `CustomCursor` and `CinemaIntro` dynamic imports into it. `layout.tsx` now imports `ClientProviders` (a static import of a Client Component — fully supported in Server Components).
- **Files modified:** `src/components/ui/ClientProviders.tsx` (new), `src/app/layout.tsx`
- **Commit:** `58b4428`

## Known Stubs

None — all CSS variables referenced (`--bg`, `--acid`, `--ink-faint`, `--line`, `--font-mono`) are defined in globals.css from Plan 01/02. Component is fully wired and functional.

## Threat Flags

No new security surface introduced beyond the plan's threat model. `ba_intro_seen` stores only the literal `'1'` — no PII. No `dangerouslySetInnerHTML` anywhere in `CinemaIntro.tsx`.

## Self-Check: PASSED

- `src/components/ui/CinemaIntro.tsx` — exists, contains `ba_intro_seen`, `clearTimeout`, `1700`, `gone`
- `src/components/ui/ClientProviders.tsx` — exists, contains `dynamic`, `ssr: false`, both component imports
- `src/app/globals.css` — contains `.intro`, `@keyframes pulse`, `@keyframes progress`, `z-index: 9999`
- `src/app/layout.tsx` — contains `ClientProviders`, no dynamic imports at module level
- Commits `ec58979` (Task 1) and `58b4428` (Task 2) verified in git log
- `npx next build` exits 0, 12/12 static pages generated, no TypeScript errors
