---
phase: 06-service-pages-template-content
plan: 05
subsystem: i18n/content
tags: [i18n, copywriting, seo, aeo, translations]

# Dependency graph
requires:
  - phase: "06-03"
    provides: "t.services.pages.items[0..2] fully populated in fr/en/th (Site Vitrine, Rebranding + Site Premium, Branding), plus the ServicePageContent shape and formatting convention this plan matches exactly"
provides:
  - "t.services.pages.items[3..5] fully populated in fr/en/th — Projet Sur Mesure, Agent Vocal IA, Maintenance"
  - "Agent Vocal IA copy citing the Feuillette case study and stating IA Act-aligned AI disclosure to callers"
  - "Projet Sur Mesure copy citing the Les Folies Temps Danse case study (online enrolment replacing paper forms)"
  - "Maintenance copy re-argued entirely on coverage and reassurance, with zero tier/pack/monthly/price framing"
affects: [06-02, 06-04, 06-06, 06-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content-only plan: no new modules, only ServicePageContent array entries appended by index order (matches 06-03's established pattern)"

key-files:
  created: []
  modified:
    - src/lib/translations.ts

key-decisions:
  - "Kept the proper noun 'Projet Sur Mesure' and 'Agent Vocal IA' identical across fr/en/th (not transliterated), and kept 'Maintenance' as the literal word in Thai too — consistent with 06-03's precedent for 'Site Vitrine', 'Branding', 'Rebranding + Site Premium'"
  - "Kept flagship-offer technical terms (VAPI, Twilio, ElevenLabs, MCP, CRM) in Latin script inside the Thai items[4] entry — consistent with existing precedent in services.phone's Thai block (which already mixes 'MCP', 'Claude Sonnet', 'Twilio' into Thai sentences) and required by the plan's own feature-list wording"
  - "Maintenance's directAnswer was trimmed from an initial ~61-word draft to 46 words to stay inside the 40-60 word directAnswer target while still covering all four coverage areas plus the 'why it matters' clause"

requirements-completed: [SVC-02, SVC-06]

# Metrics
duration: ~25min
completed: 2026-09-20
---

# Phase 6 Plan 05: Projet Sur Mesure, Agent Vocal IA & Maintenance Copy Summary

**Fresh-written fr/en/th page copy for the flagship Agent Vocal IA offer (Feuillette case study, explicit AI-disclosure-to-callers language) and for Projet Sur Mesure (Les Folies Temps Danse case study) and Maintenance (re-argued on coverage and reassurance alone, with zero pricing or tier framing).**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-20
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 1 (src/lib/translations.ts)

## Accomplishments

- `t.services.pages.items` grew from 3 to 6 entries in each of the three locale blocks (fr/en/th) of `src/lib/translations.ts`: **Projet Sur Mesure** (slug `projet-sur-mesure`), **Agent Vocal IA** (slug `agent-vocal-ia`), and **Maintenance** (slug `maintenance`) — completing all 5 pre-existing offers' page content across this plan and 06-03.
- Projet Sur Mesure's `caseQuote` is attributed to Les Folies Temps Danse (école de danse, 2024, `projects[2]`) about online enrolment replacing paper forms — plausible, non-quantified, no revenue/percentage claim.
- Agent Vocal IA's `caseQuote` is attributed to Feuillette (boulangerie, 2025, `projects[0]`) about calls answered during the morning rush — plausible, non-quantified, no call-volume or savings figure.
- Agent Vocal IA's `directAnswer` explicitly states that callers are told upfront they're speaking to an AI (fr: "prévenu dès le début de l'appel"), addressing the IA Act article 50 transparency angle called out in the SEO strategy doc, and the FAQ reinforces this without citing a specific article number as legal advice.
- Maintenance's `caseQuote` is `null` with exactly 3 distinct trust signals per locale (worded differently from items[1]/[2]'s signals), and contains none of "par mois", "/mois", "mensuel", "pack", "formule", "niveau" (or their en/th equivalents) anywhere in its fr/en/th entries — verified by direct grep on each locale's items[5] section in isolation.
- No price, range, tariff, or currency-symbol wording was introduced by this plan in any of the three pages, in any locale (`€|฿|prix|tarifs?|euros?|price|pricing|à partir de` guard stays green; the pre-existing `€` count in the file is unchanged at 6, and the legacy `maintenance.packs` figures `49|79|129` are unchanged at 3 occurrences, confirming this plan added none).
- All fr items pass the advisory 300-500 word target (D-02) with zero `console.warn` output from the word-count test.

## Task Commits

1. **Task 1: items[3] — Projet Sur Mesure (fr/en/th)**
   - `ba1a597` feat(06-05): write Projet Sur Mesure copy (items[3]) in fr/en/th
2. **Task 2: items[4] — Agent Vocal IA (fr/en/th)**
   - `fac5b32` feat(06-05): write Agent Vocal IA copy (items[4]) in fr/en/th
3. **Task 3: items[5] — Maintenance (fr/en/th)**
   - `6259ffb` feat(06-05): write Maintenance copy (items[5]) in fr/en/th

## Files Created/Modified

- `src/lib/translations.ts` — 3 `ServicePageContent` entries appended to `t.services.pages.items` in each of `fr`, `en`, `th`

## Decisions Made

- Followed 06-03's established naming precedent: proper nouns ("Projet Sur Mesure", "Agent Vocal IA", "Maintenance") stay identical across all three locales rather than being transliterated or renamed, matching how "Site Vitrine", "Branding" and "Rebranding + Site Premium" were handled.
- Kept technical brand/protocol names (VAPI, Twilio, ElevenLabs, MCP, CRM) in Latin script within the Thai Agent Vocal IA entry, mirroring the pre-existing `services.phone` Thai block's own mixed-script convention, rather than inventing Thai transliterations that don't exist in the source material.

## Deviations from Plan

None - plan executed exactly as written.

### Non-issues Worth Noting (not deviations, no code change)

- **`grep -c "Les Folies Temps Danse" src/lib/translations.ts` returns 6, not 0.** All 6 occurrences are pre-existing (`landing.work.items`, in all 3 locale blocks, appearing twice each) and predate this plan — the new items[3] content does not name "Les Folies Temps Danse" literally; the case-study attribution resolves from `projects[2].name` at render time via `services[3].caseStudyProjectIndex`. This mirrors the identical false-positive pattern already documented in 06-03-SUMMARY for "Gecko Cabane".
- **`grep -c "Feuillette" src/lib/translations.ts` returns 3, not 0.** All 3 occurrences are pre-existing (`landing.work.items`, one per locale) and predate this plan — the new items[4] content does not name "Feuillette" literally; attribution resolves from `projects[0].name` at render time. Confirmed via `git diff` that this plan's additions introduce zero new occurrences of "Feuillette".
- **`grep -c "990|calculateur"` and `grep -c "49|79|129"` are unchanged from their pre-plan baselines** (4 and 3 respectively) — confirmed via `git diff --unified=0` that none of the three tasks' additions introduce these substrings; the counts come entirely from pre-existing `services.offers.items` and `services.maintenance.packs` content this plan does not touch.

## Issues Encountered

None.

## User Setup Required

None — content-only plan, no external service configuration required.

## Next Phase Readiness

- `t.services.pages.items[0..5]` (all 5 pre-existing offers: Site Vitrine, Rebranding + Site Premium, Branding, Projet Sur Mesure, Agent Vocal IA, Maintenance) are complete and ready for the route template to render.
- Plan 06-06 (or whichever plan writes items[6..8] for the 4 new offers) can append further entries without touching this plan's content again.
- No blockers.

## Self-Check: PASSED

Verified `src/lib/translations.ts` exists on disk with 6 items present per locale (fr/en/th), and all 3 commit hashes (`ba1a597`, `fac5b32`, `6259ffb`) present in `git log`. Full test suite (`npm test`) passes (5 files, 54 tests). `npx tsc --noEmit` exits 0.

---
*Phase: 06-service-pages-template-content*
*Completed: 2026-09-20*
