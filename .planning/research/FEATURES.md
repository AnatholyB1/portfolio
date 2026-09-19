# Feature Research

**Domain:** Lead-qualification diagnostic simulator + no-pricing marketing-agency service pages (B2B/local-service SMB agency, Sèvalys, Tours)
**Researched:** 2026-09-20
**Confidence:** MEDIUM — quiz-funnel mechanics and RGPD form rules are well-documented and cross-verified (MEDIUM-HIGH); no-pricing agency service-page structure is verified across multiple sources but genre-specific case studies for the exact 4 new services (Community Management, Branding, Meta Ads, Google Ads) were thin, so those specifics lean toward general agency-page best practice (MEDIUM). Codebase-dependency findings (below) are HIGH confidence — verified by direct code read.

## Codebase Reality Check (read before using this document)

Direct code inspection changes two assumptions baked into `PROJECT.md` / the SEO addendum:

1. **There is no existing "leads" or "prospects" table.** `src/lib/supabase.ts` only wraps a generic Supabase client used by `src/app/api/crm/{products,orders,stock}/route.ts` — this is the `/demo` **bakery inventory CRM** built for the Feuillette client pitch, not a sales pipeline. The milestone text ("réutiliser le CRM Supabase existant") is **not accurate as written** — there is no compatible schema to reuse today. This is a real open decision, not a given, and should be resolved explicitly in requirements/roadmap, not assumed.
2. **The only existing prospect-capture flow is `src/app/api/contact/route.ts`**, which sends two transactional emails via Resend (confirmation to the prospect + notification to `contact@sevalys.com`). It writes **nothing to a database** — no persistence, no CRM record. This is the lowest-friction precedent to extend for the simulator.
3. **`/calculateur-roi`** (`src/app/calculateur-roi/page.tsx`) is a 100%-client-side interactive tool (sliders/inputs, no backend) that already **shows a price** (`prixMensuel: 499`) as part of its ROI math for the existing AI voice agent offer. It's useful architectural precedent for "interactive tool as its own page" (matches the SEO doc's `/simulateur` pillar-page idea), but its price-revealing behavior is exactly what the new simulator must **not** copy.

## Feature Landscape

### Table Stakes (Users Expect These)

#### Simulator / diagnostic

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Short, linear question flow (5–8 questions) | Industry data: completion drops ~5–10% per question past 8; below 5 the result feels generic (MEDIUM confidence, multiple quiz-funnel sources) | LOW | Fixed order is enough for v1; branching is a differentiator, not required |
| Progress indicator (e.g. "3/6") | Standard multi-step form UX; sets expectation of a short commitment | LOW | Trivial with a controlled React state machine, no library needed |
| One question per screen, mobile-first | Most agency-site traffic is mobile; matches existing site's clean single-focus sections | LOW | Consistent with existing design system patterns already in the codebase |
| Lead-capture form placed **between last question and result**, not before | Documented best-converting placement — value exchange (get your recommendation) happens right when the ask is made | LOW-MEDIUM | Must not gate the quiz itself behind an email wall; only gate the *result* |
| Personalized result referencing the visitor's actual answers (not a generic "you need everything") | Generic output "kills trust" per quiz-funnel sources; also matches milestone's own goal of narrowing to a *subset* of services | MEDIUM | Requires an answer → service-subset mapping table; depends on final service catalog |
| RGPD-compliant consent block on the capture form | Legal requirement, not optional, for any French B2B/B2C site collecting contact data | LOW-MEDIUM | Unchecked box for secondary purpose only (no pre-ticked boxes), Art. 13 mention (identity of controller, purpose, legal basis, retention, rights), no phone-call consent implied unless explicitly opted in — relevant given the Aug 2026 cold-call consent tightening |
| Single, unambiguous next action on the result screen | Multiple competing CTAs measurably reduce conversion (A/B-tested finding across sources) | LOW | Milestone wants "call OR email" — treat both as *one* action ("contactez-nous") presented as two channels, not two competing goals |
| Never displays a price, price range, or price comparison at any step | Explicit, non-negotiable milestone constraint | LOW | This is the single hardest constraint to enforce by habit — flag in every result-copy review |

