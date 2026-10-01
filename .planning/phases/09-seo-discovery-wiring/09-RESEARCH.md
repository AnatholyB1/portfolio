# Phase 9: SEO & Discovery Wiring - Research

**Researched:** 2026-10-01
**Domain:** Next.js App Router metadata routes, schema.org JSON-LD, vitest source-scan guard tests, Search Console MCP
**Confidence:** HIGH (all findings from direct codebase reads and schema.org pages)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Service objects live in the **global** JSON-LD only: add an `OfferCatalog` (`hasOfferCatalog`) with 9 `Service` objects to the `ProfessionalService` block in `src/app/layout.tsx`'s `@graph`. Do NOT emit per-page `Service` JSON-LD on `/services/[slug]`; those keep only the existing `FAQPage` (`src/lib/serviceJsonLd.ts` via `[slug]/layout.tsx`).
- **D-02:** Each `Service`'s `name`/description comes from `translations.fr.services.pages.items[i].name` / `tagline` (joined via `services[i].index`). No new schema-specific copy.
- **D-03:** No `priceRange`, `offers.price`, or any price field on any `Service`. Each `Service` carries a `url` to `/services/{slug}`.
- **D-04:** llms.txt minimal fix: correct the "Services & tarifs" label, add links. No "Différenciation" section.
- **D-05:** List each of the 9 service pages individually (one line per `/services/{slug}`) plus `/simulateur`.
- **D-06:** `sitemap.ts` gains 9 `/services/{slug}` + `/simulateur`. Enumerate slugs from `src/data/services.ts`, do not hardcode.
- **D-07:** Annotate `docs/strategie-seo-geo-llm-2026-09.md` in place ("superseded by §9 / no-price policy"); keep original text.
- **D-08:** Annotation scope: §1 price list (internal-only), §2 lacune #4 + KBCOM/ConvertiLab passage, §3a "Devis/tarifs" row, §3d "combien coûte un agent vocal IA" query, §5 `Service` with `priceRange`.
- **D-09:** Link audit = automated vitest test persisting as a regression guard (precedent: `ALLOWED_HREFS` in `src/app/page.test.ts`). Scans internal hrefs/anchors in `src/`, asserts each resolves to a real route or existing element id.
- **D-10:** GSC sitemap submission in scope via `gsc` MCP `submit_sitemap`, final step after deploy, human-gated (user confirms sitemap live at `https://sevalys.com/sitemap.xml`, gcloud ADC re-authed with `webmasters` write scope, then call).

### Claude's Discretion
- `Service` shape beyond name/description/url (`provider`, `areaServed`, `serviceType`), no price fields.
- sitemap `lastModified` / `changeFrequency` / `priority` for new entries.
- Wording of llms.txt labels and doc annotations.
- How the link audit enumerates routes/anchors (static scan vs route manifest), within D-09.

### Deferred Ideas (OUT OF SCOPE)
- llms.txt "Différenciation" section.
- Per-page `Service` JSON-LD on `/services/[slug]`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEO-01 | 9 service pages + `/simulateur` in sitemap and llms.txt (titles/H1 already live) | sitemap.ts/llms.txt current state below; slug enumeration from `services` |
| SEO-02 | Global schema.org has price-free `Service` per offer via `hasOfferCatalog` | schema.org verified shape; layout.tsx insertion point; guard test |
| SEO-03 | Link audit confirms no broken internal links | Concrete scan results (zero broken found) + test design |
</phase_requirements>

## Summary

Phase 9 is small, additive wiring. `sitemap.ts` currently lists 5 URLs; `llms.txt` has 5 links with the label "Services & tarifs"; the root layout `@graph` is `[org, professionalService, website, faq]` and `professionalService` has no `hasOfferCatalog`. All three are straightforward edits driven by the `services` array. The only structural risk is that `layout.tsx` is a Server Component with `next/font` imports, so tests must read it as source text (existing `layout.test.ts` pattern), meaning the 9 Service objects are best built in a pure helper module (like `serviceJsonLd.ts`) that IS importable under vitest `environment: 'node'`, with layout.tsx calling it.

