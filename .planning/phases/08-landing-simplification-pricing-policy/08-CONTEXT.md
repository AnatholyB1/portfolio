# Phase 8: Landing Simplification & Pricing Policy - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure the landing page around PME pain-points → services (instead of being agent-vocal-centric), route every landing CTA to the simulator or direct contact, and eliminate every remaining price/tariff mention across the site — the landing, the ROI calculator, and the global JSON-LD — so that Phase 6/7's price-free service pages and simulator aren't undercut by leftover pricing signals elsewhere.

</domain>

<decisions>
## Implementation Decisions

### Calculateur ROI (PRIX-02)
- **D-01:** Keep `/calculateur-roi` but strip the price entirely: remove the "Prix mensuel de la solution" (499€) and "Setup" (250€) fields, and everything computed from them (`ratioSocle`, `ratioTotal`, `amortissementMois`, the "Rentabilisé en ~N mois" claim, and the "Votre agent coûte X€/mois et vous en rapporte Y€/mois" headline). What remains: "Capacité opérationnelle récupérée" (temps d'équipe libéré, en €/mois) and the optional upside block (CA récupéré sur appels manqués) — a pure value/capacity calculator, no cost-vs-price comparison.
- **D-02:** Final CTA under the results points to `/services/agent-vocal-ia` (the tool is agent-vocal-specific; that page already carries its own simulateur/contact CTAs) — not directly to `/simulateur` or contact.
- **D-03:** The now-orphaned inputs to remove/repurpose: `prixMensuel`, `setup` fields and their `ControlRow`s in the "Paramètres avancés" `<details>` block. `facteurInterruption` and `joursMois` stay (not price-related).

### "Problèmes PME → Services" section (LANDING-01)
- **D-04:** Reuse `ProblemSection.tsx`'s visual structure (numbered card grid, `sec-head`/`problem-grid`/`problem-good` pattern) but replace its current generic `t.services.problem` content with new copy — this component is currently orphaned (unused since Phase 6 rebuilt `/services` as an index) and becomes the landing's new problem section.
- **D-05:** Show only 3-4 major/universal PME pain points (not 9, not 5-6) — e.g., along the lines of "invisible en ligne", "personne ne répond au téléphone", "image dépassée", "pas le temps de gérer les réseaux" — without forcing an explicit 1:1 mapping to every one of the 9 services. Exact wording is Claude's discretion (see below).
- **D-06:** No per-card service links. Cards are illustrative only; a single CTA at the bottom of the section routes to `/simulateur` (e.g., "Quel est votre besoin ? Testez le diagnostic") — consistent with pushing qualification through the simulator rather than sending visitors straight to `/services`.

### Agent Vocal IA section on the landing (from pending todo, folded — see below)
- **D-07:** Reduce `PhoneAgent.tsx` to a short teaser: title + 1-2 sentences + the "live" badge. Remove the detailed feature bullet list (`pa.features`) and the animated `PhoneFlow` SVG scroll-diagram entirely — that level of detail already lives on `/services/agent-vocal-ia` (built in Phase 6).
- **D-08:** Single CTA in the teaser → `/services/agent-vocal-ia`. Drop the other two current CTAs: `/demo` (CRM dashboard link) and `/services#phone-agent` (broken — that anchor no longer exists since Phase 6 turned `/services` into an index; the real destination is the dedicated page). The `/calculateur-roi` CTA is superseded by D-02's new destination on that page itself.

### Site-wide price audit (PRIX-01)
- **D-09:** Remove the global `priceRange: "€€"` field from the `ProfessionalService` JSON-LD block in `src/app/layout.tsx` (line ~170) in this phase — it renders on every page including the landing, service pages, and simulator, so it falls within PRIX-01's "no price/tariff mention" scope even though it's schema markup rather than visible text. This is a distinct, already-existing field from the per-service `Service.priceRange` question the Phase 6 context flagged for Phase 9 — that one is about new objects Phase 9 will add, not this one.
- **D-10:** Rewrite `Realisations.tsx`'s bridge block (the "Voir toutes nos offres & tarifs" / "Quatre formules, des prix publics et un devis sous 48h" copy right after the case-study list) to point to `/simulateur` instead of `/services`, with new copy that drops every price/tariff/"formules" mention (also fixes the stale "Quatre formules" — there are 9 offers now, not 4).

### LANDING-02 scope clarification (post-planning)

Added 2026-09-21 after plan-checker review of the Phase 8 plan set. **Not new scope** — this records explicitly what D-02, D-06 and D-08 already settled during `/gsd:discuss-phase 8`, so `/gsd:verify-work` does not re-raise it as an unconfirmed interpretive gap.

- **D-11:** LANDING-02's literal wording ("every landing CTA → simulateur or direct contact", = **class A** in 08-UI-SPEC.md's CTA Destination Table) has exactly two confirmed, intentional exceptions — both routing to `/services/agent-vocal-ia`, both classified **class B**:
  1. The calculateur-ROI results CTA (**D-02**).
  2. The reduced `PhoneAgent.tsx` teaser CTA (**D-08**).

  Rationale, confirmed with the user at discuss time and restated here for the audit trail: `/services/agent-vocal-ia` is itself price-free (Phase 6) and already carries its own simulateur/contact CTAs, so the visitor still reaches the simulator/contact funnel one hop later. Both surfaces are agent-vocal-specific, so routing through the dedicated service page preserves qualification context that a direct jump to `/simulateur` would discard. Locked decisions outrank literal requirement text; LANDING-02 is satisfied by class A + class B together.

