# Roadmap: BRICON ANATHOLY Portfolio

## Milestones

- ✅ **v1.0 — Visual Redesign (Selenium Phase 02)** — Phases 1-4 (shipped 2026-05-18)
- 🚧 **v1.1 — Extension de l'offre & refonte commerciale** — Phases 5-9 (in progress)

## Phases

<details>
<summary>✅ v1.0 — Visual Redesign (Selenium Phase 02) (Phases 1-4) — SHIPPED 2026-05-18</summary>

- [x] Phase 1: Design System Foundation (5/5 plans) — completed 2026-05-15
- [x] Phase 2: Landing Page Rebuild (6/6 plans) — completed 2026-05-17
- [x] Phase 3: Services Page Rebuild (6/6 plans) — completed 2026-05-18
- [x] Phase 4: Rethemes + QA (4/4 plans) — completed 2026-05-18

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 — Extension de l'offre & refonte commerciale (In Progress)

**Milestone Goal:** Étendre le catalogue de services Sèvalys à 9 offres, retirer tout affichage de prix du site, ajouter un simulateur de diagnostic qui qualifie et capture les prospects, et intégrer la stratégie SEO/GEO/AEO — sans jamais afficher de prix nulle part.

- [x] **Phase 5: Prospect Capture Backend** - New Supabase prospects table + insert-only RLS + spam guard + Resend notification, built and testable independently of any UI (completed 2026-09-20)
- [x] **Phase 6: Service Pages (Template + Content)** - 9 dedicated, price-free, citable service pages replacing the current pricing-heavy `/services` (completed 2026-09-20)
- [x] **Phase 7: Diagnostic Simulator** - Branching qualification quiz → 2-4 service recommendations → RGPD-compliant prospect capture → single dual-channel CTA (completed 2026-09-20)
- [x] **Phase 8: Landing Simplification & Pricing Policy** - Landing re-sequenced and re-CTA'd, all pricing removed site-wide (service pages, landing, simulator, calculateur-roi) (completed 2026-09-21)
- [ ] **Phase 9: SEO & Discovery Wiring** - Sitemap/llms.txt entries, per-offer schema.org Service objects, and a broken-link audit for the new route structure

## Phase Details

### Phase 5: Prospect Capture Backend

**Goal**: A secure backend exists to receive and store diagnostic-simulator submissions as qualified prospects, in a new Supabase table dedicated to this milestone — no changes to the existing CRM schema (products/orders/stock) or VAPI integration.
**Depends on**: Nothing (independent of Phase 6; can be built and curl-tested before any UI exists)
**Requirements**: CRM-01, CRM-02, CRM-03, CRM-04
**Success Criteria** (what must be TRUE):

  1. Simulator submissions are persisted in a new, dedicated Supabase table — separate from the existing products/orders/stock demo schema
  2. The public write path allows inserts only (RLS insert-only) — no anonymous read, update, or delete of prospect records
  3. Automated/bot submissions (honeypot-filled or too-fast) are rejected before being written to the database
  4. Every new prospect submission triggers a Resend email notification to the Sèvalys team

**Plans**: 4 plans

Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Install zod + vitest, extract the prospect payload schema and spam predicate into src/lib/prospects-schema.ts
- [x] 05-02-PLAN.md — Write and apply the prospects table migration: RLS with zero anon grants + 12-month pg_cron purge

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-03-PLAN.md — Service-role Supabase client + POST /api/simulateur (spam guard, insert, Resend notification) + unit tests

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 05-04-PLAN.md — Live end-to-end verification: bundle-leak gate, curl checklist, anon RLS denial, notification confirmation

### Phase 6: Service Pages (Template + Content)

**Goal**: Every one of the 9 offers (5 existing + 4 new) has its own dedicated, price-free, citable presentation page, replacing the current pricing-heavy `/services` single page.
**Depends on**: Nothing (independent of Phase 5; can run in parallel)
**Requirements**: SVC-01, SVC-02, SVC-03, SVC-04, SVC-05, SVC-06
**Success Criteria** (what must be TRUE):

  1. Visiting `/services` shows an index listing all 9 services, each linking to its own dedicated `/services/[slug]` page
  2. Each of the 9 service pages follows problème résolu → fonctionnement → enjeux → preuve sociale → FAQ → double CTA (simulateur/contact), with no price anywhere
  3. The Branding page content explicitly distinguishes its scope from the existing "Rebranding + Site Premium" offer
  4. Each service page's FAQ is marked up with schema.org `FAQPage` and includes a directly citable answer block under its key headings (H1/H2)
  5. All service page copy lives in the fr/en/th `translations.ts` system, written concisely