A real link scan of `src/` found **no currently broken internal links**. All route targets exist and all hash targets (`#top`, `#manifeste`, `#work`, `#contact`) resolve to ids on the landing page. The retired `/services#phone-agent` appears only in `page.test.ts` as a DEAD_DESTINATIONS guard string, not in any live source. The audit test therefore ships green and acts as a regression guard.

**Primary recommendation:** Add `src/lib/serviceSchema.ts` (pure builder: `buildServiceCatalogJsonLd(siteUrl)` returning the `OfferCatalog`), call it from layout.tsx's `professionalService.hasOfferCatalog`, drive sitemap from `services`, and add a `src/app/linkAudit.test.ts` static scan that maps hrefs to a route table derived from the filesystem (`page.tsx` discovery) plus an id table derived from `id="..."` in `src/`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| sitemap.xml | Frontend Server (Next metadata route) | — | `src/app/sitemap.ts` generated at build |
| llms.txt | CDN / Static | — | static file in `public/` |
| Global JSON-LD | Frontend Server (root layout, SSR) | — | must be in server HTML for crawlers; French-hardcoded |
| Link audit | Build/test tier (vitest) | — | static source scan |
| GSC submission | External/manual (MCP) | — | post-deploy, human-gated |

## Standard Stack

No new dependencies. Existing: Next.js App Router (`MetadataRoute.Sitemap`), vitest (`environment: 'node'`, include `src/**/*.test.ts`, alias `@` -> `src`) [VERIFIED: vitest.config.ts]. Node `fs`/`path` for the scan.

### Package Legitimacy Audit
No external packages installed in this phase. **Packages removed:** none. **Flagged:** none.

## Current State (verified by reading files)

- **`src/app/sitemap.ts`**: 5 entries (`/`, `/services`, `/calculateur-roi`, `/demo`, `/mentions-legales`), single `now = new Date()`, `SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com"`. Does not import services.
- **`public/llms.txt`**: line 28 `- Services & tarifs : https://sevalys.com/services` (the only "tarifs" in the file; line 20 "Devis : sous 48h, sans engagement" is not a price and may stay). Links block lines 25-31.
- **`src/app/layout.tsx`**: `org` (l.103), `professionalService` (l.133-171, `@id` `${SITE_URL}/#service`, `parentOrganization` -> `#organization`, existing `serviceType` string array, `areaServed` GeoCircle), `jsonLd = {"@graph": [org, professionalService, website, faq]}` (l.213-216), rendered with `JSON.stringify(jsonLd)` (no `<` escaping, pre-existing gap noted in serviceJsonLd.ts; low risk since content is static, but prefer `buildJsonLdScript` if touching the line).
- **`src/app/layout.test.ts`**: reads layout.tsx as text; asserts no `priceRange` substring and presence of `"ProfessionalService"`, `areaServed`, `openingHours`. NOTE: any new schema code placed in layout.tsx must not contain the substring `priceRange` (also avoid in comments).
- **`src/data/services.ts`**: 9 slugs in order: site-vitrine(0), rebranding-site-premium(1), branding(2), projet-sur-mesure(3), agent-vocal-ia(4), maintenance(5), community-management(6), meta-ads(7), google-ads(8). `services` and `getServiceBySlug` exported.
- **`translations.fr.services.pages.items[i]`**: has `name`, `tagline`, `metaTitle`, `metaDescription`, `directAnswer`, etc. CAUTION: `tagline` is uppercase marketing copy (e.g. "L'ESSENTIEL POUR ÊTRE VISIBLE"). D-02 locks name/tagline as the source; acceptable, but the planner may let `description` use `tagline` as-is or sentence-cased; recommend using it verbatim to honor D-02 (no new copy). `metaDescription` is a richer alternative only if the user relaxes D-02 [ASSUMED: preference].
- **`src/lib/serviceJsonLd.ts`**: pure module (no next/react imports), `buildFaqJsonLd`, `buildJsonLdScript`. Pattern for the new builder; has a test file `serviceJsonLd.test.ts`.
- **`[slug]/layout.tsx`**: `generateStaticParams` over `services`; emits only FAQPage JSON-LD. Must remain Service-free (add a guard test).
- **`src/app/page.test.ts`**: source-text tests; `ALLOWED_HREFS`, `HREF_PATTERN = /href=(?:"([^"]*)"|\{`([^`]*)`\})/g`, `extractHrefs`, `DEAD_DESTINATIONS` list including `/services#phone-agent`. Navbar/Footer deliberately excluded from that CTA scan (but the new audit should include them).
- **robots.ts**: allows all, references `/sitemap.xml`; no change needed.

