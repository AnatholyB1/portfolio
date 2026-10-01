# Phase 9: SEO & Discovery Wiring - Context

**Gathered:** 2026-10-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Make every new page (the 9 `/services/[slug]` pages + `/simulateur`) discoverable by search engines and AI crawlers — registered in `sitemap.ts` and `llms.txt` — extend the global schema.org markup with a distinct, price-free `Service` object per offer linked via `hasOfferCatalog`, and prove via an automated audit that the Phase 6 `/services` index restructuring and Phase 8 landing re-sequencing left no broken internal links. Also reconcile the SEO strategy doc with the shipped no-price policy and submit the live sitemap to Google Search Console.

Already satisfied before this phase (NOT work to redo): the `"[Service] à Tours · [bénéfice]"` title pattern is live in `translations.ts` `metaTitle` for all 9 service pages and `/simulateur` (Phase 6/7), and each page renders its own `<h1>`. SEO-01 therefore reduces to sitemap + llms.txt wiring.

</domain>

<decisions>
## Implementation Decisions

### Service schema.org (SEO-02)
- **D-01:** Service objects live in the **global** JSON-LD only — add an `OfferCatalog` (`hasOfferCatalog`) containing 9 `Service` objects to the `ProfessionalService` block in `src/app/layout.tsx`'s `@graph`. Do NOT also emit per-page `Service` JSON-LD on `/services/[slug]`; those pages keep only their existing `FAQPage` block (`src/lib/serviceJsonLd.ts` via `[slug]/layout.tsx`).
- **D-02:** Each `Service` object's `name`/description is sourced from the existing French `translations.fr.services.pages.items[i].name` / `tagline` (the same price-free copy already driving the `/services` index cards, joined via `services[i].index` in `src/data/services.ts`). No new schema-specific copy is written.
- **D-03:** No `priceRange`, `offers.price`, or any price field on any `Service` object. This resolves the conflict flagged in `06-CONTEXT.md` (SEO doc §5 recommends `Service` with `priceRange`; the site-wide no-price policy overrides it). Each `Service` should carry a `url` to its `/services/{slug}` page.

### llms.txt (SEO-01)
- **D-04:** Minimal-fix scope. Correct the existing "Services & tarifs" link label (the word "tarifs" contradicts the no-price policy) and add links to the pages below. Do NOT add the SEO doc §6's optional "Différenciation" section in this phase.
- **D-05:** List each of the 9 service pages **individually** (one line per `/services/{slug}`) plus `/simulateur`, consistent with how `sitemap.ts` will enumerate them — not a single grouped link to `/services`.
- **D-06:** `sitemap.ts` gains entries for all 9 `/services/{slug}` URLs and `/simulateur` (currently it lists only `/`, `/services`, `/calculateur-roi`, `/demo`, `/mentions-legales`). Enumerate slugs from `src/data/services.ts` rather than hardcoding.

### SEO strategy doc reconciliation
- **D-07:** Edit `docs/strategie-seo-geo-llm-2026-09.md` by **annotating in place** — add short "superseded by §9 / no-price policy" notes next to stale price-related passages; keep the original text for history (no rewrites/deletions).
- **D-08:** Annotation scope covers all of: §1 (the real offers' price list — flag as internal-only, not for public display), §2 lacune #4 and the KBCOM/ConvertiLab price-transparency passage, §3a "Devis/tarifs" quick-win cluster row, §3d "combien coûte un agent vocal IA" long-tail query (redirect toward diagnostic/simulateur per §9's guidance), and §5's `Service` with `priceRange`. This fulfils the reversal note PROJECT.md assigned to Phase 9.

### Link audit (SEO-03)
- **D-09:** The audit is an **automated vitest test** (precedent: the `ALLOWED_HREFS` allowlist pattern in `src/app/page.test.ts`) that persists as a regression guard. It scans internal hrefs/anchors in `src/` and asserts each resolves to a real route or an existing element id. Not a throwaway script and not a manual click-through. Exact scan mechanics are Claude's discretion.

### Google Search Console submission
- **D-10:** Sitemap submission to Search Console **is in scope**, performed **via the `gsc` MCP `submit_sitemap` tool**, sequenced as the **final step after deploy** and human-gated: the user confirms the new sitemap is live at `https://sevalys.com/sitemap.xml`, then gcloud ADC is re-authed with the write scope (`webmasters`, not just `webmasters.readonly`) and `submit_sitemap` is called. The re-auth is interactive, so the user must be present. This step cannot run before the phase's code is deployed.