- **D-12:** The "aperçu des services" 9-card grid required by **LANDING-01** ("cartes renvoyant vers chaque page dédiée") links each card to its own `/services/{slug}` page. These per-card links are **class C** — service-preview *navigation*, not landing conversion CTAs — and are therefore outside LANDING-02's scope. They are a different section from the D-04/D-05 problem cards, which per **D-06** carry no per-card links at all and funnel through a single bottom CTA to `/simulateur` (class A).

  Verification consequence: the `ALLOWED_HREFS` / `ALLOWED_HREF_PREFIXES` / `SLUG_TEMPLATE_HREF` allowlist in `src/app/page.test.ts` (plan 08-01, task 3) is the authoritative encoding of D-11/D-12. Do not "correct" it to a literal simulateur/contact-only check — a failure there means a real regression, not a too-permissive allowlist.

### Claude's Discretion
- Exact wording of the 3-4 problem cards (D-05) and the section's intro/title copy.
- Exact new headline/labels for the calculator's remaining "Capacité récupérée" card now that the price-comparison framing is gone (D-01).
- Exact rewritten copy for `Realisations.tsx`'s bridge block (D-10) and the shortened `PhoneAgent.tsx` teaser (D-07).

### Folded Todos
- **"Restructurer la landing page autour des problèmes PME, pas de l'agent vocal"** (`.planning/todos/pending/2026-09-20-landing-page-trop-ax-e-agent-vocal-restructurer-en-probl-mes.md`) — the user's 2026-09-20 feedback after Phase 6 asking to de-emphasize the voice agent, present common PME problems mapped to services, make it visual, and add more simulator CTAs. Folded into D-04 through D-08 above (the Problèmes→Services section and the PhoneAgent teaser reduction + CTA fix). The todo's "search the internet for visual inspiration" note is left for planning/UI-phase research, not resolved here.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & requirements
- `.planning/PROJECT.md` — Current Milestone v1.1 section; Key Decisions row noting the pricing-policy reversal must be documented in the SEO strategy doc
- `.planning/REQUIREMENTS.md` — PRIX-01, PRIX-02, LANDING-01, LANDING-02, LANDING-03 (this phase's scope)
- `.planning/ROADMAP.md` — Phase 8 goal, 5 success criteria, dependency on Phase 6 (service pages) and Phase 7 (simulator)

### Prior phase decisions (locked, feed directly into this phase)
- `.planning/phases/06-service-pages-template-content/06-CONTEXT.md` — the 9 finalized service slugs (`site-vitrine`, `rebranding-site-premium`, `branding`, `projet-sur-mesure`, `agent-vocal-ia`, `maintenance`, `community-management`, `meta-ads`, `google-ads`); flags the separate `Service.priceRange` schema question for Phase 9 (distinct from D-09's global field, resolved here)
- `.planning/phases/07-diagnostic-simulator/07-CONTEXT.md` — `/simulateur` UX, and its own note that this landing todo resolves in Phase 8

### SEO/GEO/AEO strategy
- `docs/strategie-seo-geo-llm-2026-09.md` — recommended pricing transparency as a differentiator; this milestone's "no price anywhere" decision reverses that point for the whole site. Per PROJECT.md, this reversal must be documented back into this doc (SEO/discovery-facing task, likely during Phase 9, but flagged here since Phase 8 is what makes the reversal total/site-wide)

### Folded todo
- `.planning/todos/pending/2026-09-20-landing-page-trop-ax-e-agent-vocal-restructurer-en-probl-mes.md` — full user feedback behind D-04–D-08

### Existing code — direct targets of this phase
- `src/app/page.tsx` — landing composition: `Navbar`, `HeroSection`, `Manifeste`, `Realisations`, `PhoneAgent`, `Partners`, `ContactSection`, `Footer` (new Problèmes→Services section slots in here, per LANDING-01's ordering)
- `src/components/sections/ProblemSection.tsx` — orphaned since Phase 6, structure reused per D-04
- `src/components/sections/PhoneAgent.tsx` — teaser reduction target (D-07/D-08); contains the `PhoneFlow` sub-component (scroll-driven SVG) to remove from the landing
- `src/components/sections/Realisations.tsx` (lines ~52-64) — bridge block rewrite target (D-10); already renders the 3 case studies (Feuillette, Gecko Cabane, Les Folies Temps Danse) satisfying LANDING-03's core requirement structurally
- `src/app/calculateur-roi/page.tsx` — full file is the D-01/D-02/D-03 target: `DEFAULTS.prixMensuel`, `DEFAULTS.setup`, `fmtEur`, `gainNetSocle`, `ratioSocle`, `ratioTotal`, `amortissementMois`, `amortLabel`, and the "Prix mensuel de la solution"/"Setup one-shot" `ControlRow`s (lines ~102-119, ~234-251, ~281-288)
- `src/app/layout.tsx` (line ~170) — `priceRange: "€€"` field in the `ProfessionalService` JSON-LD, removal target (D-09)
- `src/lib/translations.ts` — `t.services.problem` (current ProblemSection content, to be replaced per D-04), `t.landing.phone` (PhoneAgent copy, to be shortened per D-07), `t.landing.work` (Realisations copy including the bridge block, D-10)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProblemSection.tsx`'s numbered-card-grid pattern (`sec-head`/`problem-grid`/`problem-card`/`problem-good`) — directly reusable for the new landing problem section (D-04)
- `Realisations.tsx`'s existing case-study rendering (`work-list`/`work-item`, sourced from `src/data/projects.ts`) — LANDING-03 is largely already satisfied structurally; only the trailing bridge block needs rewriting (D-10)
- `useReveals()` scroll-reveal hook — already used throughout `page.tsx`'s sections, applies to the new problem section too

### Established Patterns
- `'use client'` page + i18n via `useLanguage()`/`t.*` — every landing section follows this; new/edited sections must stay consistent
- Section copy lives in `translations.ts` per existing precedent (SVC-06), not hardcoded in components

### Integration Points
- `/services#phone-agent` is a dead anchor referenced from `PhoneAgent.tsx` — confirms Phase 6 already moved that content to `/services/agent-vocal-ia`; this phase's CTA fix (D-08) closes the loop
- `calculateur-roi`'s only inbound link found is from `PhoneAgent.tsx`'s `cta_roi` — no other page links to it, so D-01's rework doesn't ripple elsewhere
- Price mentions found in `src/app/api/crm/*`, `src/app/demo/*`, `src/data/services.test.ts` are unrelated (bakery-demo product prices / test fixtures, not Sèvalys's own service pricing) — confirmed out of this phase's audit scope

</code_context>

<specifics>
## Specific Ideas

No external reference sites/tools were named for the new problem section's visual style — the user's original feedback asked to "search the internet for inspiration" but didn't name specific sites; left for planning/UI-phase research per the folded todo's own note.

</specifics>

<deferred>
## Deferred Ideas

None new — the one candidate (visual-inspiration sourcing for the problem section) is a research task for planning/UI-phase, not a deferred scope item.

### Reviewed Todos (not folded)
None — the single matching todo was fully folded into this phase's decisions (see Folded Todos above).

</deferred>

---

*Phase: 8-landing-simplification-pricing-policy*
*Context gathered: 2026-09-21*
*Amended 2026-09-21: added D-11/D-12 (LANDING-02 scope clarification) after plan-checker review*