#### Service pages (Community Management, Branding, Meta Ads, Google Ads)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Problem/pain framing above the fold, before any feature list | Standard no-pricing agency page pattern; matches milestone's own stated ordering (problème → fonctionnement → enjeux) | LOW | Copy-driven, no new component pattern needed if services page components are reusable |
| "How it works" process section (3–4 steps) | Substitutes for pricing transparency — sets expectations of engagement shape without a number | LOW-MEDIUM | Matches existing site convention (methodology-style section already exists for landing) |
| "Stakes / why it matters" section (cost of inaction, framed in business terms) | Standard differentiation from feature-listing competitor pages; also matches milestone wording explicitly | LOW | Content-only |
| At least one case study or testimonial per page | Universal agency-page trust signal | MEDIUM | **Real content gap today**: SEO doc confirms zero visible reviews and no artisan/service-vertical case study; Meta Ads/Google Ads/CM/Branding as *new* offers likely have **no existing client case study at all** — may need a shared testimonials block or "coming soon" framing rather than a fabricated case study |
| FAQ block per page | Trust/objection-handling table stake; **also an explicit SEO/AEO requirement** (`FAQPage` schema per new page, per the SEO doc) | LOW-MEDIUM | Content-only, schema.org markup already established elsewhere on the site |
| Dual end-of-page CTA: "Faire le diagnostic" (simulator) + "Appeler / Écrire" | Explicit milestone requirement, also standard no-pricing-page pattern (book-a-call in lieu of price) | LOW | Depends on simulator existing/being linkable |
| Mobile-responsive, consistent with existing design system | Baseline for any new page on this site | LOW | Existing CSS-var design system and component patterns apply directly |

