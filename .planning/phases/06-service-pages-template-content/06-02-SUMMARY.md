---
phase: 06-service-pages-template-content
plan: 02
subsystem: ui
tags: [nextjs, dynamic-route, app-router, jsonld, schema.org, i18n]

# Dependency graph
requires:
  - phase: 06-service-pages-template-content (plan 01)
    provides: "src/data/services.ts, src/lib/serviceJsonLd.ts, t.services.pages skeleton in src/lib/translations.ts"
provides:
  - "src/app/services/[slug]/layout.tsx — Server Component: generateStaticParams (9 fixed slugs), dynamicParams=false, generateMetadata, escaped FAQPage JSON-LD"
  - "src/app/services/[slug]/page.tsx — Client Component: single template rendering the fixed SVC-02 block order for any of the 9 slugs"
  - "src/app/services/[slug]/not-found.tsx — on-brand 404 for unknown slugs"
  - "globals.css .svc-*/.faq-*/.o-num CSS block"
affects: [06-03, 06-04, 06-05, 06-06, 06-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First dynamic route in this repo: Server Component layout.tsx (generateStaticParams/generateMetadata/JSON-LD) + Client Component page.tsx (use(params) + useLanguage()) split, per Next.js 16's async-params requirement"
    - "Native <script type=\"application/ld+json\"> (not next/script) serialized exclusively via buildJsonLdScript — matches current official Next.js JSON-LD guidance"
    - "Native <details>/<summary> FAQ accordion — answer always in DOM, no JS state, per crawlability requirement"

key-files:
  created:
    - src/app/services/[slug]/layout.tsx
    - src/app/services/[slug]/page.tsx
    - src/app/services/[slug]/not-found.tsx
    - .planning/phases/06-service-pages-template-content/deferred-items.md
  modified:
    - src/app/globals.css

key-decisions:
  - "REQUIREMENTS.md SVC-01/SVC-02/SVC-05 checkboxes left unmarked (still Pending) — these requirement IDs are shared across multiple Phase 6 plans (06-01 through 06-06) and are only fully satisfiable once all 9 pages have real content and the 06-07 build gate passes; 06-01 (already merged, same requirement IDs in its own frontmatter) followed the same convention of not marking them complete yet"

patterns-established:
  - "getServiceBySlug(slug) is the single lookup helper both layout.tsx (server) and page.tsx (client) import — no duplicated .find() predicates"
  - "Hardcoded French source (translations.fr) for all server-rendered/crawled content (metadata + JSON-LD) — the i18n system only resolves client-side post-hydration"

requirements-completed: []  # SVC-01/SVC-02/SVC-05 intentionally left unmarked — see key-decisions above; full validation happens at the 06-07 completeness gate

# Metrics
duration: ~35min
completed: 2026-09-20
---

# Phase 6 Plan 02: Service Page Template & Route Summary

**The `/services/[slug]` dynamic route — Server Component layout (static params, per-slug metadata, escaped FAQPage JSON-LD) + Client Component page rendering the fixed 7-block SVC-02 template, plus the supporting `.svc-*`/`.faq-*` CSS.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-20T14:50:17Z
- **Tasks:** 3 (all auto)
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments
- `src/app/globals.css` gained a self-contained phase-6 CSS block (`.svc-hero`, `.svc-h1`, `.svc-sub`, `.svc-answer`, `.svc-sec`, `.svc-h2`, `.svc-body`, `.svc-problems`, `.svc-case`, `.faq-list`/`.faq-item`/`.faq-q`/`.faq-a`, `.svc-crosslink`, `.svc-cta`/`.svc-ctas`, `.o-num`) with no existing rule modified and no new colors/hex values introduced.
- `src/app/services/[slug]/layout.tsx` is the first dynamic-route Server Component in this repo: `generateStaticParams` pre-renders exactly the 9 known slugs, `dynamicParams = false` hard-404s anything else (mitigates T-6-03), `generateMetadata` returns per-slug French `title`/`description`/`canonical`/`openGraph`, and the default export injects an escaped `FAQPage` JSON-LD `<script>` via `buildFaqJsonLd` + `buildJsonLdScript` (mitigates T-6-01) ahead of `{children}`.
- `src/app/services/[slug]/page.tsx` is a Client Component reading the route param via React's `use()` hook and rendering the fixed SVC-02 block order (hero with citable direct-answer block immediately under the H1 → problème → fonctionnement (verbatim `.o-feats` checkmark list, D-03) → enjeux → preuve sociale hybrid (case-study quote or trust-signal grid, D-05/D-06) → optional D-08 cross-link → FAQ (native `<details>`, answer always in DOM) → double CTA footer).
- `src/app/services/[slug]/not-found.tsx` renders an on-brand 404 for any slug outside the fixed 9.

## Task Commits

1. **Task 1: Add the .svc-*/.faq-* class block to globals.css** - `c0bdde5` (feat)
2. **Task 2: Create [slug]/layout.tsx — static params, metadata, JSON-LD** - `04bdf63` (feat)
3. **Task 3: Create [slug]/page.tsx and not-found.tsx** - `daf9787` (feat)

## Files Created/Modified
- `src/app/globals.css` - Appended `.svc-*`/`.faq-*`/`.o-num` block for the service-page template
- `src/app/services/[slug]/layout.tsx` - generateStaticParams, dynamicParams=false, generateMetadata, escaped FAQPage JSON-LD
- `src/app/services/[slug]/page.tsx` - Client Component template rendering all 9 service pages
- `src/app/services/[slug]/not-found.tsx` - On-brand 404 for unknown slugs
- `.planning/phases/06-service-pages-template-content/deferred-items.md` - New: logs pre-existing/out-of-scope lint findings encountered while verifying this plan

## Decisions Made
- Left `translations.fr.services.pages.items[svc.index]` access unguarded (no optional chaining / fallback) per the plan's explicit instruction — the array is still partially empty until 06-03/06-05/06-06 land, so both `layout.tsx` and `page.tsx` will render `undefined` field access for the not-yet-written indices until those plans merge. This is expected: the plan's own `<verification>` section defers the full `npm run build` gate to 06-07 for exactly this reason.
- Did not mark SVC-01/SVC-02/SVC-05 complete in REQUIREMENTS.md (see key-decisions in frontmatter) — these span multiple plans in this phase and 06-01 (already merged) left them unmarked too; deferring to the 06-07 completeness gate avoids a premature/inaccurate "done" claim.

## Deviations from Plan

### Auto-fixed Issues

None — no bugs, missing critical functionality, or blocking issues were found; the plan's action text was followed directly.

### Documentation-only notes (not deviations, no code change)

**1. Task 3's block-order grep acceptance criterion has an inherent substring overlap**
- **Found during:** Task 3 verification
- **Issue:** The acceptance criterion `grep -o "svc-hero\|...\|svc-cta"` expects those tokens in exact source order, but the plan's own required markup places a `<div className="svc-ctas">` (button container, mandated by Task 3's action text and the `.svc-ctas` class defined in Task 1) inside the hero section — before `headings.probleme`. Since `"svc-cta"` is a substring of `"svc-ctas"`, the grep match fires early from the hero's CTA container, not just from the footer's `<section className="svc-cta">`, before the `svc-cta` section itself is reached.
- **Verification performed instead:** Manual inspection of `page.tsx` confirms the actual `<section>` order is exactly: `svc-hero` → problème → fonctionnement → enjeux → preuve sociale → cross-link → FAQ → `svc-cta` (footer), matching SVC-02 precisely. The functional intent of the acceptance criterion (correct block order) is satisfied; the loose grep heuristic has a known false-early-match on `.svc-ctas`, mirroring the same category of grep-heuristic caveat documented in 06-01-SUMMARY.md for its `slug:` count. No code change was made since the class names (`.svc-cta`/`.svc-ctas`) are mandated verbatim by the plan itself.
- **Files affected:** `src/app/services/[slug]/page.tsx` (no change needed)

