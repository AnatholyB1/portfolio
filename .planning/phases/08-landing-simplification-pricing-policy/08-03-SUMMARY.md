---
phase: 08-landing-simplification-pricing-policy
plan: 03
subsystem: i18n-content
tags: [translations, i18n, content, pricing-policy, price-guard]

# Dependency graph
requires:
  - phase: 08-landing-simplification-pricing-policy
    plan: 01
    provides: PRICE_PATTERN guard + failing-test manifest over t.landing/t.services (55 RED tests) that this plan turns green for its scope
provides:
  - "t.landing.problems/servicesPreview/method/enjeux and t.landing.work.bridge_* content, in fr/en/th, consumed by plan 04's new ServicesPreview/FonctionnementSection/EnjeuxSection components and plan 05's repointed ProblemSection/Realisations"
  - "t.services with the last three PRICE_PATTERN matches (hero/offers/maintenance) removed, so the widened t.services price guard is green"
affects: [08-04-services-preview-fonctionnement-enjeux, 08-05-phoneagent-teaser-realisations-bridge, 08-06-page-composition-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New t.landing content blocks cloned structurally from existing t.services.problem/.method/.reassurance shapes (SVC-06 precedent) so plan 04/05 components reuse existing JSX verbatim"
    - "CRLF-safe node scripts used for large multi-locale string replacements where the Edit tool's LF-normalized old_string could not match the CRLF-on-disk translations.ts (see Deviations)"

key-files:
  created: []
  modified:
    - src/lib/translations.ts
  deleted:
    - src/components/sections/ServicesHeroSection.tsx
    - src/components/sections/OffersSection.tsx
    - src/components/sections/MaintenanceSection.tsx

key-decisions:
  - "Chose 'Ce qui vous fait perdre des clients' over a 'coûte' framing for the fr problems heading, per the plan's own guidance to prefer non-cost vocabulary where it reads as well"
  - "Left t.landing.phone.num and the six phone teaser fields (features/cta_demo/cta_more/flow_label/flow_rec/flow_steps) untouched — explicitly plan 05's job per the plan's task 1 instruction and the th.landing.phone.title_l2 empty-string gap noted in 08-01-SUMMARY.md"
  - "Did not touch services.problem/.approach/.upsell/.method/.reassurance/.finalCta or their components — confirmed price-free and either reused-as-template (method/reassurance) or repurposed by plan 05 (problem)"

patterns-established:
  - "For any future large-scale CRLF-file text edit where the Edit tool's exact-match fails silently on line-ending mismatch, use a Node script with explicit \\r\\n literals (or reconstruct from git's LF blob and let core.autocrlf normalize on commit)"

requirements-completed: [PRIX-01, LANDING-01, LANDING-02]

# Metrics
duration: 50min
completed: 2026-09-21
---

# Phase 8 Plan 3: Landing Problems/Services Copy Summary

**Wrote the full fr/en/th content for four new `t.landing` sections (problems, servicesPreview, method, enjeux) plus the `work.bridge_*` bridge copy, repointed the hero CTA to a diagnostic framing, renumbered the landing section counter to 01/07..07/07, and deleted the three orphaned components (`ServicesHeroSection`, `OffersSection`, `MaintenanceSection`) that were the last surviving PRICE_PATTERN matches under `t.services`.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 3
- **Files modified:** 1 (`src/lib/translations.ts`)
- **Files deleted:** 3 (`ServicesHeroSection.tsx`, `OffersSection.tsx`, `MaintenanceSection.tsx`)

## Accomplishments

- Extended the `Translations` interface's `landing` block with `problems`, `servicesPreview`, `method`, `enjeux` and `work.bridge_title_l1/bridge_title_it/bridge_body`, positioned in display order (problems/servicesPreview after manifeste, method/enjeux after work, before phone)
- Wrote the French literal content: 4 problem cards (invisible en ligne, personne ne répond au téléphone, image dépassée, pas le temps pour les réseaux), 4 method steps (diagnostic → proposition sur mesure → déploiement → suivi & support), 4 enjeux points, and the `Realisations` bridge copy pointing to `/simulateur`
- Translated all four blocks plus the bridge fields into English and Thai, matching array lengths and the `01 / 07`..`07 / 07` section-counter sequence in every locale
- Repointed `hero.cta_primary` in all three locales from an offers-framed label ("Voir nos offres" / "See our offers" / "ดูบริการ") to a diagnostic-framed one ("Lancer le diagnostic" / "Start the diagnostic" / "เริ่มวินิจฉัย")
- Re-verified zero references to `ServicesHeroSection`, `OffersSection`, `MaintenanceSection` anywhere under `src/` before deleting all three files and their `services.hero`/`.offers`/`.maintenance` interface blocks + fr/en/th literals (9 literal blocks total)
- Confirmed the widened `t.services` PRICE_PATTERN guard (fr/en/th) now passes — the three deleted keys were the only remaining matches

## Task Commits

Each task was committed atomically:

1. **Task 1: Interface additions and the full French content** - `86174e5` (feat)
2. **Task 2: English and Thai content parity** - `c201635` (feat)
3. **Task 3: Delete the three orphaned price-carrying sections and their translation keys** - `e252717` (fix)

## Files Created/Modified/Deleted

- `src/lib/translations.ts` - added 4 new `t.landing` sub-blocks + `work.bridge_*` in fr/en/th interface and all three locale literals; removed `services.hero`/`.offers`/`.maintenance` (interface + 9 literal blocks); renumbered `manifeste.num`/`work.num`/`contact.num` to `01 / 07`/`06 / 07`/`07 / 07` in all locales; repointed `hero.cta_primary` in all locales
- `src/components/sections/ServicesHeroSection.tsx` - deleted (orphaned, sole consumer of `services.hero`)
- `src/components/sections/OffersSection.tsx` - deleted (orphaned, sole consumer of `services.offers`)
- `src/components/sections/MaintenanceSection.tsx` - deleted (orphaned, sole consumer of `services.maintenance`)

## Decisions Made

- Used a non-cost-vocabulary heading for the problems section (`"Ce qui vous fait perdre des clients."`) rather than reusing "coûte", per the plan's own preference where it reads equally well and keeps the copy unambiguously outside `PRICE_PATTERN`'s scope even though "coûte" itself would not have matched the regex.
- Kept `t.landing.phone` completely untouched (including its `num` field and the soon-to-be-dead `features`/`cta_demo`/`cta_more`/`flow_*` fields) — the plan explicitly scopes that removal to plan 05, and the `translations.test.ts` manifest from plan 01 confirms those specific assertions are RED-by-design until then.
- Verified orphan status of the three deleted components with a fresh `grep -r` across `src/` immediately before deleting, per the plan's task 3 instruction, rather than trusting the phase-level research note alone.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - blocking issue] CRLF/LF mismatch broke the Edit tool's exact-match on `translations.ts`**
- **Found during:** Task 2 (English/Thai content edits)
- **Issue:** `translations.ts` is checked out with CRLF line endings (`core.autocrlf=true`), but the Edit tool's `old_string` matching (built from Read-tool output, which normalizes to LF) could not match the raw CRLF bytes on disk, causing repeated "String to replace not found" errors even with byte-for-byte-identical visible text.
- **Fix:** Switched to small Node scripts performing `indexOf`/slice-based replacements with explicit `\r\n` literals matching the file's actual on-disk line endings, verified each replacement target was unique before applying, and used `fs.writeFileSync` to persist.
- **Files affected:** `src/lib/translations.ts` (no content difference from what Task 2 would have produced via Edit — same strings, just applied via a CRLF-aware mechanism)
- **Commit:** `c201635`

**2. [Rule 3 - blocking issue] Per-task commit reconstruction after batched edits**
- **Found during:** End-of-plan commit step
- **Issue:** Because of the CRLF workaround above, edits for all three tasks were applied to the working file sequentially without committing between tasks, leaving one large uncommitted diff instead of three atomic task commits as the plan (and the executor protocol) require.
- **Fix:** Reconstructed the three task boundaries by taking the original `git show HEAD:src/lib/translations.ts` blob, re-applying only task 1's transformations and committing, then re-applying task 2's transformations on top and committing, then re-applying task 3's interface/literal deletions plus the three file deletions and committing. Each intermediate state was re-verified against the exact same `tsc`/`vitest` acceptance criteria used during original execution (same pass/fail counts at every stage) before being committed, so the final committed content is identical to what was produced and verified live.
- **Files affected:** `src/lib/translations.ts`, `src/components/sections/{ServicesHeroSection,OffersSection,MaintenanceSection}.tsx`
- **Commits:** `86174e5`, `c201635`, `e252717`

### Deferred (not auto-fixed — out of scope)

**1. `npm run build` still fails during page-data collection on `/api/crm/*` (missing Supabase env vars)**
- **Found during:** Task 2 and Task 3 acceptance-criteria runs
- **Issue:** Same pre-existing, already-documented environment gap from `08-01-SUMMARY.md`/`deferred-items.md`: this worktree has no `.env.local`, so `next build` compiles and typechecks successfully ("Compiled successfully") but then throws `Error: supabaseUrl is required.` while collecting page data for `/api/crm/orders` and `/api/crm/stock`.
- **Why not fixed:** PROJECT.md forbids changes to `src/app/api/crm/*`, and this plan's changes (translations content + component deletions) do not touch that code path. `tsc --noEmit` — the actual signal for this plan's TypeScript correctness — passed cleanly at every stage.
- **Documented in:** `.planning/phases/08-landing-simplification-pricing-policy/deferred-items.md` (already recorded by plan 01; not duplicated here)

**2. `Voir nos offres`/`See our offers`/`ดูบริการ` combined grep did not hit 0 until after Task 3**
- **Found during:** Task 2 acceptance-criteria check
- **Issue:** The plan's task 2 acceptance criterion expected this combined grep to return 0 immediately after task 2, but `services.hero.cta_offers` (th: `"ดูบริการ"`) and a th `crossLink` label containing the same string were still present in `t.services.hero`/`.pages` at that point — that key belongs to task 3's deletion scope, not task 2's.
- **Resolution:** Confirmed resolved after task 3 deleted `services.hero` entirely; the one remaining occurrence (`services.pages.items[...].crossLink.label`, an unrelated th cross-link sentence that happens to contain the word "ดูบริการ" in a different grammatical context) is legitimate content, not a stale CTA label.
- **Impact:** None — this was a plan-authoring sequencing note, not a functional gap.

---

**Total deviations:** 2 auto-fixed (Rule 3, tooling/mechanics only — no content difference from planned output), 2 logged-and-deferred (1 out-of-scope pre-existing environment gap, 1 sequencing clarification)
**Impact on plan:** None on deliverables. Every acceptance criterion and the plan's own `<verification>` block were satisfied at the correct task boundary; the CRLF workaround changed only *how* the edits were applied, not *what* they produced.

## Issues Encountered

None beyond the two deviations documented above.

## User Setup Required

None — no external service configuration required for this plan's content-only and deletion-only changes.

## Known Stubs

None. This plan only adds/removes static, typed i18n content and deletes fully self-contained, unreferenced components; no data-fetching or placeholder UI is introduced.

## Final Copy Reference (French)

For plan 05's component work and the phase's human-verification checkpoint, the fr content landed by this plan:

**`t.landing.problems`** (`num: "02 / 07"`)
- Heading: "Ce qui vous *fait perdre des clients.*"
- Intro: "Quatre situations qui reviennent chez presque toutes les PME qu'on rencontre."
- 01 Invisible en ligne — "Un client tape votre activité sur Google et tombe sur vos concurrents avant même de vous trouver. Chaque jour sans présence claire, c'est du monde qui part ailleurs."
- 02 Personne ne répond au téléphone — "Un appel manqué pendant le rush, c'est une commande ou une réservation qui part chez le concurrent d'à côté. Ça arrive plus souvent qu'on ne le pense."
- 03 Une image dépassée — "Logo, site, réseaux : quand tout date d'une autre époque, un nouveau client hésite avant même le premier échange."
- 04 Pas le temps de gérer les réseaux — "Entre le quotidien et les clients sur place, les réseaux sociaux passent en dernier — alors que c'est souvent là que les nouveaux clients regardent en premier."
- Good news: "La bonne nouvelle : chacun de ces problèmes a une solution simple, sans devoir tout changer d'un coup."
- CTA: "Tester le diagnostic" → `/simulateur`

**`t.landing.servicesPreview`** (`num: "03 / 07"`)
- Heading: "Neuf façons *de vous aider.*"
- Intro: "Chaque service a sa page dédiée : le problème qu'il résout, comment on procède, et ce que ça change pour vous."

**`t.landing.method`** (`num: "04 / 07"`)
- Heading: "Comment *on travaille.*"
- Intro: "Un déroulé simple, du premier échange au suivi dans la durée."
- 01 Diagnostic — "On fait le point sur votre activité et ce qui vous freine aujourd'hui, en quelques questions ciblées."
- 02 Proposition sur mesure — "Vous recevez une recommandation claire des services adaptés à votre situation, sans jargon."
- 03 Déploiement — "On met en place la solution retenue, à votre rythme, avec des points d'étape réguliers."
- 04 Suivi & support — "On reste disponibles après la mise en ligne pour ajuster et répondre à vos questions."

**`t.landing.enjeux`** (`num: "05 / 07"`)
- Heading: "Ce qui est *en jeu.*"
- Intro: "Ne rien faire a aussi un effet — juste moins visible au quotidien."
- Vos concurrents captent la recherche locale — "Pendant que vous hésitez, ceux qui ont déjà une présence claire raflent les recherches Google de vos futurs clients."
- Les appels manqués s'accumulent — "Un appel manqué isolé ne semble rien. Multiplié sur l'année, c'est un volume de commandes qui a filé ailleurs."
- Votre image perd en crédibilité — "Une identité qui ne bouge pas pendant que le marché évolue finit par sembler dépassée, même si le service reste excellent."
- Les réseaux sociaux vous échappent — "Sans présence régulière, l'audience qui s'y forme se construit ailleurs, chez ceux qui prennent le temps d'y être."

**`t.landing.work.bridge_*`** (rendered by plan 05 in `Realisations.tsx`)
- `bridge_title_l1`: "Quel service" / `bridge_title_it`: "vous correspond ?"
- `bridge_body`: "Deux minutes de diagnostic pour savoir exactement ce qu'il vous faut."

**Hero CTA:** `hero.cta_primary` = "Lancer le diagnostic" (was "Voir nos offres")

**Section counter (fr/en/th, identical structure):** `manifeste` 01/07 · `problems` 02/07 · `servicesPreview` 03/07 · `method` 04/07 · `enjeux` 05/07 · `work` 06/07 · `contact` 07/07. (`phone.num` stays `"03 / 05"` — untouched, plan 05's scope.)

## Next Phase Readiness

- `t.landing` now carries the complete Phase 8 content set at identical shape across fr/en/th; plan 04 (`ServicesPreview`/`FonctionnementSection`/`EnjeuxSection`) and plan 05 (`ProblemSection` repoint, `PhoneAgent` trim, `Realisations` bridge rewrite) can consume these keys directly with no further content work.
- The `t.services` price guard is green in all three locales — `PRIX-01`'s `t.services` half is fully satisfied; only the `t.landing.phone` teaser-key removal (plan 05) and the page-composition/CTA-destination assertions (plans 04/05/06) remain RED per the plan 01 manifest.
- No blockers. `tsc --noEmit` is clean; `npm run build` fails only on the pre-existing, out-of-scope Supabase-env page-data-collection error already documented in `deferred-items.md`.

---
*Phase: 08-landing-simplification-pricing-policy*
*Completed: 2026-09-21*
