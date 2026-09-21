---
phase: 08-landing-simplification-pricing-policy
verified: 2026-09-21T21:45:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 8: Landing Simplification & Pricing Policy Verification Report

**Phase Goal:** The landing page and existing offer pages present the agency without ever showing a price, guiding every visitor toward the simulator or direct contact.
**Verified:** 2026-09-21
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | No price/tariff/price-range appears on landing, 9 service pages, simulator, or ROI calculator (PRIX-01) | VERIFIED | `grep -rniE "€|\bprix\b|\btarifs?\b"` across `src/components/sections/*.tsx`, `src/app/page.tsx`, `src/app/services/`, `src/app/simulateur/` returns zero hits. `priceRange` field removed from `ProfessionalService` JSON-LD in `src/app/layout.tsx` (confirmed absent via grep). `translations.test.ts` PRICE_PATTERN guard green (286/286 suite passing). |
| 2 | `/calculateur-roi` shows no price of the solution, only recovered capacity/value (PRIX-02) | VERIFIED | Read `src/app/calculateur-roi/page.tsx` in full: no `prixMensuel`/`setup` fields, no `ratioSocle`/`amortissementMois`/"Rentabilisé en" claims. Only `capaciteRecuperee`, `caRecupere`, `margeRecuperee`, `beneficeTotal` (value/capacity framing, euro amounts kept per D-01 exception). Page ends on single CTA to `/services/agent-vocal-ia`. |
| 3 | Landing sequence follows problèmes → aperçu services → fonctionnement → enjeux → preuve sociale → CTA (LANDING-01) | VERIFIED | `src/app/page.tsx` composition: Hero, Manifeste, ProblemSection, ServicesPreview, FonctionnementSection, EnjeuxSection, Realisations, PhoneAgent, Partners, ContactSection — matches locked order. `page.test.ts` "landing composition (LANDING-01)" describe passing. ServicesPreview cards route to `/services/{slug}` (9-card, data-driven from `services.map`). |
| 4 | Every landing CTA routes to simulator or direct contact, with the two locked class-B exceptions (LANDING-02) | VERIFIED | Manually inspected `HeroSection.tsx` (→`/simulateur`, `#contact`), `ProblemSection.tsx` (→`/simulateur`), `Realisations.tsx` bridge (→`/simulateur`), `PhoneAgent.tsx` (→`/services/agent-vocal-ia`, D-08 exception), ROI calculator CTA (→`/services/agent-vocal-ia`, D-02 exception). `page.test.ts` `ALLOWED_HREFS`/`ALLOWED_HREF_PREFIXES`/`SLUG_TEMPLATE_HREF` allowlist correctly encodes D-11/D-12 as documented in 08-CONTEXT.md. `DEAD_DESTINATIONS` check confirms no `/services`, `/demo`, `/services#phone-agent` survive. |
| 5 | Feuillette, Gecko Cabane, Les Folies Temps Danse render as case studies (LANDING-03) | VERIFIED | `src/data/projects.ts` contains all three (plus a fourth, Ghjulianu Codani, pre-existing/unaffected). `Realisations.tsx` renders `projects.map(...)` unchanged from prior phases. Confirmed live in 08-06-SUMMARY.md's Task 3 browser check. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/calculateur-roi/page.tsx` | Price-free value calculator | VERIFIED | No price fields; `capaciteRecuperee`/`caRecupere` framing; CTA to `/services/agent-vocal-ia` |
| `src/app/layout.tsx` | JSON-LD without `priceRange` | VERIFIED | Field absent, `ProfessionalService`/other fields intact |
| `src/lib/translations.ts` | `t.landing.problems/servicesPreview/method/enjeux/work.bridge_*` in fr/en/th, price-free `t.services` | VERIFIED | Confirmed keys present via translations.test.ts (57/57 in that file); `bridge_eyebrow` added post-checkpoint fix |
| `src/components/sections/ProblemSection.tsx` | Landing problem section, single CTA to `/simulateur` | VERIFIED | Reads `t.landing.problems`, no per-card links, bottom CTA only |
| `src/components/sections/ServicesPreview.tsx` | 9-card data-driven services overview | VERIFIED | `services.map(...)`, `href={\`/services/${s.slug}\`}`, no price/badge |
| `src/components/sections/FonctionnementSection.tsx` | Engagement-process rail | VERIFIED | Exists, GSAP ScrollTrigger, `id="fonctionnement"` |
| `src/components/sections/EnjeuxSection.tsx` | Stakes section | VERIFIED | Exists, 4-point grid, no CTA (by design) |
| `src/components/sections/PhoneAgent.tsx` | Single-CTA teaser | VERIFIED | 24-line hook-free component, one CTA to `/services/agent-vocal-ia`, `PhoneFlow` removed |
| `src/components/sections/Realisations.tsx` | Case studies + i18n bridge to `/simulateur` | VERIFIED | Case studies unchanged, bridge uses `t.landing.work.bridge_*` including `bridge_eyebrow` fix |
| `src/app/page.tsx` | Final landing composition in LANDING-01 order | VERIFIED | Matches locked order exactly |
| `ServicesHeroSection.tsx`/`OffersSection.tsx`/`MaintenanceSection.tsx` | Deleted (price-carrying orphans) | VERIFIED | Confirmed absent from `src/components/sections/` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `ProblemSection.tsx` | `/simulateur` | bottom CTA | WIRED | `href="/simulateur"` present, single occurrence |
| `PhoneAgent.tsx` | `/services/agent-vocal-ia` | sole teaser CTA | WIRED | Confirmed, D-08 exception |
| `calculateur-roi/page.tsx` | `/services/agent-vocal-ia` | results CTA | WIRED | D-02 exception |
| `Realisations.tsx` | `src/lib/translations.ts` | `t.landing.work.bridge_*` | WIRED | All four bridge fields (incl. `bridge_eyebrow`) consumed |
| `ServicesPreview.tsx` | `src/data/services.ts` | `services.map(...)` | WIRED | Confirmed data-driven, no hardcoded slugs |
| `src/app/page.tsx` | all landing sections | import + render order | WIRED | Full composition matches spec order |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite green | `npx vitest run` | 286/286 tests passing, 16 files | PASS |
| No price strings in landing sections | `grep -rniE "€\|prix\|tarifs?" src/components/sections/*.tsx src/app/page.tsx` | 0 matches | PASS |
| No price strings in service pages / simulator | `grep -rniE "€\|prix\|tarifs?" src/app/services/ src/app/simulateur/` | 0 matches | PASS |
| No `priceRange` in JSON-LD | `grep -n "priceRange" src/app/layout.tsx` | 0 matches | PASS |
| Landing composition order | Read `src/app/page.tsx` | Matches locked order | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PRIX-01 | 01,02,03,04,05,06 | No price/tariff on landing/services/simulator | SATISFIED | Site-wide grep clean, layout.tsx priceRange removed, translations.test.ts green |
| PRIX-02 | 01,02,06 | `/calculateur-roi` no longer shows price | SATISFIED | page.tsx read directly, no price/setup fields, D-01 confirmed |
| LANDING-01 | 01,03,04,06 | Landing section order per spec | SATISFIED | page.tsx composition matches, page.test.ts green |
| LANDING-02 | 01,03,05,06 | Every CTA → simulator or contact (2 locked exceptions) | SATISFIED | Manual href audit + page.test.ts allowlist matches D-11/D-12 |
| LANDING-03 | 05,06 | Existing case studies as social proof | SATISFIED | projects.ts + Realisations.tsx confirmed, 3 named studies present |