**2. Pre-existing/repo-wide `npm run lint` failures (unrelated files) plus 4 new instances of an existing pattern**
- **Found during:** Task 1 and Task 3 verification (`npm run lint` acceptance criterion)
- **Issue:** `npm run lint` exits non-zero due to ~18 pre-existing errors in files this plan does not touch (`src/app/demo/feuillette/page.tsx`, `src/components/sections/OffersSection.tsx`, `src/components/sections/ServicesHeroSection.tsx`, `src/components/ui/CinemaIntro.tsx`, `src/context/LanguageContext.tsx`), plus 4 new instances of the already-repo-wide `@next/next/no-html-link-for-pages` rule in the new `[slug]/page.tsx`/`not-found.tsx` files (plain `<a href="/services">`/`<a href="/#contact">`/`<a href="/simulateur">`, mandated verbatim by Task 3's action text to match `calculateur-roi/page.tsx`, `OffersSection.tsx`, `Navbar.tsx`, and `Footer.tsx` — none of which use `next/link` either).
- **Action taken:** Not fixed — logged to `deferred-items.md` per SCOPE BOUNDARY (pre-existing, unrelated-file failures) and per Rule 4 boundary (a repo-wide migration to `next/link` for every internal nav link is an architectural change out of this plan's scope, not a bug this plan introduced).
- **Files affected:** none (documentation only — see `.planning/phases/06-service-pages-template-content/deferred-items.md`)

---

**Total deviations:** 0 auto-fixed. 2 documentation-only notes (grep-heuristic false-positive, pre-existing/repo-wide lint state).
**Impact on plan:** None on functional correctness — `npx tsc --noEmit` exits 0, `npm test` (54/54) passes, and all substantive acceptance criteria (class presence, JSON-LD escaping, static params, block order by manual inspection, no price strings) hold.

## Issues Encountered
- Accidentally used a bare `git stash` while checking pre-existing lint state on `globals.css`; immediately recovered via the sanctioned `git stash apply <exact-sha>` (not `pop`) followed by `git stash drop stash@{0}`, per the environment's stash-safety guidance. No changes were lost; confirmed via `git diff --stat` before dropping.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `src/app/services/[slug]/{layout,page,not-found}.tsx` and the CSS block are ready for plans 06-03/06-05/06-06 to fill `t.services.pages.items[]` with real content, and for 06-04 (index page) to reuse `.o-num`.
- Full `npm run build` intentionally not run in this plan (per plan's own `<verification>` — `t.services.pages.items` is still partial); 06-07 owns that gate.
- No blockers.

## Self-Check: PASSED

All created files verified present on disk; all 3 commit hashes (c0bdde5, 04bdf63, daf9787) verified present in git log.

---
*Phase: 06-service-pages-template-content*
*Completed: 2026-09-20*
