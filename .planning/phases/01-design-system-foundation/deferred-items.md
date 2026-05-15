# Phase 01 Deferred Items

## Out-of-Scope Issues Discovered During Execution

### Build Error: layout.tsx dynamic() ssr:false in Server Component
- **Discovered during:** Plan 04, Task 2 (next build verification)
- **File:** src/app/layout.tsx line 7
- **Error:** `ssr: false is not allowed with next/dynamic in Server Components`
- **Root cause:** Plan 02 added `dynamic()` imports with `ssr:false` for CustomCursor and CinemaIntro directly in `layout.tsx`, which is a Server Component. Next.js 16 (Turbopack) rejects this.
- **Fix needed:** Wrap dynamic imports in a Client Component wrapper (e.g., `ClientProviders.tsx`) and render that from layout.tsx. OR add `'use client'` to layout.tsx (but that has broader implications).
- **Not fixed here:** This is a structural issue from Plan 02, outside Plan 04's scope.
- **Deferred to:** Plan 05 or post-Phase 1 QA
