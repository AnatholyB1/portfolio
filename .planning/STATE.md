# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-15)

**Core value:** Patron de PME lands on the site and immediately understands, trusts, and knows how to contact us in under 60 seconds.
**Current focus:** Phase 1 — Design System Foundation

## Current Position

Phase: 1 of 4 (Design System Foundation)
Plan: 4 of 5 in current phase
Status: In progress — Plans 01-04 complete, Plan 05 remaining
Last activity: 2026-05-15 — Plan 01-04 complete (useReveals hook, scroll-reveal CSS)

Progress: [████░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: ~5 min
- Total execution time: ~19 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1 | 4 | ~19 min | ~5 min |

**Recent Trend:**
- Last 5 plans: 01-01 (~5 min), 01-02 (~5 min), 01-03 (~4 min), 01-04 (~4 min)
- Trend: Consistent ~5 min per plan

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Rebuild pages (not patch) — mockup is fundamentally different React structure
- Keep LanguageContext — fr/en/th already handled, new keys slot in
- CSS vars for design tokens — matches globals.css approach from mockup
- Dynamic import for 3D canvas — Three.js not SSR-safe
- CustomCursor uses dynamic ssr:false — browser-only APIs (window.matchMedia, addEventListener) require this pattern
- Dot tracks instantly, ring lerps at 0.18 — visual lag creates branded cursor feel
- No 'use client' on hook files — applied by consuming component, not the hook itself
- transition-delay via JS (el.style.transitionDelay) not CSS attr() — attr() for non-content properties lacks universal browser support
- useReveals not mounted in layout.tsx — called from root page component in Phase 2

### Pending Todos

None yet.

### Blockers/Concerns

- Design mockup files are in `C:/Users/Anatholy/Downloads/portfolio/` — 6 JSX files need conversion from standalone React+Babel to Next.js TSX before Phase 2/3 execution
- /demo/feuillette must NOT be touched — enforce as hard constraint in Phase 4 QA
- layout.tsx dynamic() ssr:false in Server Component — build fails; must be resolved in Plan 05 (wrap in ClientProviders or add 'use client' to layout)

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Build | layout.tsx dynamic() ssr:false in Server Component — next build fails | Deferred to Plan 05 | 01-04 |

## Session Continuity

Last session: 2026-05-15
Stopped at: Completed 01-04-PLAN.md (useReveals hook, scroll-reveal CSS)
Resume file: .planning/phases/01-design-system-foundation/01-05-PLAN.md