## Architecture Patterns

### Pattern 1: schema.org shape (verified)
schema.org: `hasOfferCatalog` domain = Organization, Person, Service; range = OfferCatalog. `OfferCatalog` is an `ItemList`; `itemListElement` accepts `ListItem`, `Text`, or `Thing` (so `Service` objects directly are valid) [CITED: schema.org/OfferCatalog, schema.org/hasOfferCatalog]. `ProfessionalService` is a subtype of Organization/LocalBusiness so `hasOfferCatalog` on it is valid.

```ts
// src/lib/serviceSchema.ts  (pure: no next/react imports)
import { services } from '@/data/services';
import { translations } from '@/lib/translations';

export function buildServiceCatalogJsonLd(siteUrl: string) {
  const items = translations.fr.services.pages.items;
  return {
    '@type': 'OfferCatalog',
    '@id': `${siteUrl}/#catalog`,
    name: 'Services Sèvalys',
    itemListElement: services.map((s) => ({
      '@type': 'Service',
      '@id': `${siteUrl}/services/${s.slug}#service`,
      name: items[s.index].name,
      description: items[s.index].tagline,
      url: `${siteUrl}/services/${s.slug}`,
      provider: { '@id': `${siteUrl}/#organization` },
      areaServed: 'FR',
    })),
  };
}
// layout.tsx: professionalService = { ..., hasOfferCatalog: buildServiceCatalogJsonLd(SITE_URL) }
```

Notes: `provider` -> `#organization` per the CONTEXT discretion (Organization `@id` exists at l.105). Do NOT use `offers`/`Offer` wrappers (they invite price fields). Avoid the key `priceRange` and `price`, `priceCurrency`, `offers` anywhere. `@id` fragments using the page URL are fine since FAQPage on the same page uses `#faq`, no collision.
Optional: `serviceType` per Service is discretionary; skip to keep copy-free (D-02).

Importing `translations` into a pure module: translations.ts has no `next` imports at top (starts with type declarations); `serviceJsonLd.test.ts` and `translations.test.ts` already run under node env, so import is safe [VERIFIED: existing tests]. Layout.tsx is already a Server Component importing translations? Not currently; adding the import is fine (translations is large; it is already bundled server-side by `[slug]/layout.tsx`).

### Pattern 2: sitemap
```ts
import { services } from '@/data/services';
const serviceEntries = services.map((s) => ({
  url: `${SITE_URL}/services/${s.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8,
}));
// plus { url: `${SITE_URL}/simulateur`, ..., priority: 0.8 }
```
Recommended values: services 0.8 monthly, `/simulateur` 0.8 monthly (conversion entry point). Keep existing priorities. Does `@/` alias work in sitemap.ts? Yes, Next resolves tsconfig paths; `[slug]/layout.tsx` already uses `@/data/services`. Test sitemap by importing it directly in vitest (`sitemap.ts` imports only `next` types, erased) — safe.

### Pattern 3: llms.txt
Replace line 28 label with "Services" (e.g. `- Services : https://sevalys.com/services`), then add 9 lines `- {name} à Tours : https://sevalys.com/services/{slug}` and `- Simulateur de diagnostic : https://sevalys.com/simulateur`. Names should match `items[i].name` (a test can assert each slug URL appears in llms.txt and the word "tarif" does not). llms.txt is static; generating it at build is out of scope; a drift test (below) covers it.

## Link Audit: Real Scan Results

Method: grep of `href=`, `router.push`, `redirect(`, and hash strings across `src/` (non-test), plus `id=` inventory, plus route inventory.

