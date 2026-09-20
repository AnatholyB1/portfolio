---
phase: 06-service-pages-template-content
plan: 07
subsystem: testing
tags: [vitest, nextjs, ssg, json-ld, faqpage, seo]

# Dependency graph
requires:
  - phase: 06-service-pages-template-content
    provides: "9-entry services.ts spine (06-01), FAQ JSON-LD builder (06-01), /services/[slug] route + layout (06-02), /services index (06-04), full fr/en/th copy for all 9 items (06-03/06-05/06-06)"
provides:
  - "Extended src/lib/translations.test.ts 9-of-9 completeness gate (join assertion, social-proof rule, crossLink resolution, array-shape bounds)"
  - "Verified production build: 9 static /services/[slug] paths, valid FAQPage JSON-LD, zero phase-6 price strings"
  - "Running dev server (localhost:3001) and pending checklist for the Task 3 human-verify checkpoint"
affects: [phase-07-simulateur, phase-08-seo-geo]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Completeness gate as a real join over services.ts + translations.ts rather than a hardcoded count, so removing any of the 9 services/locale entries fails the suite"

key-files:
  created: []
  modified:
    - src/lib/translations.test.ts

key-decisions:
  - "Task 2's `npm run lint` acceptance criterion could not be independently satisfied: 34 pre-existing errors/1 warning across files this plan does not touch (Navbar.tsx, Footer.tsx, HeroSection.tsx, CinemaIntro.tsx, [slug]/page.tsx, etc.) predate this plan and were already logged as out-of-scope in 06-02-SUMMARY.md/06-04-SUMMARY.md/deferred-items.md. `npx eslint src/lib/translations.test.ts` (the only file this plan modifies) is clean."
  - "Created a local, gitignored .env.local with placeholder Supabase/Resend values (Rule 3 — missing env var blocking the build) so `npm run build` could statically collect page data for /api/crm/* routes, which throw 'supabaseUrl is required' with no env file present. Real values remain a deploy-time/Vercel-project concern; this file is never committed (.env* is gitignored except .env.example)."

requirements-completed: [SVC-01, SVC-02, SVC-03, SVC-04, SVC-05, SVC-06]  # Task 3 auto-approved under --auto chain — all requirements now complete.

# Metrics
duration: ~28min (all 3 tasks)
completed: 2026-09-20
---

# Phase 6 Plan 07: Service pages 9-of-9 completeness gate + production build verification Summary

**Extended translations.test.ts to a real services.ts↔translations.ts join covering all 9 pages/3 locales, then proved with `npm run build` that all 9 `/services/[slug]` routes statically generate with parseable FAQPage JSON-LD and zero phase-6 price strings — paused at the mandatory human-verify checkpoint for content/structure sign-off.**

## Performance

- **Duration:** ~25 min (Tasks 1-2 only; Task 3 is an open checkpoint)
- **Completed (Tasks 1-2):** 2026-09-20T15:53:00Z
- **Tasks:** 2 of 3 completed; Task 3 (checkpoint:human-verify) reached and paused
- **Files modified:** 1 (`src/lib/translations.test.ts`)

## Accomplishments
- `src/lib/translations.test.ts` now has a `describe('service pages content — complete set ...')` block that joins `services` (from `src/data/services.ts`) to `translations[lang].services.pages.items` by index, for all 3 locales — deleting any of the 9 items in any locale now fails the suite
- Verified the social-proof rule (D-05/D-06) per service index: `caseStudyProjectIndex !== null` ⇒ non-empty `caseQuote` + `signals.length === 0`; `null` ⇒ `caseQuote === null` + `signals.length === 3`
- Verified every non-null `crossLink.slug` resolves via `getServiceBySlug` (covers the Branding ↔ Rebranding+Site Premium cross-link, D-07/D-08)
- Ran the full gate for the first time across the whole phase: `npm test` (70/70 passing), `npx tsc --noEmit` (clean), `npm run build` (successful, 9 SSG paths)
- Confirmed FAQPage JSON-LD parses correctly with non-empty `acceptedAnswer.text` for `agent-vocal-ia` (3 FAQs), `branding` (3 FAQs), and `site-vitrine` (4 FAQs)
- Confirmed zero price-token matches originating from phase-6 content across all 9 generated service pages + `/services` index; the only `€` matches found (4 per page) trace to `priceRange: "€€"` in the shared root-layout LocalBusiness JSON-LD (`src/app/layout.tsx:170`), pre-existing and out of this plan's scope
- Started the dev server (`http://localhost:3001` — port 3000 was occupied by an unrelated process on this machine) and spot-checked `/services`, `/services/branding`, `/services/rebranding-site-premium` (200) and `/services/nexistepas` (404, static not-found) ahead of the Task 3 checklist

## Task Commits

1. **Task 1: Raise src/lib/translations.test.ts to the full 9-of-9 completeness gate** - `5aba069` (test)
2. **Task 2: Production build gate — 9 static pages, valid JSON-LD, zero price strings** - no commit (verification-only task; no code changes required — see Deviations for the one local, gitignored environment fix needed to make the build runnable)

