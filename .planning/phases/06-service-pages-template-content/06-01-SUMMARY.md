---
phase: 06-service-pages-template-content
plan: 01
subsystem: data/i18n
tags: [typescript, vitest, i18n, jsonld, schema.org, data-model]

# Dependency graph
requires: []
provides:
  - "src/data/services.ts — locale-agnostic 9-service table + getServiceBySlug lookup"
  - "src/lib/serviceJsonLd.ts — buildFaqJsonLd + buildJsonLdScript (escaped JSON-LD serialization)"
  - "src/lib/translations.ts — ServicePageContent interface + t.services.pages skeleton (fr/en/th, items: [])"
  - "Three vitest gates: services.test.ts (SVC-01), serviceJsonLd.test.ts (SVC-05), translations.test.ts (SVC-02 + locale parity)"
affects: [06-02, 06-03, 06-04, 06-05, 06-06, 06-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "index-keyed join between src/data/*.ts and t.*.items[index] (mirrors existing projects.ts <-> t.landing.work.items pattern)"
    - "single escaping choke point for dangerouslySetInnerHTML JSON-LD (buildJsonLdScript), not repeated per-page JSON.stringify"
    - "pure, framework-free lib modules (no next/react/@supabase imports) so both Server Components and Client Components can import them"

key-files:
  created:
    - src/data/services.ts
    - src/data/services.test.ts
    - src/lib/serviceJsonLd.ts
    - src/lib/serviceJsonLd.test.ts
    - src/lib/translations.test.ts
  modified:
    - src/lib/translations.ts

key-decisions:
  - "Followed D-04 exactly: only 'Landing Page' realigned to site-vitrine slug; the other 4 existing offers keep their names/slugs unchanged"
  - "caseStudyProjectIndex reuse limited to projects indices 0/1/2 (Feuillette/Gecko Cabane/Les Folies Temps Danse) per D-05/D-06 — enforced by a vitest assertion, not just a comment"
  - "buildJsonLdScript is the ONLY serialization path introduced for the 9 new pages, deliberately not fixing the pre-existing unescaped JSON.stringify in src/app/layout.tsx (out of this plan's file scope, threat register T-6-01 explicitly scopes mitigation to the new module)"

patterns-established:
  - "getServiceBySlug(slug) colocated helper — later plans (layout.tsx, page.tsx) must import this rather than re-implementing .find()"
  - "t.services.pages content added at identical nesting depth as t.services.offers in all 3 locale consts, with items: [] as a placeholder three later content plans append into by index order"

requirements-completed: [SVC-01, SVC-02, SVC-05, SVC-06]

# Metrics
duration: ~20min
completed: 2026-09-20
---

# Phase 6 Plan 01: Data Spine, JSON-LD Serializer & i18n Skeleton Summary

**Locale-agnostic 9-service data table, escaped-JSON-LD FAQPage serializer, and the `t.services.pages` i18n skeleton (fr/en/th) that every later Phase 6 plan joins against by index.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-20T14:28:05Z
- **Tasks:** 3 (all TDD: test → feat per task)
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments
- `src/data/services.ts` exports the locked 9-service table (slug/index/caseStudyProjectIndex) and the single `getServiceBySlug` lookup helper, verified by a 9-assertion vitest suite covering uniqueness, the bijective 0-8 index set, and the D-05 case-study-reuse constraint.
- `src/lib/serviceJsonLd.ts` provides `buildFaqJsonLd` (schema.org FAQPage builder) and `buildJsonLdScript` (the single `<`-escaping serialization choke point for all 9 pages' `dangerouslySetInnerHTML` JSON-LD), with a regression test proving a `</script>` payload cannot break out of the tag and that escaping round-trips losslessly through `JSON.parse`.
- `src/lib/translations.ts` gained the `ServicePageContent` interface and a fully-populated `t.services.pages` skeleton (index hero copy, back-link, section headings, CTA block) in all three locales, with `items: []` ready for the three upcoming content-writing plans; a no-price regex guard and a locale-parity guard on `items.length` will stay green as content is appended.

## Task Commits

Each task was executed as test (RED) -> feat (GREEN):

1. **Task 1: src/data/services.ts + services.test.ts**
   - `d37906d` test(06-01): add failing test for services.ts data integrity
   - `54494ed` feat(06-01): implement services.ts with the locked 9-service table
2. **Task 2: src/lib/serviceJsonLd.ts + serviceJsonLd.test.ts**
   - `7852c27` test(06-01): add failing test for serviceJsonLd escaping and FAQPage shape
   - `ee8f546` feat(06-01): implement serviceJsonLd.ts with mandatory < escaping
3. **Task 3: src/lib/translations.ts extension + translations.test.ts**
   - `b7e160b` test(06-01): add failing test for t.services.pages skeleton and no-price guard
   - `127141a` feat(06-01): add ServicePageContent + t.services.pages skeleton to all 3 locales

## Files Created/Modified
- `src/data/services.ts` - 9 Service records + getServiceBySlug, locale-agnostic
- `src/data/services.test.ts` - SVC-01 data-integrity gate
- `src/lib/serviceJsonLd.ts` - buildFaqJsonLd + buildJsonLdScript (escaped JSON-LD serializer)
- `src/lib/serviceJsonLd.test.ts` - SVC-05 shape + escaping regression gate
- `src/lib/translations.ts` - ServicePageContent interface + services.pages block (fr/en/th)
- `src/lib/translations.test.ts` - SVC-02 no-price gate + locale-parity gate

## Decisions Made
- None beyond what the plan and CONTEXT.md already locked (D-04/D-05/D-06 applied exactly as specified). No architectural deviations were needed.

## Deviations from Plan

None - plan executed exactly as written.

One documentation note (not a deviation): the acceptance criterion `grep -c "slug:" src/data/services.ts` returns 9 with the literal grep pattern in isolation, but the file also contains an interface field declaration (`slug: string;`) and the `getServiceBySlug(slug: string)` parameter, both of which also match `slug:`, bringing the raw grep count to 11. The functional intent of the criterion — 9 unique, locked slugs — is verified robustly by the accompanying vitest suite (`services.test.ts`, all 9 tests passing) rather than by the loose grep heuristic, so no code change was made.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `src/data/services.ts`, `src/lib/serviceJsonLd.ts`, and the `t.services.pages` skeleton in `src/lib/translations.ts` are ready for plan 06-02 (route template, index page) to import.
- The three content-writing plans (06-03, 06-05, 06-06) can append `ServicePageContent` entries into `items[]` in index order (0-2, 3-5, 6-8 respectively) without touching this plan's files again.
- No blockers.

---
*Phase: 06-service-pages-template-content*
*Completed: 2026-09-20*
