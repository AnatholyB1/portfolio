# BRICON ANATHOLY · Portfolio

## What This Is

Agency website for BRICON ANATHOLY (Sèvalys), a web & AI agency based in Tours, France, targeting local SMBs (restaurants, shops, schools, service businesses). The site presents 9 offers (each on its own price-free page), a diagnostic simulator that qualifies prospects into a dedicated Supabase table, a landing page built around proof (real client screenshots), and a `/demo` CRM dashboard used for client demos. No price is shown anywhere on the site.

## Core Value

A patron de PME lands on the site and immediately understands what we do, trusts us, and knows how to contact us — in under 60 seconds.

## Current State

**v1.1 shipped 2026-10-01** — "Extension de l'offre & refonte commerciale" (Phases 5-9, 27 plans). Archived in `.planning/milestones/v1.1-ROADMAP.md` and `v1.1-REQUIREMENTS.md`. v1.0 (visual redesign, Phases 1-4) shipped 2026-05-18.

Live on `sevalys.com`: landing (hero with real client screenshots, manifesto, problems, services index, method, stakes, realisations, phone-agent teaser, contact), 9 service pages + index, `/simulateur`, `/calculateur-roi` (price-free), `/demo`, mobile menu with a sticky diagnostic bar. Sitemap submitted to Search Console; `llms.txt` and an `OfferCatalog` of 9 `Service` objects in the global JSON-LD.

## Current Milestone: v2.0 Plateforme Sèvalys

**Goal:** Transformer le site vitrine en plateforme complète : un prospect arrive avec sa source tracée, devient client, suit son projet, signe et paie en ligne, et l'admin pilote tout depuis un dashboard prévisionnel.