#### Landing page (simplified)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Ordering: problems solved → services overview → how it works → stakes → social proof → CTA | Explicit milestone requirement, also matches general landing-page best practice (problem before solution) | LOW-MEDIUM | Mostly a re-sequencing/content edit of existing sections, not new components |
| Every CTA points to simulator or direct contact, never to pricing | Explicit milestone requirement | LOW | Requires an audit of current landing CTA hrefs — some likely point into `/services#pricing`-style anchors today and need re-pointing |
| Social proof section reusing existing réalisations (Feuillette, Gecko Cabane, Les Folies Temps Danse) | Already built (`Realisations.tsx`), just needs to be surfaced as landing social proof rather than testimonials-heavy | LOW | Testimonials specifically are a **gap** — no visible reviews yet per SEO doc; can't fabricate them |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Branching logic (skip irrelevant questions based on earlier answers, e.g. skip "avez-vous déjà un site" follow-ups if answered "non") | Feels more intelligent/tailored, mirrors what better-funded quiz tools do | MEDIUM-HIGH | Real complexity jump vs. linear v1 — worth deferring to v1.x once the linear version is validated |
| Sector-aware question set (restaurant / commerce / école / artisan) tying into the SEO doc's planned `/secteurs/*` pages | Reinforces topical authority and reuses vertical proof points Sèvalys already has (3 of 4 verticals have real case studies) | MEDIUM | **Not required by this milestone's 3 explicit deliverables** — `/secteurs/*` pages are a separate SEO workstream mentioned only as future/adjacent in the addendum; don't scope-creep into building them here |
| Direct-answer block (2–3 citable sentences) under each H1/H2 of every new service page | Explicit differentiator per SEO doc — **no local Tours competitor does GEO/AEO content today** (verified as a "blue ocean" in the SEO doc's competitive audit) | LOW | Pure content discipline, no new engineering; highest ROI-per-effort item in this entire feature set |
| Explicit scope note distinguishing "Branding" (new standalone service) from "Rebranding + Site Premium" (existing bundled offer) | Prevents self-cannibalization/confusion for both humans and AI answer engines that will crawl both pages | LOW | One clear paragraph on the Branding page; a genuine differentiator only because the ambiguity is self-inflicted and easy to fix |
| Local anchoring pattern in title/H1 ("[Service] à Tours · [bénéfice]") consistently across all 4 new pages | No local competitor (per SEO doc's competitive audit) has dedicated Meta Ads / CM pages at all — first-mover local SEO advantage | LOW | Pure content/metadata discipline |
| Visual "maturity score" or progress-style result framing (e.g. a simple bar/percentage) rather than plain text recommendation | More memorable/shareable, reinforces the "diagnostic" framing already chosen for the feature name | MEDIUM | Nice-to-have; don't let this become a scoring/analytics system — keep it a single visual, not a stored metric |
| The `/simulateur` page itself written as a citable, explanatory pillar page wrapping the interactive tool (not just a bare form) | Explicit SEO doc strategy: highly citable by ChatGPT/Perplexity/AI Overviews for "quels outils digitaux pour mon commerce" type queries | LOW-MEDIUM | Content architecture decision — the interactive quiz is one section of a larger static page, not the whole page |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Auto-quote / instant price estimate in the simulator result (mirroring `/calculateur-roi`'s existing pattern) | Feels natural since the codebase already has an interactive-calculator precedent that shows a number | Directly violates the milestone's core, explicit constraint ("jamais de prix"); `/calculateur-roi` shows a price for a *different, existing* offer and must not be treated as a template for the new tool | Show a recommended service subset + one clear CTA to talk to a human; price only ever discussed on a call/email |
| Contact-info wall before the first question | Common in aggressive lead-gen funnels | Kills completion — visitor has no reason to trade an email before seeing any value; contradicts documented best-converting placement (info ask *after* questions, *before* result) | Ask for contact info only once, right before revealing the personalized result |
| Generic "you need everything" recommendation regardless of answers | Tempting shortcut to avoid building a real mapping logic, and superficially maximizes upsell surface | Feels like a sales pitch, destroys the trust the diagnostic framing is trying to build; directly undermines the milestone's stated goal of recommending a *subset* | Build even a simple rule table (5–8 questions → 2–4 service recommendations max) rather than mapping everything to everything |
| Full CRM lead-pipeline (stages, scoring persisted over time, lead routing, nurture sequences) | Seems like the "proper" way to handle new leads once you're capturing them | Massive scope creep for a single small-agency add-on feature; explicitly outside this milestone's "no functional changes to CRM or VAPI" constraint; no existing schema to build on (see Codebase Reality Check) | Extend the existing Resend-based `/api/contact` pattern (or a single new minimal Supabase table if persistence is truly wanted) — resolve as one explicit decision, not an assumption |
| Conversational AI/chatbot instead of a structured quiz for qualification | Feels more "on-brand" for an AI-forward agency | Effectively a second VAPI-style build (NLU, prompt design, escalation handling) — far higher complexity than a form-based quiz for the same qualification outcome, and out of scope per the milestone's own constraints | Structured multi-step quiz; reserve conversational AI framing for the existing phone-agent demo, which already does this job |
| Live/real-time ad-account dashboards or campaign-metrics widgets embedded on the Meta Ads / Google Ads service pages | Superficially demonstrates capability ("look, real data") | Requires real API integrations with Meta/Google Ads platforms per visitor or per client — huge complexity, security/OAuth surface, and totally unrequested; also conflicts with page's identity as a sales page, not a client tool (that's what `/demo` is for) | Static or lightly-animated illustrative graphics; save live dashboards for actual client-facing tooling if ever built |
| Pricing table, "à partir de X€/mois," or side-by-side price comparison anywhere on the 4 new pages or landing | Visitors and even internal stakeholders may reflexively want a price anchor "for transparency" (note: several *local competitors* do publish prices and convert well on it, per the SEO doc) | Explicitly forbidden by this milestone regardless of competitor behavior; showing price on some pages (`/services`, unchanged) and not others is already the deliberate design — don't blur that by adding a price anywhere new | Push every pricing-curious visitor to the simulator or direct contact; `/services` remains the only page where existing offer pricing lives, and that page is explicitly out of scope for this milestone |
| Turning the simplified landing page into a long-scroll page duplicating all 8 services' full content | Feels safer ("more information can't hurt") | Directly contradicts the milestone's explicit "simplified landing" principle; also duplicates content that should live once on each service page (SEO risk: near-duplicate content hurts both pages) | Landing shows short service *cards* linking out to each dedicated page; full explanation lives once, on the service page |

## Feature Dependencies

```
[4 new service pages: copy finalized]
    └──requires──> [Simulator: answer → service-subset recommendation mapping]
                       └──requires──> [Simulator: linear question flow v1]

[Simplified landing page: service overview cards]
    └──requires──> [4 new service pages exist at stable routes]
                       (existing 4 services already have stable routes on /services)

[Simulator: lead capture at result step]
    └──requires──> [Decision: extend /api/contact (Resend, no DB) vs. new Supabase leads table]
                       (currently UNRESOLVED — see Codebase Reality Check)

[FAQPage schema + direct-answer blocks per service page] ──enhances──> [SEO/AEO goals from strategie-seo-geo-llm doc]

[Branching logic in simulator] ──enhances──> [Linear v1 simulator] (not required for it)

[/secteurs/* sector pages] ──conflicts with scope of──> [This milestone's 3 explicit deliverables]
    (mentioned in SEO addendum as adjacent future work, not one of the 3 targets — do not build under this milestone)

[Auto price estimate in simulator result] ──conflicts──> [Milestone constraint: never show a price]
```

### Dependency Notes

- **Service pages must exist before the simulator's recommendation logic is meaningful:** the simulator's whole value is "here are the 2–4 services that fit you" — those need stable page URLs and finalized positioning (especially Branding vs. the existing "Rebranding + Site Premium" offer) before the mapping table can be written with confidence.
- **The lead-capture mechanism is a real, unresolved dependency, not a solved one:** both the simulator's result-step form and (implicitly) the new service pages' contact CTAs assume *some* persistence/notification path. Today only `/api/contact` (Resend email, no DB) exists. This should be decided once, early, and reused everywhere — not solved separately per feature.
- **Landing simplification depends on the 4 service pages existing first** (or at least being scheduled in the same phase): the landing's "service overview" section is meant to link out to full pages rather than explain services itself, so sequencing landing after/alongside the service pages avoids a temporary broken/incomplete state.
- **Branching logic and sector-aware question paths enhance but do not block the linear v1 simulator** — safe to defer without blocking launch.
- **`/secteurs/*` pages and the auto-price-estimate pattern both conflict with this milestone's scope/constraints** — flagged explicitly so the roadmap doesn't accidentally absorb them.

## MVP Definition

### Launch With (v1)

- [ ] Linear 5–8 question simulator, single fixed path, result maps to 2–4 recommended services — validates the core "qualify without pricing" concept
- [ ] Lead-capture form at result step, wired to whichever persistence decision is made (Resend extension is the lowest-effort default given existing precedent)
- [ ] RGPD-compliant consent block on that form (unticked checkbox, Art. 13 mention, retention note)
- [ ] 4 new service pages, each with: pain framing, how-it-works, stakes, at least placeholder/shared social proof, FAQ block with schema.org markup, dual end CTA — no pricing anywhere
- [ ] Landing page re-sequenced to problems → services overview (cards linking out) → how it works → stakes → social proof → CTA to simulator/contact, all pricing-pointing CTAs re-routed
- [ ] Direct-answer citable blocks under each new page's key headings (cheap, high SEO/AEO leverage — don't defer this)

### Add After Validation (v1.x)

- [ ] Branching logic in the simulator (skip irrelevant questions) — add once linear version's completion/conversion data justifies the complexity
- [ ] Sector-aware question variants tied to `/secteurs/*` pages — only once those pages exist (separate workstream)
- [ ] Visual maturity-score framing on the result screen — cosmetic enhancement, not core to the qualification logic
- [ ] Real per-service case studies for Community Management, Branding, Meta Ads, Google Ads as first clients are onboarded — replacing shared/placeholder social proof

### Future Consideration (v2+)

- [ ] Formal leads/CRM pipeline with stages and scoring, if lead volume from the simulator justifies moving beyond email notifications
- [ ] A/B testing of simulator question wording/order and result-page CTA copy
- [ ] Extending the diagnostic simulator into a documented `/secteurs/*` cross-linking strategy, per the SEO doc's medium-term plan

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Linear simulator (5–8 Q, mapping to 2–4 services) | HIGH | MEDIUM | P1 |
| Lead-capture + persistence decision | HIGH | LOW-MEDIUM (once decided) | P1 |
| 4 no-pricing service pages (core sections) | HIGH | MEDIUM | P1 |
| FAQPage schema + direct-answer blocks | HIGH (SEO/AEO) | LOW | P1 |
| Landing re-sequencing + CTA re-routing | HIGH | LOW-MEDIUM | P1 |
| RGPD consent block | HIGH (legal) | LOW | P1 |
| Branching logic in simulator | MEDIUM | HIGH | P2 |
| Sector-aware question paths | MEDIUM | MEDIUM-HIGH | P3 (blocked on `/secteurs/*`) |
| Visual maturity-score result | LOW-MEDIUM | MEDIUM | P3 |
| Real per-service case studies | HIGH (once available) | N/A (content, not code) | P2 (opportunistic) |
| Formal CRM/leads pipeline | LOW at current scale | HIGH | P3 / defer |

## Competitor Feature Analysis

| Feature | Local Tours agencies (KBCOM, ConvertiLab, etc.) | National AI-voice competitors (Nerolia, AirAgent) | Our Approach |
|---------|--------------------------------------------------|-----------------------------------------------------|--------------|
| Published pricing | Yes — publish prices, converts well locally (per SEO doc) | Mixed (AirAgent self-serve pricing, others opaque) | Deliberately opposite: no price on landing/new service pages/simulator; price stays only on existing `/services` |
| Interactive qualification tool | None identified locally | None identified with a diagnostic-quiz format | First-mover locally for a structured diagnostic simulator |
| GEO/AEO content (FAQ schema, direct-answer blocks) | None identified | Strong generic content but no local anchoring | Combine both: local anchoring + AEO-formatted content per new page |
| Community Management / Meta Ads as standalone offer pages | Not identified as dedicated pages | N/A (different vertical) | Dedicated pages per the SEO doc's addendum — genuine local gap |
| Case studies / social proof | Google reviews present for some (KBCOM, ConvertiLab) | Active blogs, less local proof | Sèvalys has real named case studies (Feuillette, Gecko Cabane, Les Folies Temps Danse) but zero visible reviews — reviews collection flagged as a parallel, non-blocking SEO action item |

## Sources

- [15 Best Quiz Funnel Examples & Templates](https://www.marquiz.io/blog/15-best-free-quiz-funnel-examples-templates) — MEDIUM
- [How to Use Quizzes for Lead Generation: A High-Intent Strategy | Digioh](https://www.digioh.com/blog/lead-generation-quiz) — MEDIUM
- [7 Types of Lead Generation Quizzes | landerlab.io](https://landerlab.io/blog/lead-generation-quizzes) — MEDIUM
- [Best Quiz Funnel Software (2026) | Perspective](https://www.perspective.co/article/quiz-funnel-software) — MEDIUM (question count, results-page CTA, lead-form placement findings sourced here, cross-checked against other quiz-funnel guides)
- [Quiz Funnel: The Ultimate B2B Lead Generation Guide | Pyrsonalize](https://pyrsonalize.com/blog/how-to-create-a-lead-generation-quiz-funnel/) — MEDIUM
- [Comment qualifier ses prospects grâce au quiz marketing? | Skeepers](https://skeepers.io/fr/blog/qualifier-prospects-questionnaire-quiz/) — MEDIUM (10–12 question guidance for scoring-type quizzes; used to sanity-check against the 5–8 range for a *diagnostic*, not scoring, quiz)
- [Google Ads Landing Page: Structure and Mistakes | Salestudia](https://www.salestudia.de/en/blogs/news/google-ads-landing-page-structure-common-mistakes) — MEDIUM (no-pricing "Book a Call" pattern for Google Ads agencies)
- [Meta Ads for Service Based Business | AdStellar](https://www.adstellar.ai/blog/meta-ads-for-service-based-business) — MEDIUM
- [How to Evaluate a Meta Ads Agency: 10 Buyer Questions | Opascope](https://opascope.com/insights/meta-ads-agency/) — MEDIUM (generic-selling-point trap: "senior team, custom strategy, transparent reporting" are undifferentiated — used to justify the direct-answer/local-anchoring differentiator)
- [Agency Case Studies: How to Craft Client Stories That Sell Your Services | Instapage](https://instapage.com/blog/digital-agency-case-studies) — MEDIUM
- [You can't handle the proof: brand case studies as social proof | Fabrik Brands](https://fabrikbrands.com/brand-case-studies/) — MEDIUM
- [Mon Diag'Num | CCI Paris Ile-de-France](https://www.entreprises.cci-paris-idf.fr/offres/mon-diagnostic-de-maturite-numerique) — MEDIUM (French precedent for a free digital-maturity diagnostic tool aimed at TPE/PME)
- [Diagnostic numérique | francenum.gouv.fr](https://www.francenum.gouv.fr/guides-et-conseils/strategie-numerique/diagnostic-numerique) — MEDIUM
- [Formulaire contact RGPD : 7 mentions + modèle 2026 | donneespersonnelles.fr](https://www.donneespersonnelles.fr/formulaire-contact-rgpd) — MEDIUM-HIGH (Art. 13 mentions, consent-checkbox rules)
- [RGPD en pratique | CNIL](https://www.cnil.fr/fr/rgpd-en-pratique-maitrisez-votre-relation-client) — HIGH (official regulator source)
- [Prospection commerciale RGPD 2026 | donneespersonnelles.fr](https://www.donneespersonnelles.fr/prospection-commerciale-rgpd) — MEDIUM-HIGH (Aug 2026 cold-call consent tightening)
- Direct codebase inspection: `src/app/api/contact/route.ts`, `src/lib/supabase.ts`, `src/app/api/crm/*/route.ts`, `src/app/calculateur-roi/page.tsx` — HIGH confidence, first-party verification
- `.planning/PROJECT.md` and `docs/strategie-seo-geo-llm-2026-09.md` (section 9 addendum) — project source of truth for scope and SEO framing

---
*Feature research for: Sèvalys v1.1 — diagnostic simulator, 4 new no-pricing service pages, simplified landing*
*Researched: 2026-09-20*
