# Pitfalls Research

**Domain:** Lead-qualification simulator + no-pricing service pages + landing redesign on an existing production Next.js/Supabase agency site (Sèvalys)
**Researched:** 2026-09-20
**Confidence:** HIGH for codebase-grounded findings (direct audit of `src/app/api/crm/*`, `src/lib/supabase.ts`, `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `docs/strategie-seo-geo-llm-2026-09.md`); MEDIUM for external UX/conversion benchmarks (WebSearch, cross-checked across multiple sources); LOW/flagged where noted.

## Critical Pitfalls

### Pitfall 1: "Reuse the existing CRM" is not actually true — there is no leads/prospects table

**What goes wrong:**
`PROJECT.md` and the SEO addendum both state the simulator should write into "le CRM Supabase existant." A direct audit of `src/app/api/crm/` shows only three routes: `orders/`, `products/`, `stock/` — this is the Feuillette bakery demo schema (VAPI phone-agent order-taking), not a generic lead/prospect table. Building the simulator on the assumption that a compatible table already exists will either (a) silently write malformed rows into the demo's `orders`/`products` tables, corrupting the `/demo` dashboard used for client pitches, or (b) stall mid-implementation when the team discovers no schema fits.

**Why it happens:**
The word "CRM" is used loosely in planning docs to mean "the Supabase project," but the actual schema is demo-specific, not a general-purpose lead store. Nobody traced the actual table structure before writing the requirement.

**How to avoid:**
Treat this as a schema-design task, not a "reuse" task. Design a new `leads` (or `diagnostic_submissions`) table from scratch: qualification answers (JSON or normalized columns), recommended services, contact fields, source page, timestamp, status. Keep it in the same Supabase project (fine to share the project) but do not touch `orders`/`products`/`stock`. Confirm with the user whether "existing CRM" meant "same Supabase project" (almost certainly) vs. "same table" (impossible as designed) before scoping the simulator phase.

**Warning signs:**
Any PLAN that says "insert into the existing CRM table" without naming a specific new table/migration. Any code that imports `fetchOrders`/`fetchProducts` patterns for lead storage.

**Phase to address:**
Simulator/CRM integration phase — first task should be a schema audit + migration, before any UI work.

---

### Pitfall 2: Removing all pricing reverses a documented, evidence-backed local competitive advantage

**What goes wrong:**
`docs/strategie-seo-geo-llm-2026-09.md` (§2, §3a) explicitly identifies price transparency as a proven local conversion factor: two competitors (KBCOM, ConvertiLab) publish prices and convert well per Google reviews, and "prix création site internet tours" / "combien coûte un site internet pme" are flagged as SEO **quick wins** predicated on having a real pricing grid to answer them. The same document records Sèvalys's own current public prices (Landing Page 1200–2000€, Agent Vocal IA dès 990€, Maintenance 49/79/129€/mois) as a differentiation asset. The v1.1 milestone as scoped in `PROJECT.md` says pricing must be removed from "page de présentation dédiée par service (**existants + nouveaux**)" — i.e., not just the 4 new services, but the existing ones too. This is a direct reversal of a decision the site's own SEO research called a strength, and external benchmarks corroborate the downside: "contact for pricing" pages see a documented ~38% higher bounce rate than pages with visible pricing, and non-transparent pricing pages generate more form fills but convert to real pipeline at a documented ~1.7x lower rate (source: aggregated B2B pricing-page benchmarks, MEDIUM confidence — single-source stat, but directionally consistent across multiple pricing-strategy articles reviewed).

**Why it happens:**
The "never show price" decision was made for the 4 *new* upsell-turned-standalone services (Community Management, Branding, Meta Ads, Google Ads) where pricing is genuinely variable/negotiated — a reasonable call. But `PROJECT.md`'s wording ("existants + nouveaux") generalizes it to services that already had public, working prices, without re-litigating the SEO strategy's own findings.

**How to avoid:**
Before building the no-price service pages, get an explicit decision recorded in `REQUIREMENTS.md`/`PROJECT.md` on scope: does "no price ever" apply only to the 4 new services, or does it also strip pricing from Landing Page / Agent Vocal / Maintenance pages that currently work as SEO quick-win targets? If the latter is truly intended, mitigate the bounce/trust cost: keep indicative ranges or "à partir de X€" anchors (a documented middle ground that most surveyed pricing guides recommend over total opacity) rather than zero information, and make sure `/simulateur` and each service page still target the "prix/tarif" keyword cluster — just answer it with "obtenez un chiffrage personnalisé en 2 minutes" instead of abandoning the query intent, per the SEO doc's own §Addendum recommendation.

**Warning signs:**
Existing pricing content silently deleted from `/services` or the Agent Vocal section without a corresponding decision log entry. New pages ranking for "tarif"/"prix" queries with high bounce in GSC once data accumulates (can't be detected yet — see Pitfall 9).

**Phase to address:**
Requirements/scoping phase (before landing + service-page phases start) — resolve the "existants + nouveaux" ambiguity explicitly; landing redesign phase should implement whichever answer it its CTA copy.

---

### Pitfall 3: Simulator built as a "form," not a qualification flow — front-loaded contact fields kill completion

**What goes wrong:**
Non-technical SMB owners are the target audience and the stated goal is "understands what we do... in under 60 seconds" — a long or badly sequenced multi-step form will lose most of them before reaching the recommendation. Cross-checked benchmarks: forms with 7+ fields see ~67.8% abandonment, with each added field cutting conversion ~4.1%; asking for contact info as the *first* screen (rather than after the qualifying questions, right before showing the result) causes especially high immediate abandonment (MEDIUM confidence, multiple industry sources agree on ordering, single-source on exact percentages).

**Why it happens:**
It's tempting to ask for name/email/phone early "to not lose the lead if they abandon," but this backfires — busy restaurant/shop owners bounce immediately if the first thing asked feels like a sales form rather than a helpful diagnostic.

**How to avoid:**
Structure the simulator as: 1) a few qualification questions (business type, current situation, main pain point) → 2) show a teaser/preview of the recommendation ("vos réponses suggèrent : Community Management + Meta Ads") → 3) THEN ask for contact details to "receive the full diagnostic and be called back." Keep total steps to 5–7 screens max, 5–9 fields total, with a visible step indicator (both directly requested by the target audience's low tolerance for friction and consistent with cross-industry benchmarks). Every question should map to a specific recommendation-engine input — if a question doesn't change what gets recommended, cut it.

**Warning signs:**
Simulator wireframes/PLAN that puts an email/phone field on step 1. No visible progress indicator in the design. More than ~7 total questions.

**Phase to address:**
Simulator UX/flow design phase, verified in that phase's success criteria (step count, field order) before wiring to the CRM.

---

### Pitfall 4: Simulator → CRM write path inherits (and amplifies) the existing spam/abuse gap

**What goes wrong:**
The existing `/api/contact` route (`src/app/api/contact/route.ts`) has zero spam protection — no honeypot, no CAPTCHA, no rate limiting, only basic payload-shape validation (non-empty strings, `@` in email). It works today because it's low-value/low-traffic. The simulator is a much more attractive target: it's a multi-step tool advertised as the primary site CTA, feeding straight into a sales pipeline, and (per Pitfall 1) will need a *new* Supabase table. `src/lib/supabase.ts` shows the pattern already in use: the "server" client (`createServerClient()`) actually uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the same publicly-exposed anon key used client-side for the `/demo` realtime dashboard. If the new `leads` table's RLS policy grants `anon` insert (needed for the simulator to work at all under this existing pattern), anyone can bypass the Next.js API route entirely and POST directly to the Supabase REST endpoint with the public anon key, flooding the sales CRM with junk leads or scraping the endpoint for structure.

**Why it happens:**
Copy-pasting the existing (already permissive) Supabase client pattern feels like "consistency with the codebase," but what was an acceptable risk for a demo order-taking table becomes a real business risk for a sales lead table.

**How to avoid:**
- Keep all writes to the new leads table behind the Next.js API route (like `/api/contact` does), never insert directly from the client.
- Add RLS on the new table that does NOT grant `anon` insert directly — inserts should only happen via the service_role key, used server-side only, in the new API route (this requires actually using `service_role`, unlike the current `createServerClient()` which — despite its comment — uses the anon key).
- Add basic bot-resistance to both the new simulator route and (ideally, while touching this code) `/api/contact`: a honeypot field, and a lightweight rate limit (e.g., Supabase-recommended `private.rate_limits` table keyed by IP, or an edge-level check) since Supabase RLS alone cannot rate-limit.
- Validate qualification-answer payloads server-side (enum checks per question, not just non-empty strings) so garbage answers don't pollute the sales team's recommendation view.

**Warning signs:**
New table's RLS policy includes `for insert to anon using (true)`. `NEXT_PUBLIC_SUPABASE_ANON_KEY` used in any server-side write path for the new leads table. No honeypot/rate-limit field in the simulator form schema.

**Phase to address:**
Simulator/CRM integration phase — spam protection and RLS design must be part of that phase's acceptance criteria, not deferred as "harden later."

---

### Pitfall 5: New long-form marketing copy crammed into `translations.ts`, degrading fr/en/th quality and bloating the i18n system

**What goes wrong:**
The project constraint ("i18n: Must preserve fr/en/th via existing LanguageContext") pulls toward putting all new copy (4 service pages × problème/fonctionnement/enjeux/FAQ, plus every simulator question/result) into the existing `src/lib/translations.ts` (already 959 lines). But the SEO strategy doc explicitly warns: "Toute nouvelle page de contenu long (blog, secteurs) devrait vivre **hors** de ce système pour ne pas devoir tout traduire en 3 langues" — this milestone's new service pages are exactly this kind of long-form content. Forcing them through `translations.ts` means every FAQ answer, every "enjeux" paragraph, every simulator recommendation blurb must be hand-translated into English and Thai even though the actual audience (PME de Tours) is overwhelmingly French-speaking — producing either translation debt (English/Thai versions perpetually stale/missing) or low-quality filler translations that hurt AEO citability (LLMs citing thin/awkward non-French copy) without any commensurate traffic benefit.

**Why it happens:**
"Don't break the LanguageContext" is treated as "everything must go through translations.ts," when the real requirement is narrower: don't break the *existing* language switcher for *existing* pages/UI strings.

**How to avoid:**
Scope the i18n constraint precisely: UI chrome (nav, buttons, form labels, simulator step controls) stays in `translations.ts` for consistency with the switcher. Long-form marketing/FAQ copy for the new service pages and simulator results can either (a) be added to `translations.ts` only for fr, with en/th falling back to fr or a short generic summary, or (b) live in per-page content modules outside the translation system, exactly as the SEO doc recommends for future blog/secteur pages — decide once, apply consistently across all 4 new service pages + `/simulateur`.

**Warning signs:**
`translations.ts` growing by 300+ lines per new service page. English/Thai FAQ answers that are clearly machine-translated placeholders never revisited.

**Phase to address:**
Content/architecture decision at the start of the service-pages phase (before writing any page), reusing whatever pattern gets chosen for all 4 pages + simulator for consistency.

---

### Pitfall 6: Global, French-only JSON-LD in root layout gets treated as "already handled" for the new pages

**What goes wrong:**
`src/app/layout.tsx` injects one `@graph` (Organization, ProfessionalService, WebSite, FAQPage) into every page via the root layout, hardcoded in French, with a single generic 3-question FAQPage. The SEO addendum (§9) explicitly requires each new service page and `/simulateur` to have **its own** FAQ block and direct-answer content for AEO. If the team assumes the global JSON-LD "already covers FAQ" and skips adding page-specific `FAQPage`/`Service` schema to the 4 new pages, those pages will have zero structured data of their own — undermining exactly the AEO differentiation the SEO strategy is banking on. Conversely, if a page-specific FAQPage is added carelessly at the same `@id` pattern or duplicated verbatim, it risks schema conflicts. Also note: Google deprecated FAQ rich results in search (fully removed May 2026) — so the payoff for new FAQPage blocks is AEO/LLM citation, not a Google SERP rich snippet; this should be communicated so the team doesn't judge success by rich-snippet appearance.

**Why it happens:**
The existing JSON-LD is easy to miss since it's injected once at the root and not visible when working inside a page component; it's not obvious that per-page schema needs to be added separately.

**How to avoid:**
Add page-level `<script type="application/ld+json">` on each new service page and `/simulateur` with its own `Service`/`FAQPage`/`BreadcrumbList` per the SEO doc §5, distinct `@id`s from the root ones, and referencing `parentOrganization`/`@id` of the existing Organization node for consistency. Update `public/llms.txt` in the same commit each new page ships (the SEO doc calls this out as a recurring action item — easy to forget after the first page). Do not expect Google SERP rich-snippet payoff from FAQPage; treat it as an AI-crawler/LLM-citation investment only.

**Warning signs:**
New service page ships with no `<script type="application/ld+json">` of its own. `llms.txt` unchanged after a new page goes live.

**Phase to address:**
Each service-page phase should include "add page-level JSON-LD + update llms.txt" as an explicit acceptance item; not a single "SEO phase" done once at the end.

---

### Pitfall 7: Manually-maintained `sitemap.ts` silently omits the new pages

**What goes wrong:**
`src/app/sitemap.ts` is a hardcoded array (5 URLs today), not auto-generated from the filesystem. `robots.ts` allows all crawlers, but crawlers still rely on the sitemap for discovery, especially for a young domain with no backlink graph yet. It is very easy to ship the 4 new service pages + `/simulateur` and forget to add corresponding entries, leaving them technically live and linked internally but absent from the sitemap indefinitely.

**Why it happens:**
Sitemap entries are in a completely different file from the pages themselves, with no build-time check tying them together.

**How to avoid:**
Add a sitemap entry for every new route in the same PR that creates the route. Since `/simulateur` is described as a cross-cutting "pilier" page, give it a high priority value (comparable to `/services`, i.e. ≥0.8). Optionally add a lightweight test/lint step that asserts every top-level route under `src/app/` has a matching sitemap entry, to prevent silent omissions going forward.

**Warning signs:**
`git diff` on a service-page PR that doesn't touch `sitemap.ts`.

**Phase to address:**
Each page-creation phase (service pages, simulator) — sitemap update as a required checklist item, not a separate "SEO cleanup" phase.

---

### Pitfall 8: Landing "simplification" breaks the site's existing cross-page anchor links

**What goes wrong:**
Per `PROJECT.md`'s Key Decisions, nav hrefs are absolute (`/#manifeste`, `/#work`, `/#contact`) specifically because relative anchors fail when navigating from `/services`. The "landing page simplifiée" redesign (new section set: problèmes / services / fonctionnement / enjeux / preuve sociale) will almost certainly rename or remove sections like `#manifeste`/`#work`. If the new section IDs aren't propagated to every page that links to them (`/services`, and any new service pages/`/simulateur` that link back to specific landing sections), those cross-page CTAs silently 404-scroll (land on top of the page instead of the intended section) with no error — a UX regression that's invisible in normal QA unless every cross-page link is manually re-tested.

**Why it happens:**
Anchor links aren't checked by TypeScript or the build — a renamed `id="manifeste"` doesn't produce a compile error anywhere, only a silent no-op scroll.

**How to avoid:**
Before redesigning landing sections, grep the whole codebase for every `/#<anchor>` reference (services page, new service pages, simulator, footer) and produce a mapping of old→new anchor IDs. Update all referencing pages in the same phase as the landing redesign, not after. Manually click-test every cross-page CTA post-redesign.

**Warning signs:**
`grep -rn "/#" src/` turns up references the redesign PR didn't touch.

**Phase to address:**
Landing redesign phase — anchor audit should be a named task before the new section markup ships.

---

### Pitfall 9: Zero Search Console baseline means SEO regressions from this milestone will be invisible for months

**What goes wrong:**
The SEO doc's own audit found `sevalys.com`'s GSC property has **no sitemap submitted and zero recorded search data** (site too new). This cuts both ways for this milestone: there's little indexed traffic to lose from a landing redesign (lower risk than a typical redesign-SEO-loss scenario), but it also means there is no baseline to compare against — if the redesign or new pages introduce a technical regression (broken JSON-LD, orphaned pages, thin/duplicate content across the 4 similarly-structured new service pages), nobody will see it in GSC deltas for a long time, because there's no "before" curve to break.

**Why it happens:**
Teams often treat "GSC shows no drop" as reassurance that a redesign was safe, but on a young/unindexed site that's not evidence of anything.

**How to avoid:**
Don't rely on GSC deltas as the safety check for this milestone. Instead: (1) submit the sitemap now (already flagged as an overdue quick win in the SEO doc, independent of this milestone) so data starts accumulating; (2) validate structured data with Google's Rich Results Test / Schema.org validator per new page as a manual gate before shipping; (3) run a basic crawl (e.g. a sitemap-driven fetch checking 200 status + canonical + title/H1 uniqueness) across all pages after the milestone ships, since near-duplicate content across 4 structurally-similar new service pages (Community Management / Branding / Meta Ads / Google Ads) is a real risk if they're built from one shared template with minimal differentiation.

**Warning signs:**
Milestone "done" criteria that cite "no drop in GSC" as evidence of SEO safety.

**Phase to address:**
SEO integration phase — define validation as manual technical checks (structured data validator, crawl, uniqueness review), not GSC monitoring, given the lack of baseline. Sitemap submission itself is an independent quick win worth doing regardless of this milestone's timing.

---

### Pitfall 10: New qualification data collected without updating the RGPD/privacy disclosure

**What goes wrong:**
`src/app/mentions-legales/page.tsx` already contains RGPD/données-personnelles language for the existing contact form, but the simulator will collect a materially different and more granular category of personal data — business-profiling answers (sector, budget signals, current tools, pain points) tied to a name/email/phone, stored in a new Supabase table for sales follow-up. If the mentions légales / privacy text isn't reviewed and extended to describe this new processing purpose and retention, and if the simulator doesn't link to it with an explicit checkbox/consent statement before submission, the site is exposed to a real (if likely low-enforcement-risk-at-this-scale) CNIL/RGPD compliance gap for a French-based commercial entity actively collecting B2B leads.

**Why it happens:**
The existing contact form's minimal RGPD text feels like "compliance already handled," so it's easy to skip re-reviewing it when adding a more data-hungry form.

**How to avoid:**
Update the mentions légales / privacy section to describe the diagnostic simulator's data collection and purpose (commercial follow-up, service recommendation) and retention period. Add a required consent checkbox on the final simulator step, linking to that page — matching what's typical for a French SMB-facing lead form.

**Warning signs:**
Simulator ships without any consent checkbox or link to a privacy notice.

**Phase to address:**
Simulator/CRM phase — legal disclosure as an explicit acceptance item, reviewed alongside the CRM schema work in Pitfall 1.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Writing simulator answers directly from client to Supabase (skip API route) | Faster to build, matches `/demo` dashboard's client-side pattern | Anon key exposed in bundle → direct spam/scrape access to sales leads (Pitfall 4) | Never for a lead-capture table — acceptable only for read-only public dashboards like `/demo` |
| Copying one service-page template 4x with only nouns swapped | Ships all 4 pages fast | Near-duplicate content across service pages hurts both classic SEO (thin/duplicate) and AEO differentiation the milestone is chasing | Only as a first draft, must be substantively rewritten per service before shipping |
| Skipping per-page JSON-LD because "root layout already has FAQPage" | Saves time | New pages have zero page-specific structured data, undermining the AEO strategy that's the whole point of this milestone | Never for the 4 service pages + `/simulateur` — those are explicitly called out as pillar pages in the SEO doc |
| Leaving `translations.ts` en/th entries as literal French copy-paste "for now" | Ships without translation delay | Publishes wrong-language content to en/th visitors and AI crawlers indefinitely (nobody revisits it) | Acceptable only with a tracked follow-up task, not silently |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Supabase (new leads table) | Reusing the "anon key does everything" pattern from `src/lib/supabase.ts` for a new sales-data table | Use `service_role` key server-side only in the new API route; RLS on the new table should not grant `anon` insert |
| Existing CRM dashboard (`/demo`, Supabase Realtime) | Bolting simulator submissions onto `orders`/`products`/`stock` tables to "reuse the CRM" | New dedicated table/migration; `/demo/feuillette` and its schema must stay untouched (explicit Out of Scope in `PROJECT.md`) |
| Resend (`/api/contact` pattern) | Assuming the existing contact-form pattern (no CAPTCHA/rate limit) is "good enough" to copy for the higher-value simulator | Add honeypot + basic rate limiting when building the new route; consider retrofitting `/api/contact` at the same time since it shares the gap |
| `LanguageContext` / `translations.ts` | Treating "preserve i18n" as "every new paragraph must live in translations.ts" | Scope i18n to UI chrome; decide explicitly where long-form service/simulator copy lives (see Pitfall 5) |
| Root-layout JSON-LD | Assuming the global `FAQPage`/`Organization` schema covers new pages | Add distinct page-level `Service`/`FAQPage`/`BreadcrumbList` schema per new page, referencing the existing `Organization` `@id` |
| `sitemap.ts` / `llms.txt` | Forgetting to hand-edit these static files when adding a route | Treat as a required step in every new-page PR, not a separate SEO pass |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Asking for name/email/phone before any qualifying question | Immediate abandonment — feels like a sales gate, not a diagnostic | Ask 3–5 qualifying questions first, show a teaser recommendation, then request contact info to "unlock" the full result |
| No visible progress/step indicator in the simulator | Users don't know how long is left, abandon mid-flow assuming it's endless | Persistent step counter ("2/5") or progress bar |
| Zero pricing anywhere with no anchor/range and no explanation of why | Frustration and bounce — non-technical owners specifically want a ballpark before investing time in a form (documented ~38% higher bounce on "contact for pricing" pages) | Give the simulator itself as the "get your price" path in every CTA; consider indicative ranges on existing services per Pitfall 2 |
| Service-page jargon (e.g. "Meta Ads," "community management") used without a plain-language one-line explanation | Non-technical restaurant/shop owners don't reliably know what these terms mean, undermining "understands what we do in under 60 seconds" core value | Lead every new service page with a plain-language "ça veut dire quoi pour vous" framing before naming the service |
| Multiple competing CTAs (call, email, simulator) presented with equal visual weight everywhere | Choice paralysis dilutes the "single clear next step" goal | Simulator as the primary CTA everywhere; phone/email as a secondary, lower-weight fallback for people who want a human immediately |
| Simulator not resumable / not mobile-optimized | Local SMB owners fill this in on a phone between customers; losing progress on interruption kills completion | Persist partial answers (localStorage or table row draft) across a session; keep touch targets and field count mobile-appropriate |

## "Looks Done But Isn't" Checklist

- [ ] **Simulator → CRM write path:** Looks done when the form submits successfully once in dev. Verify: RLS policy reviewed (no `anon` insert), rate-limit/honeypot present, payload validated server-side per question (not just non-empty checks).
- [ ] **New service pages:** Look done when copy and layout render. Verify: each has its own JSON-LD (`Service`/`FAQPage`), `llms.txt` updated, entry added to `sitemap.ts`, and CTA never mentions a price.
- [ ] **Landing redesign:** Looks done when the new sections render visually. Verify: every `/#anchor` reference across `/services`, new service pages, and `/simulateur` still resolves to a real section id; footer nav still works.
- [ ] **i18n on new pages:** Looks done when the language switcher doesn't crash. Verify: en/th content is real translated copy (or an intentionally-scoped fallback per Pitfall 5), not literal French, and `html lang` behavior is understood/documented rather than assumed correct.
- [ ] **"No price" service pages:** Look done when no €/price string appears in the visible copy. Verify: no price leaked into JSON-LD (`priceRange` is already set at `€€` in the root ProfessionalService schema — check whether that should change), no price in FAQ answers, no price in `llms.txt` entries for the new pages.
- [ ] **Privacy/consent for the simulator:** Looks done when the form submits. Verify: mentions légales text updated for the new data category, consent checkbox present and required before submission.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|-------------------|
| CRM built on wrong table (Pitfall 1) | MEDIUM | Migrate to a dedicated `leads` table, backfill any already-captured rows, update the recommendation-engine/API route to point at the new table; low cost if caught before launch, higher if the demo dashboard was already polluted |
| Pricing fully stripped from existing pages against intent (Pitfall 2) | LOW | Re-add indicative ranges/"à partir de" anchors to the affected pages; content-only change, no schema/data migration needed |
| Spam floods the leads table (Pitfall 4) | MEDIUM | Add RLS/rate-limit/honeypot retroactively, purge obviously-bogus rows by pattern (repeated IPs, nonsense answers), notify sales team of the affected date range |
| Broken cross-page anchors after landing redesign (Pitfall 8) | LOW | Grep for all `/#` references, patch hrefs to the new section ids; no data migration, just a find-and-fix pass |
| Missing sitemap/llms.txt entries for new pages (Pitfall 7) | LOW | One-line additions per file, no schema/data impact — just remember to do it |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| 1 — No leads table exists | Simulator/CRM integration phase (first task) | Migration file exists for a dedicated leads table; `/demo/feuillette` schema untouched |
| 2 — No-price scope reverses SEO asset | Requirements/scoping phase, before landing + service-page phases | `REQUIREMENTS.md` records an explicit decision on existing vs. new service pages |
| 3 — Front-loaded contact fields | Simulator UX/flow design phase | Step count ≤7, contact fields appear only after qualifying questions, progress indicator present |
| 4 — Spam/abuse on leads write path | Simulator/CRM integration phase | RLS reviewed, honeypot/rate-limit present, code review confirms `service_role` used server-side only |
| 5 — i18n content bloat/quality | Content/architecture decision at start of service-pages phase | Explicit pattern documented and applied identically across all 4 new pages + simulator |
| 6 — Missing page-level JSON-LD | Each service-page phase (per-page acceptance item) | Rich Results Test / Schema.org validator passes per new page; `llms.txt` diff present in the same PR |
| 7 — Sitemap omissions | Each page-creation phase | `sitemap.ts` diff present in the same PR as the new route |
| 8 — Broken anchors from redesign | Landing redesign phase | Manual click-test of every cross-page `/#anchor` link post-redesign |
| 9 — No GSC baseline to detect regressions | SEO integration phase | Manual structured-data + crawl validation used as the actual safety gate; sitemap submitted independently |
| 10 — Privacy disclosure gap | Simulator/CRM phase | Mentions légales updated, consent checkbox required before submission |

## Sources

- Direct codebase audit: `src/app/api/crm/*`, `src/app/api/contact/route.ts`, `src/lib/supabase.ts`, `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/translations.ts`, `src/app/mentions-legales/page.tsx` (HIGH confidence — primary source)
- `.planning/PROJECT.md`, `docs/strategie-seo-geo-llm-2026-09.md` (HIGH confidence — primary planning/strategy source for this project)
- [Multi-Step Forms: Improve Lead Capture & UX (Digioh)](https://www.digioh.com/blog/multi-step-forms) — form length/step benchmarks
- [How to Build a Multi-Step Qualification Quiz for B2B SaaS (Heyflow)](https://heyflow.com/blog/qualification-quiz-b2b-saas/) — screen count, contact-field placement
- [TOP 20 Multi-Step Form Abandonment Stats 2026 (amraandelma)](https://www.amraandelma.com/multi-step-form-abandonment-stats/) — abandonment percentages
- [B2B Lead Forms: How Many Fields Convert Best? (Brixon)](https://brixongroup.com/en/lead-forms-in-b2b-the-perfect-balancing-act-between-data-depth-and-conversion-rate) — field-count conversion drop-off
- [FAQ Rich Results Deprecated: Google's May 2026 Change (Passionfruit)](https://www.getpassionfruit.com/blog/what-changed-with-google-drops-faq-rich-results-and-what-to-do-now) — FAQPage rich-result deprecation timeline
- [Google Drops FAQ Rich Results From Search (Search Engine Journal)](https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/) — corroborating deprecation source
- [Hidden Prices, Lost Buyers: Why B2B SaaS Companies Should Embrace Transparency (Pace Pricing)](https://www.pacepricing.com/blog/hidden-prices-lost-buyers-why-b2b-saas-companies-should-embrace-transparency) — bounce-rate and pipeline-conversion stats for hidden pricing
- [When to Hide Pricing on a B2B SaaS Website 2026 (Success Knocks)](https://successknocks.com/when-to-hide-pricing-on-a-b2b-saas-website/) — corroborating no-pricing tradeoffs
- [Securing your API (Supabase Docs)](https://supabase.com/docs/guides/api/securing-your-api) — rate-limiting/RLS guidance for public write endpoints
- [Supabase Row Level Security: the Complete Guide (GuardLayer)](https://www.guardlayer.io/blog/supabase-row-level-security-complete-guide) — anon-key/RLS exposure model
- [Site redesign checklist to preserve SEO & improve visibility (Search Engine Land)](https://searchengineland.com/guide/site-redesign-seo-checklist) — redesign regression failure modes (redirects, headings, internal links)

---
*Pitfalls research for: Sèvalys v1.1 milestone — diagnostic simulator, no-pricing service pages, landing redesign*
*Researched: 2026-09-20*
