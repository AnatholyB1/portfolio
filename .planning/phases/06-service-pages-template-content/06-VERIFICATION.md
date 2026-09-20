---
phase: 06-service-pages-template-content
verified: 2026-09-20T21:45:00Z
status: passed
score: 6/6 must-haves verified (automated); human sign-off complete
overrides_applied: 0
---

# Phase 6: Service Pages (Template + Content) Verification Report

**Phase Goal:** Every one of the 9 offers (5 existing + 4 new) has its own dedicated, price-free, citable presentation page, replacing the current pricing-heavy `/services` single page.
**Verified:** 2026-09-20T21:45:00Z (re-verification)
**Status:** passed
**Re-verification:** Yes — user approved after live review via `06-HUMAN-UAT.md`, following three rounds of fixes during that review: `/services/nexistepas` 404 bug fixed (`9fb95c6`), index cards redesigned with problem-solved chips (`cfb9277`), "Comment ça marche" redesigned as a lucide-icon grid (`e498303`). Original automated verification (below) is otherwise unchanged.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Each of the 9 offers has its own dedicated page at `/services/[slug]` (SVC-01) | ✓ VERIFIED | `src/data/services.ts` defines 9 unique, locked slugs; `npm run build` output shows `● /services/[slug]` with the 9 expected paths (`site-vitrine`, `rebranding-site-premium`, `branding`, +6 more); `.next/server/app/services/*.html` contains all 9 files |
| 2 | Every service page follows the fixed structure problème → fonctionnement → enjeux → preuve sociale → FAQ → double CTA, with zero price anywhere (SVC-02) | ✓ VERIFIED | Manual read of `src/app/services/[slug]/page.tsx` confirms the 7-block order exactly (hero/answer → problème → fonctionnement (✓ bullets) → enjeux → preuve sociale (hybrid case-study/signals) → optional cross-link → FAQ → CTA footer); grep of all 9 generated HTML files for `\bprix\b|\btarifs?\b|à partir de` (case-insensitive) returns zero matches. (The only price-adjacent grep hits are `priceRange:"€€"` from the pre-existing, shared root-layout `LocalBusiness` JSON-LD — traced and confirmed unrelated to phase-6 content; that cleanup is explicitly PRIX-01, Phase 8's job per REQUIREMENTS.md, not a Phase 6 gap) |
| 3 | `/services` is now an index listing all 9 services, each linking to its dedicated page (SVC-03) | ✓ VERIFIED | `src/app/services/page.tsx` renders `services.map()` over the 9-entry array, one `<a href="/services/{slug}">` card each, no hardcoded slugs; `src/data/services.test.ts` asserts this programmatically (grid is data-driven, no hardcoded href, no price/badge tokens) — test passes |
| 4 | The Branding page explicitly distinguishes its scope from Rebranding + Site Premium (SVC-04) | ✓ VERIFIED | Identical boundary sentence ("Branding s'arrête à votre identité ; Rebranding + Site Premium inclut la refonte du site...") appears in both items[1] and items[2]'s `directAnswer`, in fr/en/th; reciprocal `crossLink` confirmed in both directions across all 3 locales (`slug: "branding"` ↔ `slug: "rebranding-site-premium"`) |
| 5 | Every service page ships a schema.org `FAQPage` + a citable direct-answer block under H1/H2 (SVC-05) | ✓ VERIFIED | All 9 generated HTML pages contain a `<script type="application/ld+json">` that parses via `JSON.parse`, yields `"@type":"FAQPage"`, and every `mainEntity[].acceptedAnswer.text` is non-empty (verified directly against build output, not just unit tests); `buildJsonLdScript` escapes `<` (regression-tested in `serviceJsonLd.test.ts`); the `.svc-answer` block sits immediately after the H1 in `page.tsx` |
| 6 | Service-page content lives in the existing i18n system (fr/en/th) in `translations.ts`, concisely written (SVC-06) | ✓ VERIFIED | `t.services.pages.items` has exactly 9 entries in fr/en/th (`translations.test.ts`'s completeness gate, 17/17 tests pass); spot-read of the English `branding` entry shows real, coherent, non-placeholder prose, structurally parallel to the French source |
| 7 | A human has confirmed section order, the Branding boundary, and citability on the rendered pages (06-07 checkpoint) | ✗ NOT PERFORMED | 06-07-SUMMARY.md's own "Task 3: Human Verification — Auto-Approved" section states the checkpoint was auto-approved by the orchestrator under `--auto`/`--chain` mode, never actually run by a person against the live pages. This is honestly disclosed by the executor, but it means the plan's own required human sign-off has not happened. Routed to human_needed below (not a code defect — see Human Verification section) |

**Score:** 6/6 automatable truths verified. 1 non-automatable truth (human sign-off) is outstanding and requires a real human pass — status is `human_needed`, not `passed`, per the decision tree (human items take priority even when everything else is green).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/data/services.ts` | 9 Service records + `getServiceBySlug` | ✓ VERIFIED | 9 unique slugs, bijective index 0-8, correct `caseStudyProjectIndex` mapping; `services.test.ts` (9 tests) green |
| `src/lib/serviceJsonLd.ts` | `buildFaqJsonLd` + `buildJsonLdScript` with `<` escaping | ✓ VERIFIED | Escaping confirmed both by unit test and by the fact that all 9 generated pages' JSON-LD parses cleanly |
| `src/lib/translations.ts` | `ServicePageContent` + `t.services.pages.items` (9 entries × 3 locales) | ✓ VERIFIED | 9-of-9 completeness gate green; SVC-04 boundary text present; reciprocal cross-links present |
| `src/app/services/[slug]/layout.tsx` | `generateStaticParams`, `dynamicParams=false`, `generateMetadata`, FAQPage JSON-LD | ✓ VERIFIED | All present; build confirms static generation (● marker) with exactly 9 paths, no on-demand rendering |
| `src/app/services/[slug]/page.tsx` | Fixed 7-block template | ✓ VERIFIED | Confirmed by direct source read; block order matches SVC-02 exactly |
| `src/app/services/[slug]/not-found.tsx` | On-brand 404 | ⚠ FIXED POST-VERIFICATION | File existed with correct content, but was unreachable at runtime — see note below |
| `src/app/globals.css` | `.svc-*`/`.faq-*` CSS block | ✓ VERIFIED | All required classes present; `.pop-tag`/`.o-from`/`.o-price` removed (WR-03 fix confirmed applied); remaining `.offer.popular`/`.mpack.popular` rules are pre-existing, unrelated to the new `/services` pages (grep confirms neither `page.tsx` nor `[slug]/page.tsx` reference `popular`) |
| `src/app/services/page.tsx` | 9-card flat index, no price/badge | ✓ VERIFIED | `services.map()`-driven, single-anchor cards, no `.o-price`/`.o-from`/`.pop-tag`/`popular` |
| `src/app/services/layout.tsx` | Index metadata for 9 offers | ✓ VERIFIED | Title/description/keywords/OG/Twitter all updated per plan; no price wording |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `services.ts` | `translations.ts` | `Service.index` → `t.services.pages.items[index]` | ✓ WIRED | Confirmed by `[slug]/page.tsx`'s `p.items[svc.index]` and by the completeness-gate test joining the two by index |
| `services.ts` | `projects.ts` | `caseStudyProjectIndex` → `projects[]` | ✓ WIRED | `page.tsx` resolves `projects[svc.caseStudyProjectIndex]` with a null-guard (WR-02 fix applied); `services.test.ts` cross-checks validity of the index |
| `[slug]/layout.tsx` | `serviceJsonLd.ts` | `buildFaqJsonLd` + `buildJsonLdScript` | ✓ WIRED | Confirmed in source and in generated HTML (parses to valid `FAQPage`) |
| `/services` index cards | `/services/[slug]` | `href={`/services/${s.slug}`}` | ✓ WIRED | Data-driven, no hardcoded literals, confirmed by `services.test.ts` regression test |
| `items[1]` (Rebranding) | `items[2]` (Branding) | `crossLink.slug` | ✓ WIRED | Reciprocal, confirmed in all 3 locales |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `[slug]/page.tsx` | `copy` (`ServicePageContent`) | `t.services.pages.items[svc.index]` from `translations.ts` | Yes — 9 fully written entries per locale, not placeholders | ✓ FLOWING |
| `[slug]/layout.tsx` JSON-LD | `jsonLd` | `translations.fr.services.pages.items[svc.index].faq` | Yes — real FAQ content, verified non-empty in generated HTML for all 9 pages | ✓ FLOWING |
| `/services` index cards | `copy` per card | Same `t.services.pages.items[s.index]` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes | `npm test` | 5 files, 70/70 tests passed | ✓ PASS |
| Type-checks cleanly | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Lint has no phase-6-introduced errors | `npm run lint` | 34 errors/1 warning, all in files outside `src/app/services/**` and `src/data/services*`/`src/lib/serviceJsonLd*`/`src/lib/translations*` (pre-existing, documented in prior SUMMARYs) | ✓ PASS (scoped) |
| Production build generates 9 static service pages | `npm run build` | `● /services/[slug]` with 9 paths; `/services` is `○` static | ✓ PASS |
| All 9 pages' JSON-LD parses as valid FAQPage with non-empty answers | node script over `.next/server/app/services/*.html` | 9/9 parse, type `FAQPage`, 0 empty `acceptedAnswer.text` across any page | ✓ PASS |
| No price/tariff wording in generated service pages | `grep -ilE "\bprix\b|\btarifs?\b|à partir de"` over all 9 pages + index | zero matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| SVC-01 | 06-01, 06-02, 06-04, 06-07 | 9 dedicated `/services/[slug]` pages | ✓ SATISFIED | Build output + file existence + services.ts |
| SVC-02 | 06-01, 06-02, 06-03, 06-05, 06-06, 06-07 | Fixed structure, no price | ✓ SATISFIED | Template source read + generated-HTML price grep |
| SVC-03 | 06-04 | `/services` becomes 9-service index | ✓ SATISFIED | page.tsx source + regression test |
| SVC-04 | 06-03 | Branding vs Rebranding+Site Premium boundary | ✓ SATISFIED (content); ? PENDING (human read of the "deliberate split" quality) | Boundary sentence + reciprocal cross-link confirmed in code; the qualitative judgment ("reads as a deliberate split, not confusing") is the exact item deferred to the un-run human checkpoint |
| SVC-05 | 06-01, 06-02, 06-07 | FAQPage JSON-LD + citable answer block | ✓ SATISFIED (schema validity); ? PENDING (human judgment of citability quality) | Schema parses correctly for all 9 pages; whether the prose genuinely "stands alone as a quotable paragraph" is inherently a human-judgment item, per the plan's own checklist item 4 |
| SVC-06 | 06-01, 06-03, 06-05, 06-06 | Content lives in `translations.ts`, fr/en/th, concise | ✓ SATISFIED | 9-of-9 completeness gate + word-count advisory all green |

**Note:** REQUIREMENTS.md still shows SVC-01 through SVC-06 as unchecked (`- [ ]`) and "Pending" in the traceability table. This is a documentation-freshness gap, not a functional one — the orchestrator normally flips these after a passing verification. Flagged here so it isn't missed when this report is processed.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No `TBD`/`FIXME`/`XXX` markers found in any phase-6 file | — | None — debt-marker gate is clean |
| `src/app/globals.css` | 478, 487-488, 512 | `.offer.popular` / `.mpack.popular` rules remain (pre-existing, WR-03 only removed `.pop-tag`/`.o-from`/`.o-price`) | ℹ️ Info | Not used by any Phase 6 file; belongs to `OffersSection.tsx`/`MaintenanceSection.tsx`, both confirmed orphaned (unimported) in 06-REVIEW-FIX.md. No functional impact on this phase's goal |
| `src/app/services/[slug]/layout.tsx`, `services/layout.tsx` | — | JSON-LD/metadata hardcoded to French regardless of visitor/crawler locale | ⚠️ Warning (accepted) | CR-01 from 06-REVIEW.md; fixed then deliberately reverted (06-REVIEW-FIX.md) because the fix forced `/services/[slug]` out of static generation for an unreliable locale guess. Documented, human-reviewed, intentional trade-off — not treated as a gap per the task instructions for this verification pass |
| `src/app/services/[slug]/not-found.tsx` | — | `notFound()` called from `layout.tsx` does not route to the segment's own `not-found.tsx` in this Next.js version — bubbled to the generic default instead (site had no root `not-found.tsx` at all) | ✅ Fixed post-verification | Found via live manual browser check against `npm run dev` (not by re-reading source, which is what the original automated pass and 06-07's own curl claim had done). Confirmed against a fresh `next build && next start`: known upstream Next.js 16 issue (vercel/next.js#84738, #87738). Fixed by adding `src/app/not-found.tsx` (styled, catches the bubbled error) and removing the now-pointless `dynamicParams = false`. Re-verified: `/services/nexistepas` and an arbitrary `/doesnotexist` both now render the styled 404 (status 404); all 9 known slugs unaffected (still ● SSG, 200). Commit: `9fb95c6`. |

### Human Verification Required

### 1. Live rendering and content-quality pass on all 9 service pages + index

**Test:** Run `npm run dev` and manually work through the exact 8-item checklist already written in `06-07-PLAN.md` Task 3 (`/services` card grid; Branding vs Rebranding+Site Premium side-by-side comparison; section order + no on-screen price on 3 pages; direct-answer citability on 3 pages; FAQ open/close + source-visible-when-closed; EN/TH language switch with no fallback/empty blocks; `/services/nexistepas` styled 404; confirming the `/simulateur` 404 is accepted as a known Phase 7 gap).
**Expected:** All 8 items check out as described in the plan's `<how-to-verify>` block.
**Why human:** This exact checkpoint (`checkpoint:human-verify`, `gate="blocking"`) was defined in the plan specifically because these are qualitative/visual/rendering judgments grep cannot make (citability of prose, whether a scope boundary "reads as deliberate," whether translations fall back to French, whether an accordion visually opens/closes). It was auto-approved by the orchestrator during an `--auto`/`--chain` run instead of being run by a person — self-disclosed in `06-07-SUMMARY.md`. No evidence exists that anyone has actually loaded these pages in a browser.

## Gaps Summary

No code-level gaps were found. Every automatable must-have (all 6 SVC requirements' mechanical/structural aspects) is verified directly against the built artifacts: 9 statically generated pages, valid parseable FAQPage JSON-LD on every page, zero price strings in phase-6 content, a data-driven 9-card index, a locked and reciprocal Branding/Rebranding boundary, and complete fr/en/th content passing a real join-based completeness gate — all confirmed by running the actual test suite, `tsc`, `lint`, and a full `npm run build`, not by trusting the SUMMARYs' narration.

The one open item is procedural, not technical: the phase's own blocking human-verify checkpoint (06-07 Task 3) was never performed by an actual person before this phase was marked complete. Since SVC-04 (does the boundary genuinely read as deliberate to a prospect?) and SVC-05 (is the answer block genuinely citable, standalone prose?) are explicitly qualitative judgments the plan itself deferred to a human, this phase cannot be marked `passed` until that checklist is actually run. Recommend the developer runs `npm run dev` and works through the 8-item checklist in `06-07-PLAN.md` (reproduced above); if it passes cleanly, this can be flipped to `passed` on re-verification without any code changes.

---

*Verified: 2026-09-20T18:45:00Z*
*Verifier: Claude (gsd-verifier)*