**Routes that exist (page.tsx):** `/`, `/services`, `/services/[slug]` (9 slugs; unknown slug -> `notFound()`), `/simulateur`, `/calculateur-roi`, `/demo`, `/demo/feuillette`, `/mentions-legales`. API routes (`/api/contact`, `/api/crm/*`, `/api/simulateur`) are not link targets.

**Internal link targets found, all resolve:**
- `/` (not-found.tsx), `/#top`, `/#manifeste`, `/#work`, `/#contact` (Navbar l.54-62, Footer l.31-34, services pages, FinalCtaSection)
- `/services` (Navbar, Footer, crumb-back on `[slug]/page.tsx` l.33, calculateur-roi l.107, [slug]/not-found l.16)
- `/services/${slug}` (ServicesPreview l.26, services/page.tsx l.47, crossLink l.131), `/services/agent-vocal-ia` (PhoneAgent l.18, calculateur-roi l.261)
- `/simulateur` (HeroSection l.209, ProblemSection l.37, Realisations l.52, services pages)
- `/demo`, `/calculateur-roi` (PhoneAgentExplainer l.36-39, demo l.215, feuillette l.294)
- `/demo/feuillette` (projects.ts l.21), `#contact` (HeroSection l.212, same-page)
- External/non-route: `https://...`, `mailto:`, `tel:`.
- crossLink slugs in translations (all 3 locales): only `branding` and `rebranding-site-premium`, both valid slugs.

**Ids present** (landing sections): `top`, `manifeste`, `problems`, `services-preview`, `fonctionnement`, `work`, `phone`, `partners`, `contact`. Ids existing but NOT on landing: `phone-agent` (PhoneAgentExplainer), `contact-final` (FinalCtaSection), `options`; those components are not imported by any page (PhoneAgentExplainer, FinalCtaSection, OptionsSection, ApproachSection, ReassuranceSection, PartnersBanner unused; MethodologySection only via ClientProviders lazy export). They hold live-looking links (`/demo`, `/calculateur-roi`, `/#contact`) that all resolve anyway.

**Broken links found: none.** `/services#phone-agent` appears only as a guard string in `page.test.ts`. `/#contact` from Navbar on non-landing pages resolves to landing `#contact` (valid). Caveat: `href="/#top"` relies on `id="top"` in HeroSection, which exists.

### Audit test design (Claude's discretion, recommended)
Static scan test `src/app/linkAudit.test.ts` (vitest `environment: node`, `fs` only):
1. **Route table (derived, not hardcoded):** walk `src/app` for `page.tsx`; convert dirs to routes (`[slug]` -> pattern). Expand `[slug]` with `services.map(s => s.slug)`. Route-group folders `(x)` do not exist currently, ignore.
2. **Anchor table:** per route, the set of `id="..."` strings. Landing (`/`) = union of ids in the components imported by `src/app/page.tsx` plus page.tsx itself (parse `import X from '@/components/sections/X'` lines, read those files). This precisely excludes the orphan components, so a link to `#phone-agent` on `/` correctly fails. Layout-level components (Navbar/Footer) have no ids of interest.
3. **Link extraction:** reuse `HREF_PATTERN` approach from page.test.ts over all `src/**/*.tsx` (including Navbar/Footer, which the CTA test intentionally skips), plus `href: '...'` in `src/data/projects.ts`. Skip `http(s):`, `mailto:`, `tel:`. Template hrefs: handle `` `/services/${...slug}` `` by a regex allowlist: `/services/${s.slug}` and `/services/${copy.crossLink.slug}` map to the slug set (assert crossLink slugs from translations are all valid slugs, all 3 locales).
4. **Resolve:** split `path#hash`. Bare `#x` resolves against the file's own page (only landing files use it: `#contact`); `/#x` resolves against `/`. Assert path in route table and hash in that route's ids. Hash on a non-landing route (e.g. `/services#phone-agent`) fails because `/services` has no such id.
5. **Negative fixtures:** include a pure function `resolveHref(href)` exported from a test helper and unit-test it with `/services#phone-agent` (must fail), `/nope` (must fail), `/#contact` (must pass). This proves the guard can fail.
Also scan `public/llms.txt` URLs and `sitemap()` output: every URL path must be in the route table (catches drift both ways), and assert sitemap contains every `services` slug + `/simulateur`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Slug lists | hardcoded 9 slugs in sitemap/schema | `services` array from `src/data/services.ts` |
| JSON-LD serialization | new stringify | `buildJsonLdScript` (escapes `<`) if layout script line is touched |
| Route discovery in test | manual route list | fs walk for `page.tsx` |
| Sitemap XML | custom route handler | existing `app/sitemap.ts` metadata route |

