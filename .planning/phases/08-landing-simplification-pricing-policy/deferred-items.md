# Phase 8 — Deferred Items

Items discovered during execution that are out of scope for the current task/plan
(pre-existing, unrelated to the files being changed) and therefore not auto-fixed
per the executor's SCOPE BOUNDARY rule.

## `npm run build` fails on `/api/crm/products` page-data collection (env gap, not a code defect)

- **Found during:** Plan 08-01, Task 1 self-check (`npm run build` acceptance criterion)
- **Symptom:** `next build` compiles and typechecks successfully ("Compiled successfully"),
  then fails during "Collecting page data" with `Error: supabaseUrl is required.` inside
  `src/lib/supabase.ts`, surfaced via `/api/crm/products`.
- **Root cause:** This worktree has no `.env.local` — `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset (confirmed via `.env.example`). This is an
  environment/secrets provisioning gap in the isolated worktree, not a regression
  introduced by any Phase 8 file change (translations.test.ts / layout.test.ts /
  calculateur-roi/page.test.ts / page.test.ts touch none of the CRM/Supabase code path).
- **Status:** Not fixed — out of scope (CRM API routes are explicitly out of scope per
  PROJECT.md constraints: "CRM API: No changes to `src/app/api/crm/*` routes"). TypeScript
  compilation itself (the actual concern of this plan's `npm run build` acceptance
  criterion — confirming the new test files typecheck) passed cleanly before this
  unrelated runtime error occurred.
- **Action needed:** Provide `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`
  in the execution environment (or worktree provisioning) for a fully green `npm run build`.

## `npm run lint` reports 35 pre-existing errors across files this phase never touched

- **Found during:** Plan 08-06, Task 2 (phase-wide gate)
- **Symptom:** `eslint` reports 35 errors (1 warning) spread across `src/app/calculateur-roi/page.tsx`,
  `src/app/demo/page.tsx`, `src/app/demo/feuillette/page.tsx`, `src/app/mentions-legales/page.tsx`,
  `src/app/not-found.tsx`, `src/app/services/page.tsx`, `src/app/services/[slug]/page.tsx`,
  `src/app/services/[slug]/not-found.tsx`, `src/components/layout/Footer.tsx`,
  `src/components/layout/Navbar.tsx`, `src/components/sections/FinalCtaSection.tsx`,
  `src/components/sections/HeroSection.tsx`, `src/components/sections/PhoneAgent.tsx`,
  `src/components/simulateur/ScoreGauge.tsx`, `src/components/simulateur/Wizard.tsx`,
  `src/components/ui/CinemaIntro.tsx` and `src/context/LanguageContext.tsx`. Rule families:
  `@next/next/no-html-link-for-pages` (plain `<a>` tags for internal routes instead of `<Link/>`),
  `react-hooks/set-state-in-effect` (setState called synchronously inside `useEffect`),
  `react-hooks/immutability` (function called before its declaration inside an effect),
  plus one `prefer-const` in `HeroSection.tsx`.
- **Root cause:** Pre-existing repo-wide lint debt, not introduced by this plan. `src/app/page.tsx`
  — the only file Plan 08-06 Task 1 modified — has zero lint errors of its own. None of the flagged
  files were touched by any Phase 8 plan except `HeroSection.tsx` and `PhoneAgent.tsx` (modified by
  Plan 08-05 for CTA repointing, not for the `<a>`-vs-`<Link>` or `prefer-const` violations flagged
  here, which predate Phase 8).
- **Status:** Not fixed — out of scope per the executor's SCOPE BOUNDARY rule (only auto-fix issues
  directly caused by the current task's changes). Fixing 16 files' worth of pre-existing lint debt is
  a repo-wide cleanup, not part of this plan's `src/app/page.tsx` re-sequencing scope.
- **Action needed:** A dedicated lint-cleanup pass (likely its own small plan/phase) converting the
  flagged `<a>` tags to `next/link`'s `<Link>`, moving the effect-body `setState` calls to
  event handlers or `useMemo`/derived-state patterns, and reordering the two feuillette/demo
  `fetchOrders`/`fetchProducts` function declarations above their `useEffect` call sites.