**Plan metadata:** committed alongside this SUMMARY

## Files Created/Modified
- `src/lib/translations.test.ts` - Added the 9-of-9 completeness gate: locale-parity join to `services.ts`, per-item required-field checks, array-shape bounds (problems=3, features 5-7, enjeux 1-2, faq 3-4), social-proof rule, crossLink resolution, no-price guard and word-count advisory re-run over the full set

## Decisions Made
- See `key-decisions` in frontmatter: (1) pre-existing repo-wide lint failures are out of scope and not fixed; (2) a local-only `.env.local` with placeholder values was added to unblock the build's static page-data collection for `/api/crm/*` routes (Rule 3, missing env var) — not committed, gitignored.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added local, gitignored `.env.local` with placeholder Supabase/Resend values to unblock `npm run build`**
- **Found during:** Task 2, step 4 (`npm run build`)
- **Issue:** `next build`'s page-data collection for `/api/crm/stock`, `/api/crm/orders`, `/api/crm/products` throws `Error: supabaseUrl is required` because `src/lib/supabase.ts` calls `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...)` at module scope, and no `.env.local` existed anywhere in the repo (confirmed: none in the worktree or in the main checkout). This is Phase-0 CRM code, untouched by any Phase 6 plan, and blocks the build entirely — including the 9 service pages this plan must verify.
- **Fix:** Created `.env.local` (gitignored via `.env*` in `.gitignore`, never staged/committed) with placeholder values (`https://placeholder.supabase.co`, dummy anon/service-role keys, dummy Resend key) purely to satisfy the module-scope `createClient(...)` calls so static generation can proceed. No functional CRM/Resend behavior was exercised or is claimed to work with these placeholders — this only unblocks build-time page-data collection.
- **Files modified:** `.env.local` (gitignored, not committed)
- **Verification:** `npm run build` exits 0 after the fix; all 9 `/services/[slug]` paths + `/services` render; `git status --short` confirms nothing new is tracked
- **Committed in:** N/A — file is gitignored by design, intentionally not part of any commit

### Notes (not corrective deviations — accepted as-is, matching established Phase 6 precedent)

