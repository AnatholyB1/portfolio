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

- [ ] **Phase 5: Prospect Capture Backend** - New Supabase prospects table + insert-only RLS + spam guard + Resend notification, built and testable independently of any UI
- [ ] **Phase 6: Service Pages (Template + Content)** - 9 dedicated, price-free, citable service pages replacing the current pricing-heavy `/services`
- [ ] **Phase 7: Diagnostic Simulator** - Branching qualification quiz → 2-4 service recommendations → RGPD-compliant prospect capture → single dual-channel CTA
- [ ] **Phase 8: Landing Simplification & Pricing Policy** - Landing re-sequenced and re-CTA'd, all pricing removed site-wide (service pages, landing, simulator, calculateur-roi)
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
- [ ] 05-01-PLAN.md — Install zod + vitest, extract the prospect payload schema and spam predicate into src/lib/prospects-schema.ts
- [ ] 05-02-PLAN.md — Write and apply the prospects table migration: RLS with zero anon grants + 12-month pg_cron purge
- [ ] 05-03-PLAN.md — Service-role Supabase client + POST /api/simulateur (spam guard, insert, Resend notification) + unit tests
- [ ] 05-04-PLAN.md — Live end-to-end verification: bundle-leak gate, curl checklist, anon RLS denial, notification confirmation

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
**Plans**: TBD
**UI hint**: yes

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
**Plans**: TBD
**UI hint**: yes

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
**Plans**: TBD
**UI hint**: yes

### Phase 9: SEO & Discovery Wiring
**Goal**: Every new page is discoverable by search engines and AI crawlers, and the `/services` restructuring introduces no broken links.
**Depends on**: Phase 6, Phase 7, Phase 8 (all new/changed routes must exist first)
**Requirements**: SEO-01, SEO-02, SEO-03
**Success Criteria** (what must be TRUE):
  1. All 9 service pages and `/simulateur` appear in `sitemap.ts` and `llms.txt`, with titles/H1s following the "[Service] à Tours · [bénéfice]" pattern
  2. The site's `Organization`/`ProfessionalService` schema.org markup includes a distinct `Service` object per offer, linked via `hasOfferCatalog`
  3. A link audit confirms no broken internal anchors/links resulted from turning `/services` into an index page or from the landing re-sequencing
**Plans**: TBD

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
| 5. Prospect Capture Backend | v1.1 | 0/4 | Planned | - |
| 6. Service Pages (Template + Content) | v1.1 | 0/TBD | Not started | - |
| 7. Diagnostic Simulator | v1.1 | 0/TBD | Not started | - |
| 8. Landing Simplification & Pricing Policy | v1.1 | 0/TBD | Not started | - |
| 9. SEO & Discovery Wiring | v1.1 | 0/TBD | Not started | - |