**Plans**: 7 plans
**UI hint**: yes

Plans:
**Wave 1**

- [x] 06-01-PLAN.md — Data spine: services.ts (9 slugs), serviceJsonLd.ts (escaped JSON-LD), t.services.pages schema + Wave 0 tests

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-02-PLAN.md — /services/[slug] route: server layout (static params, metadata, FAQPage JSON-LD), client template, 404, phase-6 CSS
- [x] 06-03-PLAN.md — Content batch A (fr/en/th): Site Vitrine, Rebranding + Site Premium, Branding — includes the SVC-04 boundary and cross-links

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 06-04-PLAN.md — /services index rewrite: 9 data-driven cards, no price row, no badge + index metadata + link test
- [x] 06-05-PLAN.md — Content batch B (fr/en/th): Projet Sur Mesure, Agent Vocal IA, Maintenance

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 06-06-PLAN.md — Content batch C (fr/en/th): Community Management, Meta Ads, Google Ads — completes the 9

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 06-07-PLAN.md — 9-of-9 completeness gate, production build verification (static pages, JSON-LD, zero price strings), human verification

### Phase 7: Diagnostic Simulator

**Goal**: A visitor can self-qualify through a branching questionnaire and receive a personalized, price-free service recommendation, while being captured as a prospect under RGPD-compliant consent.
**Depends on**: Phase 5 (submission endpoint must exist), Phase 6 (result screen links to finalized service slugs)
**Requirements**: SIMU-01, SIMU-02, SIMU-03, SIMU-04, SIMU-05, SIMU-06, SIMU-07, SIMU-08
**Success Criteria** (what must be TRUE):

  1. The visitor progresses through a branching question flow where irrelevant questions are skipped based on prior answers
  2. The result screen shows 2-4 specifically recommended services (never all 9), alongside a purely visual score/gauge (not stored as a metric)
  3. The contact capture form appears only between the last question and the result screen — never before the first question — and includes an unticked RGPD consent checkbox with full Art. 13 mentions
  4. No price, price range, or price estimate appears at any step of the simulator
  5. The result screen offers one clear action ("nous contacter") via two channels (appeler/écrire), and `/simulateur` itself reads as an explanatory, citable pillar page rather than a bare form

**Plans**: 6 plans
**UI hint**: yes

Plans:
**Wave 1**

- [x] 07-01-PLAN.md — Data spine: question bank with branching (5 questions, 1 conditional), PRIORITY_ORDER tiebreak, wizard step machine + Wave 0 tests
- [x] 07-02-PLAN.md — Gauge geometry module, ScoreGauge component (GSAP count-up, reduced-motion safe), and the full `.sim-*` CSS layer

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-03-PLAN.md — Simulator i18n content fr/en/th: pillar intro, questions/options, RGPD Art. 13 block, result framing, FAQ + no-price guard
- [x] 07-04-PLAN.md — Scoring: computeRecommendedServices (2-4 clamp, fixed tiebreak), computeVisualScore (inverted severity), consent-gated payload assembly

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-05-PLAN.md — Wizard component: question screens + progress bar + back nav, RGPD-gated contact capture + submit, result screen + dual-channel CTA

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 07-06-PLAN.md — /simulateur route: Server Component metadata + FAQPage JSON-LD, client pillar page (intro → wizard → FAQ), human verification

### Phase 8: Landing Simplification & Pricing Policy

