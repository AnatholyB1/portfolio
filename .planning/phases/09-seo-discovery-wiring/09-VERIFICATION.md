---
phase: 09-seo-discovery-wiring
verified: 2026-10-01T11:15:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 9: SEO & Discovery Wiring Verification Report

**Goal:** Every new page is discoverable by search engines and AI crawlers, and the /services restructuring introduces no broken links.
**Re-verification:** No (initial)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | sitemap.ts covers 9 service pages + /simulateur (SEO-01) | VERIFIED | src/app/sitemap.ts maps `services` to /services/{slug} and adds /simulateur; live sitemap.xml returns 15 `<loc>` |
| 2 | public/llms.txt lists 9 service pages + /simulateur, no "tarif" | VERIFIED | llms.txt lines 29-38; grep for "tarif" returns nothing |
| 3 | layout.tsx JSON-LD has hasOfferCatalog with 9 distinct price-free Service nodes; /services/[slug] stays Service-free (SEO-02) | VERIFIED | layout.tsx:173 wires buildServiceCatalogJsonLd; builder maps `services` with unique @id, no price fields; src/app/services/[slug]/layout.tsx only emits FAQ JSON-LD |
| 4 | Link audit is real, not vacuous (SEO-03) | VERIFIED | src/app/linkAudit.test.ts (200 lines): fs-derived route table, negative fixtures (bad hash, bad route, bad slug), minimum-count guards, covers tsx/projects.ts/llms.txt/sitemap |
| 5 | SEO doc has 6 superseded annotations, original text preserved | VERIFIED | 6 `[Superseded 2026-10]` at lines 26, 37, 54, 71, 97, 125; diff shows original text retained with annotation appended or a note added |
| 6 | D-10 submission recorded | VERIFIED (per record) | 09-04-SUMMARY records submit_sitemap success and list_sitemaps: isPending true, errors 0, warnings 0 for https://sevalys.com/sitemap.xml. The GSC call was not re-run by the verifier, but the live sitemap serves 15 URLs. |

## Checks run
- `npx vitest run`: 21 files, 332 tests passed
- `npx tsc --noEmit`: exit 0
- Requirements traceability: SEO-01, SEO-02, SEO-03 are marked `[x]` and "Complete", mapped to Phase 9 in REQUIREMENTS.md

## Anti-patterns
None blocking. The only noted tooling issue, `graphify update` failing, is unrelated to the phase.

## Notes (non-blocking)
- The 09-03 threshold of 7 non-slug routes is correct (the plan's 8 was a miscount).
- Follow-up in 09-04: revert ADC to read-only scope (least privilege).

## Human verification
None required. The optional schema.org validator check is a nice-to-have.
