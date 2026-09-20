---
phase: 07-diagnostic-simulator
plan: 03
subsystem: i18n
tags: [translations, i18n, rgpd, content, vitest]

# Dependency graph
requires:
  - phase: 07-diagnostic-simulator
    provides: "07-01's src/lib/simulateur/questions.ts (QUESTIONS spine — question ids and option values this plan's content joins against)"
provides:
  - "SimulateurContent interface exported from src/lib/translations.ts"
  - "t.simulateur content block for fr, en and th (pillar intro, 5 questions/options, RGPD contact block, result framing, 4-item FAQ)"
  - "Automated guard tests: SIMU-06 price/tariff/free guard, bidirectional question/option key-join, locale parity, Art. 13 completeness"
affects: [07-04, 07-05, 07-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Recursive collectStringLeaves() helper walks a content subtree and asserts every string leaf is non-empty — reusable for future locale-gated content blocks"
    - "SIMU_PRICE_PATTERN mirrors and extends SVC-02's PRICE_PATTERN rather than modifying it, so existing gates stay scoped to their original content"

key-files:
  created: []
  modified:
    - src/lib/translations.ts
    - src/lib/translations.test.ts

key-decisions:
  - "Quoted all 5 question-id object keys ('secteur', 'frictions', 'priorite') even though 3 are valid unquoted JS identifiers, for lexical consistency with the 2 hyphenated ids and to satisfy the plan's grep-based acceptance check"
  - "Kept the French phone placeholder format (06 00 00 00 00) in en and th contact forms — the business only operates in France, so the placeholder format doesn't need per-locale localization"

requirements-completed: [SIMU-05, SIMU-06, SIMU-08]

duration: ~20min
completed: 2026-09-20
---

# Phase 7 Plan 03: Simulator i18n Content Summary

**Full fr/en/th `SimulateurContent` block (pillar intro, 5-question wizard copy, RGPD Art. 13 consent, result framing, FAQ) plus automated content guards for price language, question/option key-join, locale parity, and Art. 13 completeness.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-20T21:29:12Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- `SimulateurContent` interface added to `src/lib/translations.ts`, joined to `Translations` as `simulateur: SimulateurContent`
- Complete fr, en and th `simulateur` blocks — identical structure, identical question/option keys, zero price/tariff/currency/free-of-charge language in any locale
- 5-row RGPD Art. 13 disclosure block (controller, purpose, legal basis, 12-month retention, rights + CNIL) present verbatim in every locale
- 4-item FAQ in the `{ q, a }` shape `buildFaqJsonLd` already consumes, ready for plan 07-06's JSON-LD emission
- 8 new vitest assertions in `translations.test.ts` gating all of the above; `npm run test` now passes 150/150 (up from 17 before this plan touched the file, and up from the pre-Task-3 count for this file specifically)

## Task Commits

Each task was committed atomically:

1. **Task 1: SimulateurContent interface and the full French content block** - `ed66061` (feat)
2. **Task 2: English and Thai simulateur content blocks** - `7c51b4d` (feat)
3. **Task 3: Content guard tests — price, parity, key-join and Art. 13 completeness** - `3269fcc` (test)

_Note: Task 3 is `tdd="true"` but its tests were written against content already shipped in Tasks 1-2 within the same plan (there is no separate implementation step) — so there is no RED-phase failing-test commit. All 8 new assertions passed on first run; the guard's bite was verified by temporarily injecting the word "prix" into `fr.simulateur.badge`, confirming `npm run test` failed, then reverting before committing (see Issues Encountered)._

## Files Created/Modified
- `src/lib/translations.ts` - Added `SimulateurContent` interface (after `ServicePageContent`), `simulateur: SimulateurContent` member on `Translations` (after `services`), and three `simulateur: { ... }` content blocks (fr/en/th, each inserted after that locale's `services` key and before `landing`)
- `src/lib/translations.test.ts` - Added `SIMU_PRICE_PATTERN` constant, `collectStringLeaves()` helper, and a new `describe('translations.simulateur (SIMU-05, SIMU-06, SIMU-08)')` block with 8 `it` cases

## t.simulateur Key Path Map

For plans 07-05 (wizard UI) and 07-06 (pillar page/layout) — reference this instead of re-reading the 2100+-line `translations.ts`:

```
t.simulateur.metaTitle                          string
t.simulateur.metaDescription                    string
t.simulateur.badge                              string
t.simulateur.h1Lead                             string
t.simulateur.h1Benefit                          string
t.simulateur.sub                                string
t.simulateur.directAnswer                       string
t.simulateur.intro.heading                      string
t.simulateur.intro.paragraphs                   string[3]
t.simulateur.start                              string   // "Commencer mon diagnostic →"
t.simulateur.progressLabel                      string   // contains literal "{current}" and "{total}"
t.simulateur.next                               string   // "Suivant →"
t.simulateur.nextFinal                          string   // "Voir ma recommandation →"
t.simulateur.back                               string   // "← Précédent"

t.simulateur.questions[questionId].text         string
t.simulateur.questions[questionId].hint         string
t.simulateur.questions[questionId].options[optionValue]  string

  // questionId / optionValue are the exact id/value strings from
  // src/lib/simulateur/questions.ts QUESTIONS (07-01). Question ids:
  // 'secteur' | 'presence-en-ligne' | 'site-fiabilite' | 'frictions' | 'priorite'
  // Option values are listed per-question in questions.ts and in 07-03-PLAN.md Task 1.

t.simulateur.contact.heading                    string
t.simulateur.contact.sub                        string
t.simulateur.contact.nomLabel / nomPlaceholder   string
t.simulateur.contact.emailLabel / emailPlaceholder  string
t.simulateur.contact.telephoneLabel / telephonePlaceholder  string
t.simulateur.contact.consentLabel               string   // RGPD checkbox label, verbatim from UI-SPEC
t.simulateur.contact.rgpdHeading                string
t.simulateur.contact.rgpdMentions               { k: string; v: string }[5]  // Responsable/Finalité/Base légale/Conservation/Vos droits (fr keys — translated per locale)
t.simulateur.contact.submit                     string   // "Obtenir mon diagnostic →"
t.simulateur.contact.submitting                 string
t.simulateur.contact.errorHeading               string   // "Une erreur est survenue"
t.simulateur.contact.errorBody                  string

t.simulateur.result.heading                     string
t.simulateur.result.gaugeCaption                string
t.simulateur.result.framing.{low,mid,high}      string   // 3 score-band framing sentences
t.simulateur.result.servicesHeading             string
t.simulateur.result.ctaHeading                  string
t.simulateur.result.ctaSub                      string
t.simulateur.result.callLabel / writeLabel      string

t.simulateur.faq                                { q: string; a: string }[4]  // feeds buildFaqJsonLd(t.simulateur.faq, pageUrl) unchanged
```

All of the above is identical in shape (array lengths, question/option keys) across `fr`, `en` and `th` — only leaf string values differ. `t.simulateur.faq` is typed `{ q: string; a: string }[]`, byte-identical to `FaqItem` in `src/lib/serviceJsonLd.ts`.

## Decisions Made
- Quoted all 5 question-id keys in the `questions` record (not just the 2 hyphenated ones) for visual consistency and because the plan's acceptance check greps for the quoted form
- Kept the French-format phone placeholder (`06 00 00 00 00`) identical across en/th contact forms — the business is France-only, so translating the placeholder digits would be misleading rather than helpful

## Deviations from Plan

None - plan executed exactly as written. The quoting of `secteur`/`frictions`/`priorite` object keys (mentioned above) is a cosmetic formatting choice within Task 1's own acceptance criteria, not a deviation from the plan's content or structure.

## Issues Encountered
- Task 1's acceptance criterion `grep -c "'secteur'\|'presence-en-ligne'\|'site-fiabilite'\|'frictions'\|'priorite'" src/lib/translations.ts` initially returned 2 instead of the required "at least 5", because `secteur`, `frictions` and `priorite` are valid unquoted JS object-key identifiers and were written without quotes. Fixed by quoting all five keys (Rule 1 — the acceptance criterion is a correctness check on the file's content, and the implementation didn't yet satisfy it as literally specified).
- Verified the Task 3 SIMU-06 guard actually fails on violation per its acceptance criteria: temporarily changed `fr.simulateur.badge` to include the word "prix", ran `npm run test` (1 test failed as expected), then reverted the change before staging/committing. `git diff` confirmed zero residual change to `translations.ts` after the revert.

## Next Phase Readiness
- All `t.simulateur` copy needed by plan 07-05 (wizard UI) and 07-06 (pillar page + FAQ JSON-LD) now exists and is content-gated by automated tests
- `npx tsc --noEmit` exits 0; `npm run test` exits 0 with 150/150 passing
- No blockers for downstream plans in this phase

---
*Phase: 07-diagnostic-simulator*
*Completed: 2026-09-20*

## Self-Check: PASSED

- FOUND: src/lib/translations.ts
- FOUND: src/lib/translations.test.ts
- FOUND: .planning/phases/07-diagnostic-simulator/07-03-SUMMARY.md
- FOUND: ed66061 (Task 1 commit)
- FOUND: 7c51b4d (Task 2 commit)
- FOUND: 3269fcc (Task 3 commit)
