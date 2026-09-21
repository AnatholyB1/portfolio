---
phase: 08-landing-simplification-pricing-policy
plan: 05
subsystem: ui
tags: [landing, i18n, cta-routing, translations, pricing-policy]

# Dependency graph
requires:
  - phase: 08-landing-simplification-pricing-policy
    plan: 03
    provides: "t.landing.problems + t.landing.work.bridge_* content in fr/en/th, and the interface shapes this plan's components consume"
provides:
  - "HeroSection primary CTA repointed to /simulateur"
  - "ProblemSection reactivated on t.landing.problems with a single bottom CTA to /simulateur (D-06)"
  - "Realisations bridge block rewritten, i18n-routed via t.landing.work.bridge_*, pointing to /simulateur (D-10)"
  - "PhoneAgent trimmed to a single-CTA teaser (D-07/D-08), all dead t.landing.phone fields removed from interface + fr/en/th"
affects: [08-06-page-composition-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CRLF-safe node line-splice scripts used for translations.ts locale-block edits where the Edit tool's LF-normalized old_string could not match the CRLF-on-disk file (same workaround pattern as plan 03)"

key-files:
  created: []
  modified:
    - src/components/sections/HeroSection.tsx
    - src/components/sections/ProblemSection.tsx
    - src/components/sections/Realisations.tsx
    - src/components/sections/PhoneAgent.tsx
    - src/lib/translations.ts

key-decisions:
  - "Kept the '—— PROCHAINE ÉTAPE' bridge label hardcoded French, per the plan's explicit scope note (D-10 covers heading/body only)"
  - "Fixed the pre-existing empty th.landing.phone.title_l2 (flagged in 08-01-SUMMARY.md as this plan's job) with non-empty Thai copy ('เรา') so the teaser heading reads coherently in all three locales"
  - "PhoneAgentExplainer.tsx left untouched — explicitly out of this plan's scope per its own action block, despite still containing /demo and /calculateur-roi hrefs"

patterns-established: []

requirements-completed: [LANDING-02, LANDING-03, PRIX-01]

# Metrics
duration: ~25min
completed: 2026-09-21
---

# Phase 8 Plan 5: PhoneAgent Teaser & Realisations Bridge Summary

**Repointed the hero and problem-section CTAs to `/simulateur`, rewrote the case-study bridge's hardcoded price-era French copy into i18n-routed diagnostic copy, and reduced `PhoneAgent.tsx` to a single-CTA teaser — deleting the scroll-driven `PhoneFlow` SVG and seven dead `t.landing.phone` translation fields across fr/en/th.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- `HeroSection.tsx` primary CTA now targets `/simulateur` (was `/services`); secondary `#contact` CTA untouched
- `ProblemSection.tsx` reads `t.landing.problems` instead of the orphaned `t.services.problem`, gained `id="problems"`, and a single bottom CTA to `/simulateur` (D-06 — no per-card links)
- `Realisations.tsx`'s bridge block now renders `t.landing.work.bridge_title_l1/bridge_title_it/bridge_body` and points at `/simulateur`, replacing the hardcoded "offres & tarifs" / "Quatre formules, des prix publics" French copy (D-10)
- `PhoneAgent.tsx` rewritten hook-free (no `useState`/`useEffect`/`useRef`/`useCallback`): the `PhoneFlow` sub-component, its scroll listener, the feature list, and the `/demo` + `/services#phone-agent` CTAs are gone; the section is now a centered 640px teaser with one CTA to `/services/agent-vocal-ia` (D-07/D-08), down from 159 to 24 lines
- Removed `num`, `features`, `cta_demo`, `cta_more`, `flow_label`, `flow_rec`, `flow_steps` from `t.landing.phone` in the `Translations` interface and all three locale literals; `cta_roi` repurposed as the sole teaser CTA label
- Closed the pre-existing `th.landing.phone.title_l2` empty-string gap (documented in 08-01-SUMMARY.md) with non-empty Thai copy

## Task Commits

Each task was committed atomically:

1. **Task 1: Hero CTA repoint and the repurposed problem section** - `b87d331` (feat)
2. **Task 2: Case-study bridge rewrite, i18n-routed** - `e2e3f0c` (feat)
3. **Task 3: PhoneAgent teaser reduction and dead translation-field removal** - `af25094` (feat)

## Files Created/Modified

- `src/components/sections/HeroSection.tsx` - primary CTA `href` changed from `/services` to `/simulateur`
- `src/components/sections/ProblemSection.tsx` - content source swapped to `t.landing.problems`, added `id="problems"` and a bottom CTA to `/simulateur`
- `src/components/sections/Realisations.tsx` - bridge block href + copy now i18n-routed via `t.landing.work.bridge_*`, targets `/simulateur`
- `src/components/sections/PhoneAgent.tsx` - reduced to a single-column, hook-free teaser (badge, heading, sub, one CTA)
- `src/lib/translations.ts` - `landing.phone` interface and fr/en/th literals trimmed to `badge`/`title_l1`/`title_l2`/`title_l3_it`/`sub`/`cta_roi`; `cta_roi` relabeled to an agent-vocal framing in all three locales; `th.landing.phone.title_l2` populated (was empty)

## Decisions Made

- Kept the case-study bridge's "—— PROCHAINE ÉTAPE" label hardcoded French — explicitly out of D-10's scope (heading/body only), recorded here per the plan's instruction rather than left as an oversight.
- Populated the pre-existing empty `th.landing.phone.title_l2` field (`'เรา'`) while already editing that locale block, per the gap plan 01/03 flagged as plan 05's responsibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CRLF/LF mismatch broke the Edit tool's exact-match on `translations.ts`**
- **Found during:** Task 3 (English and Thai `landing.phone` literal edits)
- **Issue:** `translations.ts` is checked out with CRLF line endings, but the Edit tool's `old_string` matching (built from Read-tool output, which normalizes to LF) could not match the raw CRLF bytes on disk for the en/th `phone` blocks, producing "String to replace not found" even though the visible text was identical. The French block and the interface block happened to match via the Edit tool without issue.
- **Fix:** Used small Node scripts that split the file on `\r\n`, located the exact line range for each locale's `phone` block by content, spliced in the trimmed replacement lines, and rejoined with `\r\n` before writing back — same workaround pattern plan 03 documented for this file.
- **Files affected:** `src/lib/translations.ts` (no content difference from what Task 3 would have produced via Edit — same strings, applied via a CRLF-aware mechanism)
- **Verification:** `npx tsc --noEmit` clean; `npx vitest run src/lib/translations.test.ts` 57/57 passing after the change
- **Committed in:** `af25094` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3, tooling/mechanics only — no content difference from planned output)
**Impact on plan:** None on deliverables. Every acceptance criterion and the plan's own `<verification>` block were satisfied; the CRLF workaround changed only *how* the edit was applied, not *what* it produced.