### Claude's Discretion
- Exact `Service` object shape beyond `name`/`description`/`url` (e.g. `provider` reference to `#organization`, `areaServed`, `serviceType`), as long as no price fields appear.
- `lastModified` / `changeFrequency` / `priority` values for the new sitemap entries.
- Exact wording of the llms.txt link labels and the doc annotations.
- How the link-audit test enumerates routes and anchors (static scan vs. route-manifest check), within D-09.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & requirements
- `.planning/PROJECT.md` — Current Milestone v1.1; Context note that reversing the SEO doc's pricing-transparency recommendation is Phase 9's job
- `.planning/REQUIREMENTS.md` — SEO-01, SEO-02, SEO-03 (this phase's scope); PRIX-01 (no price anywhere, constrains D-03)
- `.planning/ROADMAP.md` — Phase 9 goal and 3 success criteria

### Prior phase decisions (locked, feed into this phase)
- `.planning/phases/06-service-pages-template-content/06-CONTEXT.md` — the 9 finalized service slugs; flags the `Service.priceRange` conflict (line ~96) that D-03 resolves; per-page FAQPage JSON-LD already built
- `.planning/phases/07-diagnostic-simulator/07-CONTEXT.md` — `/simulateur` page; states sitemap/llms.txt registration (SEO-01) is deferred to this phase (line ~97)
- `.planning/phases/08-landing-simplification-pricing-policy/08-CONTEXT.md` — D-09 removed global `priceRange: "€€"` from layout.tsx; D-11/D-12 and the `page.test.ts` allowlist pattern that D-09 here mirrors

### SEO/GEO/AEO strategy
- `docs/strategie-seo-geo-llm-2026-09.md` — §1, §2, §3a, §3d, §5 hold stale price-related passages to annotate (D-07/D-08); §5 title/H1 pattern and `Service` schema guidance; §6 llms.txt guidance (the "Différenciation" section is deferred, D-04); §7 quick win #1 (submit sitemap) and §8 (GSC MCP setup and the write-scope caveat behind D-10); §9 addendum already documenting the reversal

### Existing code — direct targets of this phase
- `src/app/sitemap.ts` — add 9 service slugs + `/simulateur` (D-06)
- `public/llms.txt` — fix "Services & tarifs" label, add 10 links (D-04/D-05)
- `src/app/layout.tsx` (lines ~103-216) — root `@graph` (`org`, `professionalService`, `website`, `faq`); target for `hasOfferCatalog` + 9 `Service` objects (D-01)
- `src/data/services.ts` — the 9 slugs and `index` join key into `translations.fr.services.pages.items[i]` (D-02, D-06)
- `src/lib/translations.ts` — `services.pages.items[i].name`/`tagline`/`metaTitle` (D-02); title pattern already present (lines ~357-666, `/simulateur` metaTitle ~772)
- `src/app/services/[slug]/layout.tsx` and `src/lib/serviceJsonLd.ts` — existing per-page FAQPage JSON-LD; must stay Service-free (D-01)
- `src/app/page.test.ts` — the allowlist-test precedent for the link audit (D-09)
- gsc MCP tools (`mcp__gsc__list_sitemaps`, `mcp__gsc__submit_sitemap`) — property `sc-domain:sevalys.com` (D-10)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `services` array + `getServiceBySlug` in `src/data/services.ts` — single source of truth for slugs; reuse to drive both sitemap entries and the schema `Service` list so they can't drift
- `buildFaqJsonLd` / `buildJsonLdScript` in `src/lib/serviceJsonLd.ts` — existing JSON-LD helper pattern to follow for any new schema builder
- `translations.fr.services.pages.items[i]` — already price-free name/tagline copy per service

### Established Patterns
- Root layout hardcodes French JSON-LD (the i18n system is client-only post-hydration) — the new Service objects must also use `translations.fr`, not the language context
- Guard tests encode policy (e.g. `translations.test.ts`, `layout.test.ts`, `page.test.ts` for no-price) — a `Service` schema price-field guard and the link-audit test fit this pattern
- Slug enumeration via `generateStaticParams` over `services` — sitemap should mirror this

### Integration Points
- `layout.tsx` `professionalService` object gains `hasOfferCatalog` referencing the 9 Service objects
- `/services` is now an index page (Phase 6) and the landing was re-sequenced (Phase 8) — these are the restructurings the link audit must clear, including dead anchors such as the retired `/services#phone-agent`
- Search Console currently has no sitemap submitted for `sc-domain:sevalys.com` (per SEO doc §1)

</code_context>

<specifics>
## Specific Ideas

No external references named — open to standard approaches for the schema shape, sitemap metadata values, and audit mechanics.

</specifics>

<deferred>
## Deferred Ideas

- **llms.txt "Différenciation" section** (SEO doc §6: site + agent vocal IA + SEO/GEO combo, explicit factual differentiation) — explicitly declined for this phase (D-04); revisit as a later SEO content pass.
- **Per-page `Service` JSON-LD on `/services/[slug]`** — declined in favor of global-only (D-01); could be revisited if per-page rich results become a goal.

### Reviewed Todos (not folded)
None — no pending todos matched this phase.

</deferred>

---

*Phase: 9-SEO & Discovery Wiring*
*Context gathered: 2026-10-01*