**Goal**: The landing page and existing offer pages present the agency without ever showing a price, guiding every visitor toward the simulator or direct contact.
**Depends on**: Phase 6 (service cards link to real pages), Phase 7 (CTAs route to a real simulator)
**Requirements**: PRIX-01, PRIX-02, LANDING-01, LANDING-02, LANDING-03
**Success Criteria** (what must be TRUE):

  1. No price, price range, or tariff mention appears anywhere across the 9 service pages, the landing page, or the simulator (site-wide audit passes)
  2. `/calculateur-roi` no longer displays or estimates any price
  3. The landing page follows the sequence: problèmes résolus → aperçu des services (cartes vers les pages dédiées) → fonctionnement → enjeux → preuve sociale → CTA
  4. Every CTA on the landing page routes to the simulator or to direct contact (téléphone/email) — none points to a price or price anchor
  5. The landing's social proof section shows Feuillette, Gecko Cabane, and Les Folies Temps Danse as visible testimonials/case studies

**Plans**: 6 plans
**UI hint**: yes

Plans:
**Wave 1**

- [x] 08-01-PLAN.md — Wave 0 guards: PRIX-01 landing/services price regression tests + source-string audits for layout.tsx, calculateur-roi and the landing CTA allowlist

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 08-02-PLAN.md — Pricing removal: /calculateur-roi stripped to a value calculator (D-01/D-02/D-03) + priceRange deleted from the global JSON-LD (D-09)
- [x] 08-03-PLAN.md — i18n content fr/en/th: t.landing.problems / servicesPreview / method / enjeux / work.bridge_*, new hero CTA label, 01/07 counter + deletion of the 3 orphaned price-carrying sections

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 08-04-PLAN.md — New landing sections: ServicesPreview (9 data-driven cards + .svc-preview-grid), FonctionnementSection, EnjeuxSection
- [x] 08-05-PLAN.md — Existing components: hero CTA → /simulateur, ProblemSection repurposed + CTA (D-04..D-06), bridge rewrite (D-10), PhoneAgent teaser reduction (D-07/D-08)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 08-06-PLAN.md — Final page.tsx composition in LANDING-01 order, full-suite/build/price-sweep gate, human verification

### Phase 9: SEO & Discovery Wiring

**Goal**: Every new page is discoverable by search engines and AI crawlers, and the `/services` restructuring introduces no broken links.
**Depends on**: Phase 6, Phase 7, Phase 8 (all new/changed routes must exist first)
**Requirements**: SEO-01, SEO-02, SEO-03
**Success Criteria** (what must be TRUE):

  1. All 9 service pages and `/simulateur` appear in `sitemap.ts` and `llms.txt`, with titles/H1s following the "[Service] à Tours · [bénéfice]" pattern
  2. The site's `Organization`/`ProfessionalService` schema.org markup includes a distinct `Service` object per offer, linked via `hasOfferCatalog`
  3. A link audit confirms no broken internal anchors/links resulted from turning `/services` into an index page or from the landing re-sequencing

**Plans**: 4 plans

Plans:
**Wave 1**

- [x] 09-01-PLAN.md — sitemap.ts + llms.txt register 9 service pages + /simulateur, drift-guard tests (SEO-01)
- [ ] 09-02-PLAN.md — price-free OfferCatalog of 9 Service objects via hasOfferCatalog in root JSON-LD (SEO-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 09-03-PLAN.md — automated vitest link audit + SEO doc no-price annotations (SEO-03)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 09-04-PLAN.md — post-deploy GSC sitemap submission via gsc MCP, human-gated (D-10)

## Progress

**Execution Order:**
Phases execute in numeric order: 5 → 6 → 7 → 8 → 9
(Phases 5 and 6 have no dependency on each other and may be executed in either order.)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Design System Foundation | v1.0 | 5/5 | Complete | 2026-05-15 |
| 2. Landing Page Rebuild | v1.0 | 6/6 | Complete | 2026-05-17 |
| 3. Services Page Rebuild | v1.0 | 6/6 | Complete | 2026-05-18 |
| 4. Rethemes + QA | v1.0 | 4/4 | Complete | 2026-05-18 |
| 5. Prospect Capture Backend | v1.1 | 4/4 | Complete   | 2026-09-20 |
| 6. Service Pages (Template + Content) | v1.1 | 7/7 | Complete    | 2026-09-20 |
| 7. Diagnostic Simulator | v1.1 | 6/6 | Complete   | 2026-09-20 |
| 8. Landing Simplification & Pricing Policy | v1.1 | 6/6 | Complete    | 2026-09-21 |
| 9. SEO & Discovery Wiring | v1.1 | 1/4 | In Progress|  |
