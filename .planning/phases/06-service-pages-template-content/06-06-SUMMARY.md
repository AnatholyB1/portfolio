---
phase: 06-service-pages-template-content
plan: 06
subsystem: i18n/content
tags: [i18n, copywriting, seo, aeo, translations]

# Dependency graph
requires:
  - phase: "06-05"
    provides: "t.services.pages.items[0..5] fully populated in fr/en/th (all 5 pre-existing offers), plus the ServicePageContent shape and formatting convention this plan matches exactly"
provides:
  - "t.services.pages.items[6..8] fully populated in fr/en/th — Community Management, Meta Ads, Google Ads — completing all 9 services in every locale"
  - "Meta Ads and Google Ads FAQ answers stating the ad-spend/click-billing mechanism (client's own ad account, billed directly by the platform) with zero figures, minimums or percentages"
  - "9 mutually distinct trust-signal titles across the 3 new pages, none colliding with the 8 pre-existing signal titles from items[1], items[2] and items[5]"
affects: [06-02, 06-04, 06-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content-only plan: no new modules, only ServicePageContent array entries appended by index order (matches 06-03/06-05's established pattern)"

key-files:
  created: []
  modified:
    - src/lib/translations.ts

key-decisions:
  - "Renamed the plan's suggested Google Ads signal 'aucun engagement de durée' to 'Aucune durée imposée' to avoid an exact-string collision with Maintenance's (items[5]) pre-existing 'Sans engagement de durée' signal, satisfying the plan's distinctness requirement"
  - "Renamed the plan's suggested Community Management signal 'vous gardez la propriété de vos comptes' to 'Comptes à votre nom' to avoid near-duplication with Maintenance's 'Vous restez propriétaire' signal"
  - "Meta Ads' directAnswer initially referenced 'chaque euro dépensé' during drafting; reworded to remove the word 'euro' entirely since it matches the SVC-02 no-price regex guard (\\beuros?\\b) even in a non-pricing sentence"
  - "Kept 'Community Management', 'Meta Ads' and 'Google Ads' identical (untranslated) across fr/en/th, consistent with 06-03/06-05's precedent for proper nouns and platform names"

requirements-completed: [SVC-02, SVC-06]

# Metrics
duration: ~20min
completed: 2026-09-20
---

# Phase 6 Plan 06: Community Management, Meta Ads & Google Ads Copy Summary

**Fresh-written fr/en/th page copy for the three trust-signal-only new offers — Community Management, Meta Ads and Google Ads — completing all 9 services in `t.services.pages.items` across all three locales.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-20
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 1 (src/lib/translations.ts)

## Accomplishments

- `t.services.pages.items` grew from 6 to 9 entries in each of the three locale blocks (fr/en/th) of `src/lib/translations.ts`: **Community Management** (slug `community-management`), **Meta Ads** (slug `meta-ads`), and **Google Ads** (slug `google-ads`) — completing all 9 offers across this plan and 06-03/06-05.
- All three new entries carry `caseQuote: null` with exactly 3 trust signals per locale (D-05/D-06 hybrid social proof, no borrowed case study), since none of the 4 brand-new offers has shipped client work behind it.
- Meta Ads' and Google Ads' FAQ arrays each answer "who pays the ad spend/clicks, and to whom" by describing the mechanism only — the client's own ad account (Meta or Google Ads) is billed directly by the platform, with the agency billing nothing on top — never stating, implying or bracketing any figure, minimum or percentage (T-6-07 mitigation).
- Google Ads' `directAnswer` explicitly distinguishes paid search (immediate visibility, cost-per-click) from local SEO (slower to build, durable, no per-click cost) and frames the two as complementary rather than competing, per the plan's requirement.
- All 9 new trust-signal titles across the 3 pages are mutually distinct, and none collides with any of the 8 pre-existing signal titles from items[1] (Rebranding + Site Premium), items[2] (Branding) or items[5] (Maintenance) — verified programmatically across all three locale blocks.
- No price, range, tariff, currency symbol, percent sign, or digit-adjacent-to-currency-symbol wording was introduced by this plan in any of the three pages, in any locale. The pre-existing `€` count in the file is unchanged at 6 (confirmed against the pre-plan baseline commit `63bb222`).
- `name` field order in `t.services.pages.items` is identical across fr/en/th and matches `src/data/services.ts` index order exactly: Site Vitrine, Rebranding + Site Premium, Branding, Projet Sur Mesure, Agent Vocal IA, Maintenance, Community Management, Meta Ads, Google Ads.

## Task Commits

1. **Task 1: items[6] — Community Management (fr/en/th)**
   - `12a482c` feat(06-06): write Community Management copy (items[6]) in fr/en/th
2. **Task 2: items[7] — Meta Ads (fr/en/th)**
   - `ef421b9` feat(06-06): write Meta Ads copy (items[7]) in fr/en/th
3. **Task 3: items[8] — Google Ads (fr/en/th)**
   - `82bfe37` feat(06-06): write Google Ads copy (items[8]) in fr/en/th

## Files Created/Modified

- `src/lib/translations.ts` — 3 `ServicePageContent` entries appended to `t.services.pages.items` in each of `fr`, `en`, `th`

## Decisions Made

- Followed 06-03/06-05's established naming precedent: platform/product proper nouns ("Community Management", "Meta Ads", "Google Ads", "Facebook", "Instagram") stay identical across all three locales rather than being transliterated.
- Deviated slightly from the plan's exact suggested signal wording twice (Community Management and Google Ads) specifically to satisfy the plan's own hard requirement that no two services share a signal title — see key-decisions above for the two renames.
- Removed a planned reference to "chaque euro dépensé" in Meta Ads' `directAnswer` during drafting since it would have tripped the SVC-02 no-price regex guard despite not being a pricing statement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reworded near-duplicate trust-signal titles before they were ever committed**
- **Found during:** Drafting (before Task 1 and Task 3 commits)
- **Issue:** The plan's own suggested signal wording for Community Management ("vous gardez la propriété de vos comptes") and Google Ads ("aucun engagement de durée") would have collided or nearly collided with pre-existing signal titles ("Vous restez propriétaire" in items[5], "Sans engagement de durée" in items[5]), violating the plan's own success criterion "No two services share the same trust-signal titles."
- **Fix:** Reworded to "Comptes à votre nom" (Community Management) and "Aucune durée imposée" (Google Ads) — same meaning, distinct exact strings, verified via a full cross-locale duplicate scan before committing.
- **Files modified:** `src/lib/translations.ts` (drafted correctly before commit, so no follow-up commit was needed).
- **Commit:** Included directly in `12a482c` and `82bfe37`.

**2. [Rule 1 - Bug] Removed "euro" wording from Meta Ads' directAnswer draft**
- **Found during:** Task 2 drafting
- **Issue:** An early draft of Meta Ads' `directAnswer` used the phrase "chaque euro dépensé" to describe ad-spend efficiency — not a pricing claim, but the word "euro" matches the SVC-02 no-price regex guard (`\beuros?\b`) verbatim, which would have failed the automated price-language test.
- **Fix:** Reworded the sentence to remove "euro" entirely while preserving the intended meaning (campaigns reaching real potential customers rather than people outside the area).
- **Files modified:** `src/lib/translations.ts` (drafted correctly before commit, so no follow-up commit was needed).
- **Commit:** Included directly in `ef421b9`.

## Issues Encountered

None.

## User Setup Required

None — content-only plan, no external service configuration required.

## Next Phase Readiness

- `t.services.pages.items[0..8]` — all 9 services (5 pre-existing + 4 new, with Branding covered in 06-03) — are complete and ready for the `/services/[slug]` route template (06-01/06-02) to render.
- This closes the content-writing side of Phase 6 (SVC-02, SVC-06 requirements complete for all 9 pages). Plan 06-07 can proceed without further dependency on this plan's content.
- No blockers.

## Self-Check: PASSED

Verified `src/lib/translations.ts` exists on disk with 9 items present per locale (fr/en/th) in the correct `services.ts`-matching order, and all 3 commit hashes (`12a482c`, `ef421b9`, `82bfe37`) present in `git log`. Full test suite (`npm test`) passes (5 files, 60 tests). `npx tsc --noEmit` exits 0. Cross-locale trust-signal duplicate scan confirms the only duplicate ("Sans engagement" between items[1]/items[2]) predates this plan (introduced in 06-03); all 9 signals added by this plan are mutually distinct and distinct from every pre-existing signal.

---
*Phase: 06-service-pages-template-content*
*Completed: 2026-09-20*