## Common Pitfalls

1. **`priceRange` substring in layout.tsx** (even in a comment) fails `layout.test.ts`. Keep the builder in a separate module and avoid the word in comments; write the new price-field guard against the built object (recursive key scan for `price`, `priceRange`, `priceCurrency`, `offers`, `lowPrice`, `highPrice`).
2. **Importing layout.tsx in a test** fails on `next/font`; use text read or the pure builder.
3. **Uppercase `tagline`** as `description` reads oddly in rich snippets; harmless to validity. Flag to user, do not invent copy (D-02).
4. **Duplicate `@id`**: new ids `#catalog` and `/services/{slug}#service` do not collide with `#organization`, `#service` (ProfessionalService, root), `#website`, `#faq`, per-page `#faq`.
5. **Do not add Service JSON-LD to `[slug]/layout.tsx`** (D-01); add a guard test that its source does not contain `'Service'` type usage (source-text check for `"@type": 'Service'`/`'Service'` literal).
6. **Orphan components with stale links** are not on any page; the audit must scope the anchor table to imported components or it will falsely pass `#phone-agent`.
7. **Sitemap `lastModified: new Date()`** changes each build; acceptable (existing pattern).
8. **Trailing newline/CRLF in llms.txt on Windows**: tests should split on `/\r?\n/`.

## Stale Passages in docs/strategie-seo-geo-llm-2026-09.md (200 lines)

(Line numbers verified; §9 at l.168-172 already documents the reversal, so annotations point there.)

| Section | Line | Passage | Annotation direction |
|---------|------|---------|----------------------|
| §1 | 26 | "Offres réelles ... Landing Page (1200–2000€), Rebranding + Site Premium (2500–4400€), ... Agent Vocal IA dès 990€ ... Maintenance (49/79/129€+ /mois)" | internal-only, never for public display (PRIX-01) |
| §2 | 35 | "KBCOM et ConvertiLab affichent des prix publics ... la transparence tarifaire est un facteur de confiance prouvé localement." | superseded by §9 (l.172 already says it reverses this) |
| §2 lacune #4 | 52 | "4. Transparence tarifaire → facteur de conversion prouvé, peu pratiqué par la majorité." | superseded; compensate via preuve sociale + simulateur |
| §3a | 69 | table row "Devis/tarifs ... 'prix création site internet tours', 'combien coûte un site internet pme' ... **Quick win** (grille de prix publique)" | no public price grid; redirect to diagnostic/simulateur |
| §3d | 93 | "'combien coûte un agent vocal IA pour une petite entreprise' (→ lien `/calculateur-roi`)" | redirect toward diagnostic/simulateur per §9 l.186 |
| §5 | 121 | "`Service` par offre avec `priceRange`" | Service objects shipped WITHOUT priceRange (global OfferCatalog, Phase 9 D-01/D-03) |

Related, optional extra annotations (not in D-08 list, mention to planner): l.80 "site vitrine pme tarif" (§3b), l.109 article "Combien coûte un site internet professionnel à Tours en 2026 ?" (§4). Also l.43 competitor price data (Nerolia, AirAgent) is competitive intel, not a site policy issue. Keep annotations as short inline `> **[Superseded 2026-10 — voir §9 / politique sans prix]**` blockquote lines directly beneath each passage; no deletions. A cheap guard: test that doc contains the marker string at least 5 times (optional).

## GSC Submission (D-10) — verified from the local MCP server