**Target features:**
- Espace client : connexion sans mot de passe, onboarding guidé, suivi d'avancement par étapes, fichiers et liens, demande d'accord pour présenter le projet
- Documents PDF générés automatiquement depuis des modèles versionnés selon l'étape (devis, contrat, cahier des charges, PV de recette, facture)
- Signature numérique simple eIDAS maison (OTP, hash, horodatage, IP, piste d'audit)
- Paiements Stripe (acomptes par étape, état visible côté client)
- Prospects : attribution UTM first-party (premier/dernier contact, source figée, journal `lead_events` immuable, dédoublonnage 9 mois), pipeline, stats d'entonnoir par source — modèle: spec Notion « Back office leads Grand Ouest Habitat »
- Mailing automatique déclenché par statut/étape (Resend)
- Admin : suivi de projets, stats prospects, dashboard prévisionnel (CA, coûts, marge, trésorerie)
- Avis vérifiés (lien unique), canal direct vers Google Business, balisage `Review`/`AggregateRating`
- Préparation acquisition : convention UTM, conversions Meta/Google, kit de contenu organique

**Décisions de cadrage:** signature maison (pas de tiers), Stripe pour les paiements, PDF depuis modèles dans le code, tout dans un seul projet Next.js + Supabase. La politique « aucun prix » reste vraie pour les pages publiques ; devis/factures vivent dans l'espace client authentifié.

## Next Milestone Goals (backlog hérité de v1.1)

Candidates surfaced during v1.1 (some now absorbed by v2.0):

- Refresh dated copy: "Disponible en mai 2026" (hero pill) and "Nouveaux projets dès juin 2026" (contact) are stale
- Collect real Google reviews and set up Google Business Profile (SEO doc §5-§6; no reviews visible today)
- Sector pages `/secteurs/*` and a blog (SEO doc §4; deferred from v1.1)
- Real case studies for Community Management, Branding, Meta Ads, Google Ads once first clients are onboarded (SVC2-01)
- Simulator v2: sector-adapted questions, A/B testing (SIMU2-01/02)

## Requirements

### Validated

- ✓ Next.js 14 app with i18n (fr/en/th) via LanguageContext — Phase 0 (existing)
- ✓ VAPI phone agent integration + CRM API routes — Phase 0 (existing)
- ✓ /demo CRM dashboard with Supabase Realtime — Phase 0 (existing)
- ✓ /demo/feuillette branded pitch page — Phase 0 (existing)
- ✓ Mentions légales page — Phase 0 (existing)
- ✓ Design system implemented (CSS vars, Space Grotesk + Manrope + JetBrains Mono, custom cursor, scroll-reveal, cinema intro) — v1.0
- ✓ Landing page rebuilt with Selenium Phase 02 design system — v1.0
- ✓ Services page rebuilt with 9 sections + new design system — v1.0
- ✓ Mentions légales rethemed to new design system — v1.0
- ✓ /demo CRM dashboard rethemed to new design system — v1.0
- ✓ Remove freelance-era signals (bio, skills bars, StarkDisplay Iron Man, "Hire me") — v1.0
- ✓ Prospect capture backend: dedicated Supabase table, insert-only RLS, spam guard, Resend notification — v1.1 (CRM-01 to CRM-04)
- ✓ 9 dedicated price-free service pages (`/services/[slug]`) + index, FAQPage JSON-LD, citable direct-answer blocks — v1.1 (SVC-01 to SVC-06)
- ✓ Diagnostic simulator (`/simulateur`): branching questionnaire, 2-4 service recommendation, RGPD-consented capture — v1.1 (SIMU-01 to SIMU-08)
- ✓ Landing rebuilt around PME pain points → services → fonctionnement → enjeux → preuve sociale; every CTA routes to `/simulateur` or `/services/agent-vocal-ia` — v1.1 (LANDING-01 to LANDING-03)
- ✓ Site-wide "no price anywhere" enforced by automated guards (`calculateur-roi` reworked, `priceRange` removed) — v1.1 (PRIX-01, PRIX-02)
- ✓ SEO discovery wiring: sitemap + `llms.txt` for the 9 service pages and `/simulateur`, `OfferCatalog` of 9 price-free `Service` objects, automated internal-link audit, sitemap submitted to Search Console — v1.1 (SEO-01 to SEO-03)

### Active

Next milestone not defined yet. Carried over from v1.0 (still pending):

- [ ] Footer nav labels wired to LanguageContext (t.nav.* keys — currently hardcoded)
- [ ] JS-level prefers-reduced-motion guards in CinemaIntro, CustomCursor, PhoneAgent, MethodologySection

### Out of Scope

- /demo/feuillette — branded client pitch, intentionally separate
- Backend/API changes to the existing CRM (products/orders/stock) or VAPI — no functional changes
- New content languages — fr/en/th sufficient
- Any price display, price range or price comparator — site-wide policy (PRIX-01)
- Instant quote / auto-estimate in the simulator — violates the no-price policy

## Context

- **Tech stack**: Next.js 16 (Turbopack), TypeScript, Tailwind v4 (@theme inline), React, GSAP (ScrollTrigger), Supabase, Resend, vitest
- **Design system**: Acid `#C4F542`, bg `#0A0B0C`, ink `#ECEAE3`, warm `#E07856`, line `#1F1F1F`. Design brief in `PRODUCT.md` (register: brand)
- **Fonts**: Space Grotesk (display), Manrope (body), JetBrains Mono (mono) — all via next/font/google
- **Tests**: 332 vitest tests, including guards that encode policy (no price, CTA destinations, link audit, schema without price keys)
- **ClientProviders pattern**: All ssr:false dynamic imports routed through `ClientProviders.tsx` ('use client' boundary) — required by Next.js Turbopack
- **Nav hrefs**: Absolute (`/#manifeste`, `/#work`, `/#contact`) — relative hrefs fail from /services
- **Tooling caveats**: `graphify update .` currently fails (NoneType error); gcloud ADC for Search Console still holds the write scope and should be reverted to read-only

## Constraints

- **i18n**: Must preserve fr/en/th via existing LanguageContext — do not break language switching
- **Demo pages**: /demo/feuillette must NOT be touched
- **CRM API**: No changes to src/app/api/crm/* routes
- **SSR/SSG**: GSAP components require dynamic import with ssr:false via ClientProviders
- **Performance**: prefers-reduced-motion must be respected on all animations
- **Pricing**: no price, range or tariff mention anywhere (enforced by tests)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild pages (not patch) | Mockup is React component-based, fundamentally different structure from current TSX | ✓ Good — clean result, no regression |
| Keep LanguageContext | Already handles fr/en/th, mockup translations slot in as new keys | ✓ Good — zero breaking changes |
| CSS vars for design tokens | Mockup uses :root CSS vars — matches Next.js globals.css approach | ✓ Good — consistent across all pages |
| ClientProviders.tsx pattern | ssr:false forbidden in Next.js Server Components (Turbopack) | ✓ Good — adopted for Methodology too |
| Absolute hrefs in nav | Relative hrefs (#manifeste) fail when navigating from /services | ✓ Good — cross-page navigation works |
| Baseline 5f36fa0 for feuillette QA | Pre-Phase-1 planning commit, before any code changes | ✓ Good — clean integrity check |
| Read honeypot field via ref, forward verbatim to payload (Phase 7) | Was rendered but never read; hardcoded `website: ''` made the server's spam check unreachable — caught by code review | ✓ Good — fixed pre-merge, regression test added |
| LANDING-02's literal "every CTA → simulateur/contact" has two confirmed exceptions, both to `/services/agent-vocal-ia` (Phase 8) | calculateur-ROI results CTA and the PhoneAgent teaser CTA are agent-vocal-specific; that page is price-free and carries its own onward CTAs | ✓ Good — encoded in `page.test.ts`'s allowlist |
| Human-verify checkpoint actually tested in a browser (Phase 8) | Caught a hardcoded French label leaking into EN/TH that all automated tests missed | ✓ Good — fixed same session |
| Service schema.org objects live in the global JSON-LD only, no price fields (Phase 9, D-01/D-03) | One source of truth, resolves the SEO doc's `priceRange` conflict with the no-price policy | ✓ Good — guarded by tests |
| Link audit as a persistent vitest guard, not a one-off script (Phase 9, D-09) | Catches future broken anchors, including links to components not rendered on a page | ✓ Good |
| Sitemap submitted via gsc MCP after deploy, human-gated (Phase 9, D-10) | Needed a transient write-scope re-auth; re-auth took several attempts (scope typos, PowerShell comma splitting, concurrent runs) | ⚠️ Revisit — revert ADC to read-only |
| Post-delivery design overhaul: proof first (real client screenshots), one rhythm per section, key colors and fonts kept | v1.1 landing/service pages read as flat and generic; user feedback | ✓ Good — measured on production, tests unchanged |
| Mobile: burger menu + sticky diagnostic bar + collapsed realisations/problems | Nav was hidden below 900px with no replacement (links and language switch unreachable); landing was 16 screens long | ✓ Good — 13.8 screens, tested EN/TH |
| One permanent test client lives in production and is the fixture for all future v2.0 end-to-end tests (Phase 10, owner decision 2026-10-02) | Re-creating test data per phase is slow, and the invite flow refuses addresses that already have an account in the shared Supabase project | — Pending — see "Permanent test fixtures" below |

## Permanent test fixtures (production)

Owner decision, 2026-10-02: these exist in production on purpose. **Do not delete, rename or "clean up" them**, and do not flag them as leftover test data in reviews or verifications. Every later phase and milestone tests its flows on them, in production.

| Fixture | Value | Used for |
|---------|-------|----------|
| Test client (`sv_clients`) | "Test E2E Sèvalys", SIRET `90098846000011` (the owner's own company, ANATHOLY BRICON), invited 2026-10-02 | The client in every end-to-end test: client login, project and steps, documents, signature, payment, reviews |
| Test client login address | `anatholyb+sv-test@gmail.com` (plus-address, same inbox as the owner's Gmail) | Receives the invitation, login codes and any later client emails |
| Admin account | `contact@sevalys.com` (seeded in `sv_admins`) | Admin side of every test; its inbox is readable in the owner's Chrome profile (Gmail `u/1`) |
| Vercel deployment-protection bypass token | Created 2026-10-02 by `vercel curl` | Smoke checks against protected Preview deployments; kept, not revoked |

Rules for future phases:
- Plain `anatholyb@gmail.com` cannot be invited as a client: it already has an account from another app in the shared Supabase project, and the invite flow refuses such addresses by design. Use the plus-address.
- Login codes are one-time credentials: an agent may read the emails but the owner types the codes.
- Anything involving money (Phase 15) must still be confirmed with the owner before a real charge; whether the test client uses Stripe test mode or live mode is to be decided in the Phase 15 discussion.
- Test runs create rows for this client only. If a phase needs a clean slate, add a reset script that targets this client's rows; never delete the client itself.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-03 — Phase 13 complete (documents PDF figés: devis, contrat, cahier des charges, PV de recette; facture en aperçu seulement jusqu'à la phase 15)*
