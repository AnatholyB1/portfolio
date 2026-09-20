---
phase: 06-service-pages-template-content
plan: 03
subsystem: i18n/content
tags: [i18n, copywriting, seo, aeo, translations]

# Dependency graph
requires:
  - "06-01: ServicePageContent interface + t.services.pages skeleton (items: [])"
provides:
  - "t.services.pages.items[0..2] fully populated in fr/en/th — Site Vitrine, Rebranding + Site Premium, Branding"
  - "SVC-04 Branding/Rebranding+Site Premium scope boundary, locked in copy and citable in both directions"
  - "D-08 reciprocal cross-link between Branding and Rebranding + Site Premium"
affects: [06-02, 06-04, 06-05, 06-06, 06-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content-only plan: no new modules, only ServicePageContent array entries appended by index order"

key-files:
  created: []
  modified:
    - src/lib/translations.ts
    - src/lib/translations.test.ts

key-decisions:
  - "Applied D-07's locked SVC-04 boundary wording verbatim (in each locale's language) inside both items[1] and items[2]'s directAnswer, so the citable block itself resolves the Branding vs Rebranding+Site Premium overlap from both directions"
  - "Kept proper nouns (Site Vitrine, Branding, Rebranding + Site Premium) identical across fr/en/th rather than transliterating, consistent with the interface's own comment (\"name: display name, identical across locales for proper nouns\") and simplifying cross-locale grep verification"
  - "items[0] (Site Vitrine) uses the Gecko Cabane case study via caseQuote + signals: []; items[1] and items[2] use 3 trust signals each + caseQuote: null, per D-05/D-06 hybrid social-proof approach"

requirements-completed: [SVC-02, SVC-04, SVC-06]

# Metrics
duration: ~35min
completed: 2026-09-20
---

# Phase 6 Plan 03: Site Vitrine, Rebranding + Site Premium & Branding Copy Summary

**Fresh-written fr/en/th page copy for the first three /services/[slug] pages, with the SVC-04 Branding/Rebranding+Site Premium scope boundary locked into both pages' citable direct-answer blocks and a reciprocal D-08 cross-link between them.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-20
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 2 (src/lib/translations.ts, src/lib/translations.test.ts)

## Accomplishments

- `t.services.pages.items` grew from 0 to 3 entries in each of the three locale blocks (fr/en/th) of `src/lib/translations.ts`: **Site Vitrine** (slug `site-vitrine`), **Rebranding + Site Premium** (slug `rebranding-site-premium`), and **Branding** (slug `branding`).
- The locked SVC-04 boundary sentence — Branding stops at identity, Rebranding + Site Premium includes the site rebuild — appears inside the citable `directAnswer` of both items[1] and items[2], in each locale's own language, so a search engine or LLM answer surfacing either page alone still resolves the overlap correctly.
- Branding and Rebranding + Site Premium reciprocally cross-link via `crossLink.slug` (D-08), letting a prospect self-select the correct offer from either page.
- Site Vitrine uses the Gecko Cabane case study (`caseQuote`, non-null, `signals: []`); Rebranding + Site Premium and Branding each use 3 distinct trust signals (`caseQuote: null`) per the D-05/D-06 hybrid social-proof approach — no case study is forced onto an unrelated offer.
- No price, range, or tariff wording was introduced in any of the three pages, in any locale (`€|฿|prix|tarifs?|euros?|price|pricing|à partir de` guard stays green; the pre-existing pre-plan `€|à partir de|tarif` count in the file is unchanged at 6, confirming this plan added none).
- All fr items land within the D-02 target of 300-500 words (item0 ≈ 380, item1 ≈ 393, item2 ≈ 382), with no advisory warnings from the word-count test.

## Task Commits

1. **Task 1: items[0] — Site Vitrine (fr/en/th)**
   - `d84fa3a` feat(06-03): write Site Vitrine copy (items[0]) in fr/en/th
2. **Task 2: items[1] — Rebranding + Site Premium (fr/en/th)**
   - `a03575f` feat(06-03): write Rebranding + Site Premium copy (items[1]) in fr/en/th
3. **Task 3: items[2] — Branding (fr/en/th)**
   - `abbc872` feat(06-03): write Branding copy (items[2]) in fr/en/th

## Files Created/Modified

- `src/lib/translations.ts` — 3 `ServicePageContent` entries appended to `t.services.pages.items` in each of `fr`, `en`, `th`
- `src/lib/translations.test.ts` — one assertion fixed (see Deviations below)

## Decisions Made

- Followed D-07's exact boundary wording for both pages' `directAnswer` blocks, translated into each locale's own language rather than left in French — this keeps every locale independently citable/AEO-friendly.
- Kept the four proper nouns ("Site Vitrine", "Rebranding + Site Premium", "Branding", and cross-link target names) identical across fr/en/th rather than transliterating into Thai script, per the interface's own documented convention for proper nouns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed an incorrect unconditional assertion in `translations.test.ts`**
- **Found during:** Task 1, first verification run
- **Issue:** The locale-parity test (shipped by 06-01) asserted `expect(item.signals.length).toBeGreaterThan(0)` for every item unconditionally. This directly contradicts the `ServicePageContent` interface's own documented contract one line above it in `translations.ts`: `signals: { t: string; d: string }[]; // 3 trust signals when caseQuote is null, otherwise []`. Since Task 1 (Site Vitrine) correctly uses `caseQuote` + `signals: []` per the plan and D-05/D-06, the unconditional assertion failed against otherwise-correct content.
- **Fix:** Changed the assertion to be conditional on `item.caseQuote === null` — when a case study is used, `signals` must be `[]`; otherwise it must be non-empty. This matches the interface's own stated contract exactly.
- **Files modified:** `src/lib/translations.test.ts`
- **Commit:** `d84fa3a`

### Non-issues Worth Noting (not deviations, no code change)

- **`grep -c "Gecko Cabane" src/lib/translations.ts` returns 6, not 0.** All 6 occurrences are pre-existing (`landing.work.items` and `landing.partners.items`, in all 3 locale blocks) and predate this plan — none of the Task 1 content added for `items[0]` mentions "Gecko Cabane" by name; the functional intent (case study name resolved from `projects.ts` at render time, not hardcoded in the page copy) is fully satisfied. This mirrors a similar grep-heuristic false-positive documented in `06-01-SUMMARY.md`.

## Issues Encountered

None beyond the test-assertion bug documented above.

## User Setup Required

None — content-only plan, no external service configuration required.

## Next Phase Readiness

- `t.services.pages.items[0..2]` (Site Vitrine, Rebranding + Site Premium, Branding) are complete and ready for plan 06-02's route template/index page to render.
- Plans 06-05 and 06-06 can append `items[3..5]` and `items[6..8]` respectively without touching this plan's content again.
- No blockers.

## Self-Check: PASSED

Verified file exists on disk (`src/lib/translations.ts`) with all 3 items present per locale, and all 3 commit hashes (`d84fa3a`, `a03575f`, `abbc872`) present in `git log`. Full test suite (`npm test`) passes (5 files, 54 tests). `npx tsc --noEmit` exits 0.

---
*Phase: 06-service-pages-template-content*
*Completed: 2026-09-20*
