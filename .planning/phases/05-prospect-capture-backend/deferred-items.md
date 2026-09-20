# Deferred Items — Phase 05 (Prospect Capture Backend)

Items discovered during execution but out of scope for the current task/plan (per Scope Boundary rule — only auto-fix issues directly caused by the current task's changes).

## Plan 01

### Pre-existing `npm run lint` failures, unrelated to this plan's files

Discovered while verifying Task 3 (`npm run lint` full-repo run in `05-01-PLAN.md`'s `<verification>` block). None of these files were touched by Plan 01 (only `package.json`, `package-lock.json`, `vitest.config.ts`, `src/lib/prospects-schema.ts`, `src/lib/prospects-schema.test.ts` were modified/created). All errors below pre-date this plan's changes:

- `src/app/demo/feuillette/page.tsx` — `fetchOrders`/`fetchProducts` accessed before declaration (react-hooks/immutability)
- `src/app/demo/page.tsx` — same `fetchOrders`/`fetchProducts` pattern
- `src/app/mentions-legales/page.tsx` — comment inside JSX children not wrapped in braces (react/jsx-no-comment-textnodes)
- `src/components/layout/Footer.tsx` — `<a>` used instead of `next/link` `<Link />` for internal nav (×3)
- `src/components/layout/Navbar.tsx` — setState called synchronously in effect (react-hooks/set-state-in-effect); `<a>` instead of `<Link />` (×3)
- `src/components/sections/FinalCtaSection.tsx` — `<a>` instead of `<Link />` (×2)
- `src/components/sections/HeroSection.tsx` — `let x`/`let y` never reassigned, should be `const` (prefer-const)
- `src/components/sections/OffersSection.tsx` — `<a>` instead of `<Link />`
- `src/components/sections/ServicesHeroSection.tsx` — `<a>` instead of `<Link />` (×2)
- `src/components/ui/CinemaIntro.tsx` — setState called synchronously in effect; missing `onDone` dependency (warning)
- `src/context/LanguageContext.tsx` — setState called synchronously in effect

**Status:** Not fixed — out of scope for this plan. `npm run lint` currently exits 1 due to these pre-existing errors; this plan's own new files (`src/lib/prospects-schema.ts`, `src/lib/prospects-schema.test.ts`) lint clean with zero errors/warnings (verified via `npx eslint src/lib/prospects-schema.test.ts` and equivalent for the source file).

**Recommendation:** A future dedicated lint-cleanup task/plan should address these, ideally before `/gsd:verify-work` gates on a full-repo lint pass.
