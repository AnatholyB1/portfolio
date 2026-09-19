# Project Research Summary

**Project:** Sèvalys v1.1 — diagnostic simulator, 4 new no-pricing service pages, simplified landing
**Domain:** Multi-step lead-qualification form + no-pricing marketing-agency service pages, integrated into an existing production Next.js 16 / React 19 / Supabase agency site
**Researched:** 2026-09-20
**Confidence:** MEDIUM-HIGH

## Executive Summary

This milestone adds three things to an existing, live Sèvalys marketing site: a linear diagnostic quiz that qualifies visitors and recommends 2-4 services without ever showing a price, four new no-pricing service pages (Community Management, Branding, Meta Ads, Google Ads), and a simplified/re-sequenced landing page. None of this requires new infrastructure — the app is already Next.js 16.1.6 / React 19.2.3 / Supabase, and every researcher independently converged on "extend existing conventions, add almost nothing new." The one genuinely new dependency worth adding is `zod`, used server-side only, to validate the nested enum-heavy diagnostic payload before it is written to Supabase. Wizard state should be plain `useReducer`, the recommendation logic a small pure function, and the submission path a dedicated Route Handler (`api/simulateur/route.ts`) mirroring the existing `api/contact/route.ts` pattern — never a direct client-to-Supabase insert.

