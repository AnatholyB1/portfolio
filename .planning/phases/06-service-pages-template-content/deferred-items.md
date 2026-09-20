# Deferred Items — Phase 6

Pre-existing issues discovered during execution that are out of scope for the current task/plan (SCOPE BOUNDARY rule — only auto-fix issues directly caused by the current task's changes).

## From Plan 06-02, Task 1 (`npm run lint` baseline)

`npm run lint` was run to verify Task 1 (globals.css CSS-only addition — ESLint does not lint `.css` files, so this task cannot have caused any of the below). Full pre-existing repo-wide lint failures observed, unrelated to files this plan touches (`src/app/globals.css`, `src/app/services/[slug]/{layout,page,not-found}.tsx`):

- `src/app/demo/feuillette/page.tsx` — `fetchOrders`/`fetchProducts` accessed before declaration (react-hooks/immutability), `prefer-const` on `x`/`y` (~lines 46-114)
- `src/components/sections/OffersSection.tsx:42` — `<a>` to `/` should use `next/link` (`@next/next/no-html-link-for-pages`)
- `src/components/sections/ServicesHeroSection.tsx:13,27` — same `no-html-link-for-pages` issue
- `src/components/ui/CinemaIntro.tsx:17` — `setState` called synchronously in effect (`react-hooks/set-state-in-effect`) + missing `onDone` dep warning
- `src/context/LanguageContext.tsx:28` — `setState` called synchronously in effect (`react-hooks/set-state-in-effect`)

None of these files are in this plan's `files_modified` list. Not fixed — logged per SCOPE BOUNDARY. `npm run lint` exiting non-zero for Task 1/Task 3 acceptance criteria reflects this pre-existing repo state, not a regression introduced by plan 06-02.

## From Plan 06-02, Task 3 (`[slug]/page.tsx`, `[slug]/not-found.tsx`)

The new route files add 4 more instances of `@next/next/no-html-link-for-pages` (plain `<a href="/services">`, `<a href="/#contact">`, `<a href="/simulateur">`). This is not a new pattern: every existing internal-nav link in this codebase (`Navbar.tsx`, `Footer.tsx`, `OffersSection.tsx`, `ServicesHeroSection.tsx`, `calculateur-roi/page.tsx`) already uses plain `<a>` tags and already trips this same rule — it is a repo-wide, unaddressed convention, not something this plan introduces. Task 3's action text explicitly mandates copying these exact `<a>`/class patterns verbatim from those existing components (`.crumb-back`, `.btn-primary`, `.btn-ghost`, `.svc-crosslink`). Migrating the whole codebase to `next/link` is an architectural change out of this plan's scope (Rule 4 territory) — not fixed here.
