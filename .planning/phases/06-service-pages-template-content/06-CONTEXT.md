# Phase 6: Service Pages (Template + Content) - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Give every one of the 9 offers (5 existing: Landing Page, Rebranding+Premium, Projet sur-mesure, Agent Vocal IA, Maintenance; 4 new: Community Management, Branding, Meta Ads, Google Ads) its own dedicated, price-free, citable page at `/services/[slug]`, and replace the current single pricing-heavy `/services` page with an index that links to all 9. Per-page structure (problème résolu → fonctionnement → enjeux → preuve sociale → FAQ → double CTA) is already locked by SVC-02 — this discussion covers content strategy and remaining scoping decisions, not that structure. No pricing anywhere (PRIX-01 applies site-wide but is Phase 8's job to enforce elsewhere — this phase must simply never introduce any).

</domain>

<decisions>
## Implementation Decisions

### Copy strategy for the 5 existing offers
- **D-01:** Rewrite content fresh for all 5 existing offers — do not port the current short marketing blurbs as a base. The new problème/fonctionnement/enjeux structure is different enough in purpose that porting-and-expanding would fight the new format.
- **D-02:** Target depth is concise, per SVC-06 literally — roughly 300-500 words total per page. Do not default to long-form "pillar" depth (800-1200+ words) despite the SEO/GEO/AEO strategy doc's general preference for citable long-form; conciseness wins for this milestone.
- **D-03:** Keep the existing checkmark-bullet list format (✓ feature bullets) under the "fonctionnement" section — do not convert to flowing prose. Reuses `OffersSection.tsx`'s established visual/content pattern.
- **D-04:** Align the 5 existing offer names/slugs to the SEO doc's keyword clusters where it suggests a better-matching term (not a blanket rename) — the 4 new offers already have their slugs fixed by the SEO doc (`community-management`, `branding`, `meta-ads`, `google-ads`).

### Social proof for the 4 brand-new services (and the 5 existing)
- **D-05:** Social proof strategy is a hybrid: reuse the 3 existing case studies (Feuillette, Gecko Cabane, Les Folies Temps Danse) on a service page only where genuinely relevant to that service; otherwise use trust signals (methodology, guarantees, "sans engagement", responsiveness) instead of forcing an unrelated case study. Real per-service case studies for the 4 new offers are v2 scope (SVC2-01) — this is the interim approach.
- **D-06:** Apply this same hybrid approach uniformly across all 9 pages, including the 5 existing offers — do not treat existing vs new offers differently for social proof.