The recommended approach is disciplined reuse: a new `services/[slug]` dynamic route with a shared template for all four service pages (avoiding four near-duplicate page shells), a French-only content file for long-form marketing copy (kept out of `translations.ts` per the project's own SEO strategy doc), and one new Supabase table (`prospects`/`diagnostic_leads`) added to the *same* Supabase project — explicitly not a reuse of the existing `orders`/`products`/`stock` demo schema, and explicitly not a second Supabase project. Architecture, features, and pitfalls research all independently flagged the same critical fact: the milestone brief's claim that the simulator will "reuse the existing CRM" is not true as written — there is no leads/prospects table today, only a demo bakery-inventory schema and a DB-less Resend contact form. This must be resolved as an explicit schema-design decision, not assumed, before any simulator code is written.

The two biggest risks are not technical, they are decision risks: (1) the milestone's "no price ever" wording says "existants + nouveaux," which — taken literally — strips pricing from pages that the project's own SEO research previously identified as a proven local competitive advantage (published prices converting well for two local competitors); this ambiguity needs an explicit answer before the landing/service-page phases start, not an assumption. (2) `createServerClient()` in this codebase uses the anon key despite its service-role-sounding name — a public, unauthenticated lead-capture endpoint that inherits this pattern unmodified would allow anyone to write junk (or scrape) directly against the Supabase REST API using the exposed anon key. A dedicated service-role client, INSERT-only RLS on the new table, server-side zod validation, and a honeypot/timing check are all required, not optional hardening deferred to later.

## Key Findings

### Recommended Stack

No framework or infra changes. The only new dependency is `zod` (server-only, zero client-bundle cost) for validating the nested/enum-heavy diagnostic payload before it's written to Supabase — hand-rolled guards (the existing `api/contact` style) don't scale well to this shape. Everything else — wizard state, submission endpoint, data client — reuses code and patterns already in the repo.

**Core technologies:**
- `useReducer`/`useState` (React 19, already installed): drives the multi-step wizard (`{ step, answers, status }`) — no form library needed; the flow is a fixed sequence of single/multi-choice steps, not free-text-heavy or dynamic.
- Next.js Route Handler (Next 16, already installed): `api/simulateur/route.ts` validates and inserts, matching the existing `api/contact`/`api/crm/*` convention exactly rather than introducing Server Actions as a second submission pattern.
- `@supabase/supabase-js` (already installed, `^2.104.1`): one new `.insert()` against a **new** table in the same project — no new SDK, no new project.
- `zod` (new, server-only): schema validation of the nested answers+contact payload; catches silent enum typos that would otherwise corrupt the recommendation logic and the CRM data permanently.

**Explicitly rejected:** `react-hook-form`/Formik (over-engineered for a linear choice-driven wizard), a rules-engine library (the recommendation logic is a ~30-line weighted-scoring function), `nuqs`/URL-synced step state (no deep-linking requirement), CAPTCHA (adds friction to a conversion-focused tool — use honeypot + timing check instead), a second Supabase project (must reuse the existing one).

### Expected Features

**Must have (table stakes):**
- Linear 5-8 question simulator with a visible progress indicator, one question per screen, mobile-first
- Contact-info capture placed *after* the qualifying questions and *before* the result (never as the first screen) — this is the single most consistently cited conversion factor across quiz-funnel research
- Personalized result mapping answers to 2-4 specific recommended services (never a generic "you need everything")
- RGPD-compliant consent block on the capture form (unticked checkbox, Art. 13 mention, retention note)
- Never a price, price range, or price comparison at any step of the simulator or on the 4 new service pages
- Each service page: pain framing → how-it-works → stakes → social proof (placeholder/shared acceptable given real content gap) → FAQ with schema.org markup → dual end CTA (simulator + direct contact)
- Landing re-sequenced: problems → services overview cards (linking out, not re-explaining) → how it works → stakes → social proof → CTA, with every pricing-pointing CTA re-routed

**Should have (competitive):**
- Direct-answer/citable content blocks under each H1/H2 on the new pages — explicitly called out as the highest ROI-per-effort item (no local competitor does GEO/AEO content today)
- Local anchoring in titles/H1s ("[Service] à Tours") — first-mover advantage, zero engineering cost
- Explicit copy distinguishing "Branding" (new) from "Rebranding + Site Premium" (existing bundle) to avoid self-cannibalization/confusion for both humans and AI crawlers

**Defer (v1.x / v2+):**
- Branching logic in the simulator (skip irrelevant questions) — real complexity jump, validate the linear version first
- Sector-aware question paths tied to future `/secteurs/*` pages — separate, unscoped workstream
- Visual "maturity score" result framing — cosmetic, not core
- A formal CRM/leads pipeline with stages and scoring — explicit anti-feature for this milestone's scale and stated "no functional changes to CRM" constraint

### Architecture Approach

Extend the existing App Router structure additively: a `services/[slug]` dynamic route with a shared template and a French-only `services-content.ts` content map (mirroring the SEO doc's own rule for long-form content living outside `translations.ts`); a new `/simulateur` page as a `'use client'` wizard holding all state locally and posting once, at completion, to a new `api/simulateur/route.ts`; and one new Supabase table added to the existing project, written only via a server-side service-role client, never via a direct browser insert.

**Major components:**
1. `services/[slug]/page.tsx` + shared section components (`ServiceHero`, `ServiceProblem`, `ServiceHowItWorks`, `ServiceStakes`, `ServiceFAQ`, `ServiceFinalCta`) — one template, per-service copy injected via `services-content.ts`
2. `simulateur/page.tsx` — client wizard (`useReducer`), no server round-trip per step, single POST at completion
3. `api/simulateur/route.ts` — validates (zod), inserts via service-role client into a new `prospects`/`diagnostic_leads` table, optional Resend notification to `contact@sevalys.com`
4. Navigation/discovery wiring — `Navbar`, `sitemap.ts`, `llms.txt`, per-page JSON-LD (`Service`/`FAQPage`/`BreadcrumbList`) — all manually maintained, easy to silently omit
5. Landing page — content/CTA re-sequencing on existing components, no new infrastructure, sequenced last for PM/review reasons (don't touch the money-facing page until the replacement funnel works)

### Critical Pitfalls

1. **"Reuse the existing CRM" is false as written** — there is no leads/prospects table; only a demo bakery schema and a DB-less contact form exist. Treat this as a schema-design task from scratch (new table, same project), and get explicit confirmation of what "existing CRM" actually meant before scoping the simulator phase.
2. **Blanket "no price ever" reverses a documented local SEO/conversion advantage** — the project's own SEO research flagged competitor pricing transparency as a proven local win. Resolve explicitly in requirements whether "no pricing" applies only to the 4 new services or also strips pricing from existing pages that currently rank/convert on price-related queries, before the landing/service-page phases start.
3. **Front-loaded contact fields kill completion** — asking for name/email/phone before the qualifying questions causes high immediate abandonment; sequence qualification → teaser recommendation → contact capture → full result, capped at ~5-7 steps.
4. **The anon-key write pattern is a real spam/scrape risk for a sales-lead table** — `createServerClient()` uses the anon key despite its name; the new leads table must use a service-role client server-side with INSERT-only RLS (no anon insert), plus honeypot + basic rate limiting, since a public multi-step tool advertised as the primary site CTA is a much more attractive bot target than the low-traffic contact form it inherits the pattern from.
5. **Long-form copy crammed into `translations.ts` bloats and degrades the i18n system** — the SEO doc already established the rule that long-form content (blog/secteurs) stays out of the 3-language translation system; apply the same rule to the 4 new service pages and simulator body copy, keeping only UI chrome (nav, buttons, step labels) in `translations.ts`.
6. **Per-page JSON-LD, sitemap.ts, and llms.txt entries are easy to silently omit** — none of these are enforced by the build; treat each as a required item in the same PR as every new route, not a separate "SEO cleanup" pass. Note Google deprecated FAQ rich results in May 2026 — the payoff for FAQPage schema here is AI/AEO citation, not a SERP rich snippet.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Scoping Decisions & Data Foundation
**Rationale:** Two critical ambiguities (the "reuse existing CRM" claim and the "existants + nouveaux" no-pricing scope) block every downstream phase and are decision problems, not engineering problems — resolving them first prevents rework. The Supabase schema is also a hard technical dependency: nothing else can be tested end-to-end without it.
**Delivers:** Explicit, documented decisions on (a) pricing scope (4 new services only vs. also existing service/landing pricing) and (b) lead-capture persistence approach; a new `prospects`/`diagnostic_leads` table in the existing Supabase project with INSERT-only anon-blocked RLS, documented DDL (no migration tooling exists in this repo today — document the DDL directly since there's no other source of truth).
**Addresses:** FEATURES.md's flagged "unresolved dependency" on lead-capture persistence; PITFALLS #1 and #2.
**Avoids:** Building the simulator or removing pricing before the underlying ambiguities are settled — the single highest-cost mistake to make late.

### Phase 2: Simulator Backend (API + Security)
**Rationale:** The submission endpoint has no UI dependency and can be built/tested with curl before any wizard exists; building security in from the start (not retrofitted) is explicitly flagged across STACK, ARCHITECTURE, and PITFALLS research as non-negotiable for a public lead-capture endpoint.
**Delivers:** `api/simulateur/route.ts` — zod-validated payload, service-role Supabase client (distinct from the existing anon-key `createServerClient()`), honeypot + submit-timing spam check, weighted-scoring recommendation function, optional Resend notification email.
**Uses:** `zod` (new dependency), `@supabase/supabase-js` service-role pattern.
**Avoids:** PITFALLS #4 (spam/abuse via inherited anon-key pattern) and the "form validated with hand-rolled guards" gap for a nested enum-heavy payload.

### Phase 3: Service Pages (Template + Content)
**Rationale:** Has no dependency on the simulator and is lower-risk/more mechanical (content authoring + shared template) than the schema/API work — can run in parallel with Phase 2 if resourced separately, but the simulator's recommendation step needs finalized service slugs, so this should complete before or alongside Phase 4.
**Delivers:** `services/[slug]/page.tsx` dynamic route with shared section components, `services-content.ts` (French-only, outside `translations.ts`), per-page `Service`/`FAQPage`/`BreadcrumbList` JSON-LD distinct from the root layout's schema, direct-answer content blocks, dual end-of-page CTAs, no pricing anywhere.
**Implements:** ARCHITECTURE.md Pattern 1 (per-service dynamic route with shared template + content map).
**Avoids:** PITFALLS #5 (i18n bloat), #6 (missing page-level JSON-LD), and the "4x copy-pasted template with only nouns swapped" technical-debt pattern (near-duplicate content risk).

### Phase 4: Simulator Frontend (Wizard UI)
**Rationale:** Depends on Phase 2's endpoint existing and benefits from Phase 3's finalized service slugs (the result step links to specific service pages).
**Delivers:** `/simulateur` page — `useReducer`-driven multi-step wizard, one question per screen, progress indicator, contact capture positioned after qualifying questions and before the full result, RGPD consent checkbox linked to an updated mentions-légales section, result screen with recommended services + single dual-channel CTA.
**Addresses:** FEATURES.md table-stakes simulator requirements; the "teaser then unlock" flow pattern from PITFALLS #3.
**Avoids:** PITFALLS #3 (front-loaded contact fields) and #10 (missing consent/privacy disclosure).

### Phase 5: Navigation, Discovery & Landing Simplification
**Rationale:** Wiring new routes into navigation/sitemap/llms.txt and re-sequencing the landing page are both content/integration tasks with no hard technical dependency on each other, but both should happen only once the pages they link to are real and reviewable — avoids shipping dead links or repointing CTAs to pages that don't exist yet. Sequenced last for review-safety reasons (don't touch the money-facing landing page until the replacement funnel is verified working), not technical necessity.
**Delivers:** Navbar update (dropdown vs. index-page decision for services), `sitemap.ts` and `llms.txt` entries for all new routes, a full audit of every `/#anchor` cross-page reference before/after the landing redesign, re-sequenced landing sections (problems → services → how it works → stakes → social proof → CTA) with every pricing-pointing CTA re-routed to the simulator or direct contact.
**Avoids:** PITFALLS #7 (sitemap omissions) and #8 (broken cross-page anchors from renamed landing sections) — both explicitly called "silent, invisible in normal QA" failure modes.

### Phase Ordering Rationale

- Decisions and data-layer work (Phase 1) must precede everything else because two separate research streams (FEATURES and PITFALLS) independently identified the same blocking ambiguity — building on an assumed schema or an unresolved pricing-scope decision risks expensive rework.
- Backend-before-frontend (Phase 2 before Phase 4) matches the codebase's own established convention (every existing Supabase write goes through a server route) and lets the security-sensitive code be built and reviewed in isolation, testable via curl before any UI exists.
- Content/template work (Phase 3) is deliberately decoupled from the simulator's backend work so it can proceed in parallel, while still gating the simulator's frontend (Phase 4) since the result step needs real service page slugs to link to.
- Discovery/navigation wiring and the landing redesign are grouped last (Phase 5) because both are explicitly flagged as "easy to silently omit" integration tasks that should happen once, comprehensively, against a stable set of finished pages — rather than being dribbled in per-page and forgotten.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Supabase RLS/service-role behavior for a public-write lead table was assessed as MEDIUM confidence in STACK.md ("general Supabase platform knowledge... not project-specific verified" — actual RLS policies on the live project were not inspected). Verify current RLS posture on `products`/`orders`/`stock` via the Supabase dashboard/MCP before designing the new table's policy.
- **Phase 2:** Spam/rate-limiting approach (honeypot + timing check vs. Supabase-recommended rate-limit table vs. edge-level check) has multiple viable options in the research with no single settled recommendation — worth a short focused look during planning.

Phases with standard patterns (skip research-phase):
- **Phase 3:** The dynamic-route + content-map pattern is thoroughly documented in ARCHITECTURE.md with a working code example and direct precedent in this exact codebase's own conventions.
- **Phase 4:** `useReducer` wizard pattern is explicitly precedented by `calculateur-roi/page.tsx` already in this codebase — no external research needed.
- **Phase 5:** Sitemap/llms.txt/anchor-audit tasks are mechanical, codebase-specific checklist items, not research questions.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified live against npm registry; existing codebase conventions verified by direct source reading. Only the Supabase RLS/service-role semantics are flagged MEDIUM as applied to this specific project. |
| Features | MEDIUM | Quiz-funnel mechanics and RGPD form rules are cross-verified across multiple sources (MEDIUM-HIGH); no-pricing agency-page structure is verified generally but genre-specific case studies for the exact 4 new services were thin (MEDIUM). Codebase-dependency findings are HIGH (direct code read). |
| Architecture | HIGH | All findings verified by reading the actual codebase — this was an integration question, not an ecosystem-uncertainty question. One flagged MEDIUM item: Next.js 15+ async-params/fetch-caching behavior stated from training knowledge, not spot-checked against release notes (low relevance here since no new SSR data-fetching is planned). |
| Pitfalls | HIGH (codebase-grounded) / MEDIUM (external benchmarks) | Codebase audit findings (no leads table, anon-key pattern, manual sitemap, root JSON-LD) are HIGH — direct inspection. External UX/conversion statistics (form abandonment %, pricing-page bounce rates) are MEDIUM — cross-checked across sources but some single-source stats. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **"Existing CRM" scope:** Whether stakeholders meant "same Supabase project" (confirmed feasible) or "same table" (confirmed impossible as designed) needs a direct answer during requirements, not an inference — flagged identically by FEATURES, ARCHITECTURE, and PITFALLS research independently.
- **Pricing-removal scope ("existants + nouveaux"):** Needs an explicit decision recorded before Phase 5 (landing) and before touching any existing service page pricing — the alternative (indicative ranges/"à partir de X€") should be considered rather than full removal, per PITFALLS #2's cited bounce/conversion tradeoffs.
- **Live RLS state on `products`/`orders`/`stock`:** Not inspected directly during this research round (STACK.md and PITFALLS.md both flag this) — check via Supabase dashboard/MCP before finalizing the new table's RLS policy design in Phase 1.
- **i18n boundary for new content:** ARCHITECTURE.md provides a clear recommendation (long-form content outside `translations.ts`, French-only) but this is a project-specific policy decision that should be explicitly ratified (not just inferred from research) since it deviates from how the existing `/services` page currently works.
- **Real per-service social proof:** Community Management, Branding, Meta Ads, and Google Ads likely have zero existing client case studies as standalone offers — Phase 3 will need an explicit placeholder/shared-proof strategy rather than fabricated case studies, to be revisited once first clients are onboarded (v1.x).

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `package.json`, `src/lib/supabase.ts`, `src/app/api/contact/route.ts`, `src/app/api/crm/{products,orders,stock}/route.ts`, `src/components/sections/ContactSection.tsx`, `src/app/services/page.tsx`, `src/app/calculateur-roi/{page,layout}.tsx`, `src/lib/translations.ts`, `src/context/LanguageContext.tsx`, `src/components/ui/ClientProviders.tsx`, `src/components/layout/Navbar.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/layout.tsx`, `src/app/mentions-legales/page.tsx`
- `.planning/PROJECT.md`, `.planning/STATE.md`, `docs/strategie-seo-geo-llm-2026-09.md` (project-authored SEO strategy doc, incl. 2026-09-20 addendum specific to this milestone)
- Live npm registry queries (2026-09-20): `zod@4.6.5`, `@supabase/supabase-js@2.116.0`, `react-hook-form@7.88.0`, `nuqs@2.10.1`
- CNIL — RGPD en pratique (https://www.cnil.fr/fr/rgpd-en-pratique-maitrisez-votre-relation-client) — official French regulator source
- Supabase Docs — Securing your API (https://supabase.com/docs/guides/api/securing-your-api)

### Secondary (MEDIUM confidence)
- Quiz-funnel/lead-gen mechanics: Marquiz, Digioh, landerlab.io, Perspective, Pyrsonalize, Skeepers — cross-checked across sources on question count, form placement, completion rates
- Multi-step form abandonment/field-count benchmarks: Digioh, Heyflow, amraandelma, Brixon
- No-pricing B2B agency page tradeoffs: Pace Pricing, Success Knocks, Salestudia, AdStellar, Opascope
- FAQPage/Google rich-results deprecation: Passionfruit, Search Engine Journal (corroborating sources)
- French RGPD form/consent specifics: donneespersonnelles.fr (Art. 13 mentions, Aug 2026 cold-call consent tightening)
- Supabase RLS/anon-key exposure model: GuardLayer

### Tertiary (LOW confidence)
- Exact bounce-rate/pipeline-conversion percentages for hidden vs. transparent pricing pages — single-source stat (Pace Pricing), directionally corroborated elsewhere but not independently re-verified

---
*Research completed: 2026-09-20*
*Ready for roadmap: yes*