- Server: `C:\Users\Anatholy\.claude\mcp-servers\gsc-mcp\server.mjs`, registered as `gsc` (stdio) in `~/.claude.json`.
- Tools registered: `list_sitemaps` (siteUrl), `submit_sitemap` (siteUrl + feedpath), plus others (l.29 and l.79, e.g. a site-list and a search-analytics tool).
- **Write scope gap:** `SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]` (server.mjs l.7) with `GoogleAuth`. The tool description itself says `submit_sitemap` 403s until ADC is re-authed with write scope. Re-auth alone is not enough if the server requests only the readonly scope in code: the ADC credential carries the scopes granted at login, and `GoogleAuth({scopes})` for user credentials uses the credential's token scopes, so re-login with `webmasters` is the documented path [ASSUMED: google-auth-library behaviour for authorized_user ADC; verify by calling `submit_sitemap` and observing 403 vs success]. If it still 403s, change `SCOPES` to `https://www.googleapis.com/auth/webmasters` in server.mjs (a local-tool edit outside the repo; flag to user).
- Re-auth command (interactive, user must be present): `gcloud auth application-default login --scopes=https://www.googleapis.com/auth/webmasters,https://www.googleapis.com/auth/cloud-platform` (cloud-platform is typically needed by gcloud ADC login) [ASSUMED]; then restart the `gsc` MCP server (reload Claude Code MCP) so the new token is picked up.
- **Exact human-gated sequence:**
  1. Phase code merged and deployed to Vercel production.
  2. User confirms `https://sevalys.com/sitemap.xml` lists the 10 new URLs (and `llms.txt` is live) in a browser/`curl`.
  3. User runs the ADC re-auth with write scope (interactive); restart MCP.
  4. `mcp__gsc__list_sitemaps` with `siteUrl: "sc-domain:sevalys.com"` (expect empty per SEO doc §1).
  5. `mcp__gsc__submit_sitemap` with `siteUrl: "sc-domain:sevalys.com"`, `feedpath: "https://sevalys.com/sitemap.xml"`.
  6. `list_sitemaps` again to confirm it appears (may show pending). Optionally revert ADC to readonly afterward.
- Plan implication: this must be a `checkpoint:human-action` task in the final plan, `autonomous: false`, and the phase's code tasks must not depend on it.

## Runtime State Inventory
Not a rename/migration phase. Only runtime state: Search Console has no sitemap submitted (SEO doc §1) — handled by D-10. Nothing else.

## Environment Availability

| Dependency | Required By | Available | Fallback |
|------------|------------|-----------|----------|
| Node/vitest | tests | yes (existing suite) | — |
| `gsc` MCP server | D-10 | registered, readonly scope only | re-auth + possibly edit SCOPES |
| gcloud CLI | ADC re-auth | not probed [ASSUMED present, since ADC is already used] | user installs/uses existing |
| Production deploy | D-10 gating | user-controlled | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (config `vitest.config.ts`, env node, include `src/**/*.test.ts`) |
| Quick run | `npx vitest run src/app src/lib` |
| Full suite | `npx vitest run` |

### Phase Requirements -> Test Map
| Req | Behavior | Type | Command | File |
|-----|----------|------|---------|------|
| SEO-01 | `sitemap()` contains every `services` slug URL + `/simulateur` + 5 originals; no duplicates | unit | `npx vitest run src/app/sitemap.test.ts` | Wave 0 (new) |
| SEO-01 | llms.txt contains `/services/{slug}` for all 9 + `/simulateur` + `/services`; contains no "tarif" | unit (fs read) | `npx vitest run src/app/llms.test.ts` | Wave 0 (new) |
| SEO-01 | titles/H1 already live | existing `translations.test.ts` | `npx vitest run src/lib/translations.test.ts` | exists (verify it asserts "à Tours" pattern; do not redo) |
| SEO-02 | `buildServiceCatalogJsonLd` returns OfferCatalog with 9 distinct Service (distinct `@id`, `name`, `url`), provider `#organization`, `hasOfferCatalog` wired in layout source | unit + source read | `npx vitest run src/lib/serviceSchema.test.ts src/app/layout.test.ts` | new + extend |
| SEO-02 | no price-ish key anywhere in built catalog (recursive key scan: price, priceRange, priceCurrency, offers, lowPrice, highPrice) and in `layout.tsx` source `priceRange` (existing) | unit | same | new |
| SEO-02 | `[slug]/layout.tsx` stays Service-free (D-01) | source read | `npx vitest run src/lib/serviceJsonLd.test.ts` | extend |
| SEO-03 | every internal href/anchor in `src/**/*.tsx` + `projects.ts` + llms.txt + sitemap resolves to route (+ id on that route); negative-fixture tests for resolver | unit/static | `npx vitest run src/app/linkAudit.test.ts` | Wave 0 (new) |
| D-07/D-08 | doc annotated (optional marker-count check) | manual/optional | — | optional |
| D-10 | GSC submit | manual-only (interactive auth, production) | MCP calls | human checkpoint |