No orphaned requirements — all 5 phase requirement IDs are declared across the six plans and traced to passing evidence above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/translations.ts` | 954 (fr), ~1732 (en), ~2486 (th) | `landing.work.intro` claims "Six partenaires" while only 4 case studies render | INFO | Pre-existing stale copy (not introduced by Phase 8; flagged in 08-REVIEW.md WR-03). Does not affect PRIX/LANDING truth conditions — case studies do render and CTAs are correct — but is a factual inaccuracy worth a follow-up copy fix. |
| `src/app/globals.css` | 646-652, 313-326 | Dead CSS from removed ROI multiplier card and old PhoneAgent flow diagram | INFO | Non-functional cleanup debt (08-REVIEW.md WR-04/WR-05), no user-facing or requirement impact. |
| `src/app/calculateur-roi/page.tsx` | 61-64 | Numeric input clamps to 0 instead of field min on clear | WARNING | Pre-existing UX edge case (08-REVIEW.md WR-01), unrelated to pricing-policy scope. |

No TBD/FIXME/XXX debt markers found in any phase-modified file. No blocking anti-patterns.

### Human Verification Required

None outstanding. Task 3 of plan 08-06 (the mandatory human-verification checkpoint) was already completed live by the developer against `npm run dev`, walking all 10 checks from 08-06-PLAN.md (documented in 08-06-SUMMARY.md). 9/10 passed cleanly on first pass; the 1 deviation found (hardcoded French "—— PROCHAINE ÉTAPE" bridge eyebrow leaking into EN/TH) was fixed and committed (`ca8de2e`), then re-verified live in EN and TH with no remaining leaks. This verifier independently confirmed the fix is present in the current source (`Realisations.tsx` renders `{w.bridge_eyebrow}`, `translations.ts` carries the field in fr/en/th).

### Gaps Summary

None. All 5 must-have truths verified against actual source code (not SUMMARY.md claims alone): every landing component was read directly, the JSON-LD and ROI calculator source were inspected for absence of price tokens, the CTA allowlist test was cross-checked against the D-11/D-12 decisions in 08-CONTEXT.md, and the full test suite (286/286) was independently re-run. The one prior human-verification deviation (i18n leak on the bridge eyebrow) was already found and fixed within the phase's own checkpoint, and this verifier confirmed the fix is live in the codebase. The remaining review findings (08-REVIEW.md's 6 warnings, 2 info) are advisory code-quality items — accessibility labeling, a stale "six partenaires" headline, dead CSS, an input-clamp edge case, and a global ScrollTrigger cleanup scope issue — none of which contradicts any of the phase's 5 required truths (PRIX-01, PRIX-02, LANDING-01, LANDING-02, LANDING-03). They do not block phase closure but are worth tracking as follow-up polish.

---

*Verified: 2026-09-21*
*Verifier: Claude (gsd-verifier)*