## Issues Encountered

None beyond the CRLF deviation documented above.

## User Setup Required

None - no external service configuration required for this plan's component and content-only changes.

## Known Stubs

None. No new data-fetching or placeholder UI introduced; all edits repoint existing static content or trim dead fields.

## Verification Results

- `npx vitest run src/lib/translations.test.ts` — 57/57 passing (full i18n contract green, including the `t.landing.phone` key-removal and surviving-key assertions that were RED-by-design until this plan).
- `npx vitest run src/app/page.test.ts -t "landing CTA destinations"` — 19 passed, 6 skipped (skips belong to plan 04's `ServicesPreview`/`FonctionnementSection`/`EnjeuxSection`, not yet built); zero violations originate from `HeroSection.tsx`, `ProblemSection.tsx`, `Realisations.tsx` or `PhoneAgent.tsx`.
- `npx vitest run src/app/page.test.ts` (full file) — the only 5 remaining failures are the `landing composition (LANDING-01)` page.tsx-ordering assertions and the `ServicesPreview cards` assertions, both explicitly out of this plan's scope per its own `<verification>` block (plan 06 and plan 04 respectively).
- `npx tsc --noEmit` — clean, no errors.
- `npm run build` — compiles successfully ("Compiled successfully"); fails only during page-data collection on `/api/crm/*` due to the pre-existing, already-documented missing-Supabase-env-var gap (this worktree has no `.env.local`), unrelated to this plan's changes. Same gap documented in `08-01-SUMMARY.md`/`08-03-SUMMARY.md`/`deferred-items.md`.
- `grep -rn "href=\"/services\"\|/services#phone-agent\|href=\"/demo\"\|href=\"/calculateur-roi\"" src/components/sections/` — clean except `PhoneAgentExplainer.tsx`, which the plan explicitly excludes from scope.
- Case studies confirmed still rendering: Feuillette, Gecko Cabane, Les Folies Temps Danse present in `src/data/projects.ts`, `Realisations.tsx`'s `work-list`/`projects.map(` loop untouched.

## Final `cta_roi` Copy Reference (all three locales)

- fr: "Découvrir l'agent vocal IA"
- en: "Discover the AI voice agent"
- th: "ค้นพบ AI voice agent"

## Next Phase Readiness

- `t.landing.phone` is now fully trimmed and consistent across fr/en/th; `PhoneAgent.tsx` has no orphaned field references.
- All four reworked components' CTAs resolve to `/simulateur`, `#contact` or the locked `/services/agent-vocal-ia` exception — LANDING-02 fully satisfied for this plan's scope.
- Plan 06 (page-composition verification) can now assert against a landing where every existing section CTA is compliant; only the new `ServicesPreview`/`FonctionnementSection`/`EnjeuxSection` sections (plan 04) remain to slot into `page.tsx`.
- No blockers. The pre-existing Supabase-env build gap remains out of scope, as documented in prior plan summaries.

---
*Phase: 08-landing-simplification-pricing-policy*
*Completed: 2026-09-21*