### Sampling Rate
- Per task commit: `npx vitest run src/app src/lib src/data`
- Per wave merge / phase gate: `npx vitest run` + `npx tsc --noEmit` (or `next build`) green. Post-deploy smoke: `curl -s https://sevalys.com/sitemap.xml | grep -c "/services/"` should be 10 lines (9 slugs + index).

### Wave 0 Gaps
- [ ] `src/app/sitemap.test.ts`, `src/app/llms.test.ts` (or one `discovery.test.ts`)
- [ ] `src/lib/serviceSchema.ts` + `serviceSchema.test.ts`
- [ ] `src/app/linkAudit.test.ts`
- Framework install: none needed.
- Optional external check: Google Rich Results / validator.schema.org on the production homepage after deploy (manual; confirms `hasOfferCatalog` parses).

## Security Domain

| ASVS | Applies | Control |
|------|---------|---------|
| V5 Input validation | marginal | JSON-LD built from static first-party copy; if layout script is touched, serialize with `buildJsonLdScript` (escape `<`) |
| V2/V3/V4/V6 | no | no auth/session/crypto in this phase |

Threat: XSS via JSON-LD `</script>` injection (Tampering) — static content, low risk; mitigated by `buildJsonLdScript`. GSC credentials: use write scope only transiently; revert ADC to readonly afterward (least privilege).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Re-login of ADC with `webmasters` scope suffices without editing `SCOPES` in server.mjs | GSC | submit 403s; need local server edit |
| A2 | Exact gcloud re-auth flags (`--scopes` incl. cloud-platform) | GSC | user must adjust flags |
| A3 | Using `tagline` (uppercase) verbatim as Service `description` is acceptable | Pattern 1 | cosmetic; user may prefer sentence case/metaDescription |
| A4 | sitemap priority/changefreq values (0.8 monthly) | Pattern 2 | negligible |

## Open Questions

1. **Uppercase tagline as description** — recommend verbatim per D-02; planner may surface to user at review.
2. **Should the audit also cover the unused orphan components?** Recommendation: no (scope anchor table to composed pages); optionally list them as dead code in a note, out of scope for deletion.

## Sources

### Primary (HIGH)
- Direct reads: `src/app/sitemap.ts`, `public/llms.txt`, `src/app/layout.tsx`, `src/app/layout.test.ts`, `src/app/page.test.ts`, `src/data/services.ts`, `src/lib/serviceJsonLd.ts`, `src/app/services/[slug]/layout.tsx`, `vitest.config.ts`, `docs/strategie-seo-geo-llm-2026-09.md`, `C:\Users\Anatholy\.claude\mcp-servers\gsc-mcp\server.mjs`
- https://schema.org/OfferCatalog, https://schema.org/hasOfferCatalog

### Tertiary (LOW)
- google-auth-library ADC scope behaviour (A1) — not verified this session.

## Metadata
**Confidence:** stack HIGH, architecture HIGH, link scan HIGH (grep-based; dynamic hrefs enumerated manually), GSC re-auth specifics MEDIUM.
**Research date:** 2026-10-01 | **Valid until:** 30 days