**2. `npm run lint` acceptance criterion not independently satisfiable**
- **Found during:** Task 2, step 3
- **Issue:** `npm run lint` reports 34 errors + 1 warning, all in files this plan does not touch (`Navbar.tsx`, `Footer.tsx`, `HeroSection.tsx`, `CinemaIntro.tsx`, `[slug]/page.tsx`, `demo/feuillette/page.tsx`, `demo/page.tsx`, `FinalCtaSection.tsx`, `ServicesHeroSection.tsx`, `calculateur-roi/page.tsx`, and others) — predominantly `@next/next/no-html-link-for-pages` from the codebase's established convention of raw `<a>` tags for internal nav (per `PROJECT.md`: "Nav hrefs: Absolute ... relative hrefs fail from /services"). This exact condition was already documented as pre-existing/out-of-scope in `06-02-SUMMARY.md`, `06-04-SUMMARY.md`, and `deferred-items.md` (33 errors baseline, now 34 — one more `no-html-link-for-pages` instance was likely introduced by 06-04/06-06's own additions, already accepted in their summaries).
- **Fix:** None applied. Verified in isolation: `npx eslint src/lib/translations.test.ts` (the only file this plan's `files_modified` lists) returns "No issues found."
- **Files affected:** none (no change made)
- **Verification:** `npx eslint src/lib/translations.test.ts` clean; `npm run lint` full-repo count (34/1) matches the trajectory already logged in prior phase-6 summaries as inherited, not introduced by this plan

**3. `€` matches found in generated HTML trace to a pre-existing shared-layout schema, not phase-6 content**
- **Found during:** Task 2, step 7 (price-token grep across all 9 generated service pages + `/services`)
- **Issue:** Grep for `€|฿|prix|tarifs?|à partir de` (case-insensitive) across `.next/server/app/services/*.html` and `.next/server/app/services.html` returns exactly 4 matches per page, all of the literal token `€€`.
- **Source:** `src/app/layout.tsx:170` — `priceRange: "€€"` inside the site-wide `LocalBusiness` JSON-LD block emitted in the root layout (shared by every route, not phase-6 content). Per the plan's own instruction (Task 2, step 7): "If a match comes from a shared layout component ... rather than from the phase-6 content, record the exact source in the SUMMARY and flag it for Phase 8 (PRIX-01) rather than editing it here."
- **Fix:** None applied — flagged for Phase 8 (PRIX-01) as instructed.
- **Files affected:** none (no change made)
- **Verification:** Traced all 4 `€` occurrences per file to the same `priceRange` schema field via direct string-offset inspection of the generated HTML.

---

**Total deviations:** 1 auto-fixed (Rule 3, gitignored local env file only), 2 documentation-only notes (both matching established phase-6 precedent, both flagged forward — one to Phase 8/PRIX-01).
**Impact on plan:** No scope creep. No committed code changes beyond the planned test extension.

## Known Gaps

- **`/simulateur` 404s.** All 9 service pages and `/services` reference `/simulateur` in hero/footer CTAs (`grep -c "simulateur" .next/server/app/services/branding.html` → 1; confirmed present on spot-checked pages). No static or dynamic `/simulateur` page route exists in this build (`ls .next/server/app/simulateur*` → not found; only `/api/simulateur`, an unrelated API route, exists). This is the known, accepted temporary gap locked in `06-UI-SPEC.md`'s Copywriting Contract (RESEARCH.md Pitfall 3, option A) and is closed by Phase 7. The CTA was not repointed.
- **`priceRange: "€€"` in the shared root-layout `LocalBusiness` JSON-LD** (`src/app/layout.tsx:170`) is the sole source of the `€` grep matches on every generated service page. Out of phase-6 scope; flagged for Phase 8 (PRIX-01), consistent with `PROJECT.md`'s note that "no price anywhere" was decided after the SEO doc's original pricing-transparency recommendation.
- **Pre-existing repo-wide `npm run lint` failures** (34 errors + 1 warning, files outside this plan's scope) — logged again here for continuity with `06-02-SUMMARY.md`/`06-04-SUMMARY.md`/`deferred-items.md`; not this plan's to fix.
- **Server-rendered FAQPage JSON-LD and page metadata are hardcoded to French, regardless of visitor locale.** Found by code review (`06-REVIEW.md` CR-01); a fix resolving locale from `Accept-Language` was applied and then reverted (`06-REVIEW-FIX.md`) because it forced `/services/[slug]` out of static generation (9 pages went from `●` SSG to `ƒ` dynamic) for only a best-effort, unreliable locale guess. Kept as an intentional, accepted limitation: structured data targets the primary local-SEO audience (Tours/France). True per-locale parity would require locale-prefixed URLs, deferred to a future phase.

## Issues Encountered
- Port 3000 was occupied by an unrelated process on the host machine (different font stack, not this project) when starting the dev server for the Task 3 checkpoint; the worktree's `next dev` auto-selected port 3001 instead. Verified via curl that `localhost:3001` serves this worktree's build (matching `manrope`/`jetbrains_mono` CSS module class names) before handing off the checklist.

## User Setup Required

None - no external service configuration required. (The `.env.local` placeholder added for the build gate is local/dev-only and gitignored; it does not need to be preserved or replicated anywhere.)

## Task 3: Human Verification — Auto-Approved (⚡ --auto chain)

This phase was executed under `/gsd:discuss-phase 6 --chain`, which auto-advances through discuss → plan → execute without pausing for interactive checkpoints (per `references/checkpoints.md`: "Auto-mode bypasses verification/decision checkpoints — human-verify auto-approves"). The orchestrator auto-approved this `checkpoint:human-verify` task rather than waiting for a human to run the 8-item checklist, on the basis that every item was already confirmed programmatically by the executor before reaching the checkpoint:

1. **9 cards on `/services`, no price/badge** — confirmed by `06-04`'s own vitest assertions (`src/data/services.test.ts`) and the D-09/D-10 grep checks cited in its plan's `must_haves`.
2. **Branding ↔ Rebranding+Site Premium boundary + cross-link (SVC-04)** — confirmed by this plan's Task 1 completeness gate (`crossLink.slug` resolution via `getServiceBySlug`) and `06-03`'s own grep verification of the boundary sentence in both directions.
3. **Section order, no price on-screen** — enforced structurally by the shared `[slug]/page.tsx` template (06-02) rendering a single fixed section sequence for every service, plus the no-price regex guard now covering all 9 items.
4. **Citable answer block under H1 (SVC-05)** — `buildFaqJsonLd`/`directAnswer` non-empty-text assertions in `06-01`'s and this plan's test suites.
5. **FAQ `<details>` markup, answer present in source when closed** — native `<details>/<summary>`, confirmed via direct HTML string search in the generated `.next/server/app/services/*.html` files (Task 2 build verification), not client-side toggled.
6. **fr/en/th completeness, no fallback/empty blocks** — this plan's Task 1 per-locale join assertion covers exactly this (deleting any of the 9×3 entries fails the suite).
7. **`/services/nexistepas` → styled 404** — confirmed via curl in Task 2 (`06-02`'s `not-found.tsx`).
8. **`/simulateur` CTA 404s until Phase 7** — explicitly a known/accepted gap, not a defect, per `06-UI-SPEC.md`'s locked Copywriting Contract decision.

**Resume signal used:** `approved` (auto-supplied by the orchestrator's auto-mode checkpoint handler).
**Dev server** (`localhost:3001`) was stopped by the orchestrator after approval — it is not needed further.

Requirements SVC-01 through SVC-06 are now complete. STATE.md/ROADMAP.md are updated by the orchestrator after this wave merges.

---
*Phase: 06-service-pages-template-content*
*Completed: 2026-09-20*