### Branding vs Rebranding+Premium boundary (SVC-04)
- **D-07:** Claude's discretion to draft the exact scope split, informed by typical agency scoping conventions and the SEO doc's framing (docs/strategie-seo-geo-llm-2026-09.md §9, which flags the overlap but doesn't resolve it). A reasonable default direction: Branding = identity/logo/guidelines/brand-voice work with no site changes; Rebranding+Premium = full site rebuild bundled with premium branding. Confirm the exact wording during planning/content writing.
- **D-08:** The Branding and Rebranding+Premium pages must explicitly cross-link to each other (e.g., "need a new site too? see Rebranding + Site Premium" / "just need your identity refreshed? see Branding") so prospects can self-select the right offer.

### /services index organization
- **D-09:** Claude's discretion whether to group the 9 services by category (e.g., Présence & Site / Croissance & Ads / Agent Vocal IA / Maintenance) or keep a flat ordered list — pick whichever reads best with 9 items; grouping requires adding a category field to the data model if chosen.
- **D-10:** Drop the "popular" emphasis tag/badge that exists today on the offers grid (middle offer highlighted). No static popularity badge on the new index — the diagnostic simulator (Phase 7) is the intended mechanism for surfacing which service fits a given visitor, not a badge.

### Design inspiration sourcing
- **D-11:** Pull both structural/component inspiration from 21st.dev (e.g., FAQ accordion patterns, service/feature-card layouts) and content/flow inspiration from other agency or SaaS marketing sites — both sources are in scope, not just one.
- **D-12:** No specific 21st.dev components or reference sites were named by the user — the phase researcher (and/or `/gsd:ui-phase`, since this phase has a UI hint) should search for and select fitting examples during research/design rather than waiting on user-supplied links.

### Claude's Discretion
- Exact Branding vs Rebranding+Premium wording/scope split (D-07) — draft it, confirm during planning.
- /services index grouping vs flat list (D-09) — pick based on what reads best.
- Specific 21st.dev components and reference sites to draw from (D-12) — research/ui-phase selects.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & requirements
- `.planning/PROJECT.md` — Current Milestone v1.1 section, "no price anywhere" constraint
- `.planning/REQUIREMENTS.md` — SVC-01 through SVC-06 (this phase's scope)
- `.planning/ROADMAP.md` — Phase 6 goal and success criteria

### SEO/GEO/AEO strategy (directly informs this phase)
- `docs/strategie-seo-geo-llm-2026-09.md` §9 (Addendum 2026-09-20) — fixed slugs for the 4 new services (`community-management`, `branding`, `meta-ads`, `google-ads`), explicit flag on the Branding/Rebranding+Premium overlap, guidance that CTAs must route to "diagnostic"/"simulateur" language rather than pricing, and that each new service page needs its own FAQ + directly citable answer block
- `docs/strategie-seo-geo-llm-2026-09.md` §5 — recommends `Service` schema.org objects per offer with `priceRange` (note: `priceRange` conflicts with the site-wide no-price policy — flag for Phase 9/SEO integration to resolve, not this phase)

### Existing code (data shape, patterns, schema precedent)
- `src/components/sections/OffersSection.tsx` — current 5-offer data shape (name/tagline/price/description/features) and checkmark-bullet rendering pattern to carry forward (minus price)
- `src/lib/translations.ts` — `t.services.offers.items` (fr/en/th) — current home of the 5 offers' copy; new 9-page content must live in this same i18n system per SVC-06
- `src/app/services/page.tsx` and `src/app/services/layout.tsx` — current single-page `/services` structure and its metadata-in-layout convention (`page.tsx` is `'use client'` for `useReveals()`; metadata must stay in `layout.tsx`)
- `src/app/layout.tsx` (~line 214-227) — existing global JSON-LD `@graph` pattern (`Organization`/`ProfessionalService`/`WebSite`/`FAQPage`) — precedent to follow for the new per-page `FAQPage` schema (SVC-05), though this phase adds page-level schema rather than modifying the global block

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OffersSection.tsx`'s checkmark-bullet rendering (`<span className="c">✓</span>{f}`) and card-like offer container — reusable visual pattern for the "fonctionnement" section per D-03
- Existing i18n structure in `translations.ts` (`t.services.offers.items` array of `{name, tagline, price, description, features}`) — needs restructuring to drop `price` and add fields for `problème`/`fonctionnement`/`enjeux`/`preuveSociale`/`faq`

### Established Patterns
- No dynamic `[slug]` routes exist anywhere in this codebase today — `/services/[slug]` for 9 pages will be a new routing pattern for this repo (first dynamic route)
- Metadata lives in `layout.tsx` sibling files, never in the `'use client'` `page.tsx` — this convention must extend to each new `/services/[slug]` page (or its shared layout)
- Global JSON-LD is currently a single `@graph` array built in the root `layout.tsx` — per-page FAQPage schema (SVC-05) will need its own per-page JSON-LD script rather than growing the global one indefinitely

### Integration Points
- `/services` index page replaces `src/app/services/page.tsx`'s current single-page content (Hero/Problem/Approach/OffersSection/PhoneAgentExplainer/Maintenance/Options/Methodology/Reassurance/Partners/FinalCta) with an index-and-links structure — most of those existing sections may need to be redistributed onto individual service pages or dropped/consolidated
- Case studies (Feuillette, Gecko Cabane, Les Folies Temps Danse) currently exist somewhere in the codebase (used in landing preuve sociale per LANDING-03) — reuse the same source of truth for per-service "preuve sociale" per D-05/D-06

</code_context>

<specifics>
## Specific Ideas

- Use 21st.dev component patterns (no specific components named — see D-11/D-12) combined with inspiration from other companies'/agencies' service pages for structure and flow, not just visual polish.

</specifics>

<deferred>
## Deferred Ideas

- Real per-service case studies for the 4 new offers (Community Management, Branding, Meta Ads, Google Ads) — already tracked as `SVC2-01` (v2 requirement), reconfirmed here as out of scope for this phase; the hybrid social-proof approach (D-05) is the explicit interim measure.
- `priceRange` in the `Service` schema.org objects recommended by the SEO doc conflicts with the site-wide no-price policy — flagged for whoever plans Phase 9 (SEO & Discovery Wiring) to resolve, not actionable in this phase.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 6-service-pages-template-content*
*Context gathered: 2026-09-20*
