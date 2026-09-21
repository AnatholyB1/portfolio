# Phase 8: Landing Simplification & Pricing Policy - Research

**Researched:** 2026-09-21
**Domain:** Next.js/React content refactor + i18n copy rewrite + site-wide text/schema audit (no new libraries, no new infra)
**Confidence:** HIGH (this is a closed-corpus refactor — every claim below is grounded in direct reads of the actual files, not framework research)

## Summary

Phase 8 is a pure content/composition refactor inside an existing Next.js 15 App Router codebase (React 19, `'use client'` pages, i18n via a hand-rolled `translations.ts` + `LanguageContext`, Vitest for tests). No new packages, no new routes, no new backend calls. The work is: (1) strip pricing fields and their derived math out of `/calculateur-roi`, (2) repoint several landing CTAs, (3) build one new landing section by repurposing an orphaned component, (4) rewrite two copy blocks, (5) delete one JSON-LD field, (6) verify no other price/tariff text leaked anywhere in scope.

The codebase already has an enforcement mechanism for this exact problem: `src/lib/translations.test.ts` defines a `PRICE_PATTERN` regex (`€|฿|prix|tarifs?|euros?|price|pricing|à partir de`) and a stricter `SIMU_PRICE_PATTERN` (adds `$|£|devis|coûte|gratuit|free`), both already wired as Vitest assertions guarding `t.services.pages` and `t.simulateur`. `src/data/services.test.ts` additionally does raw-source-string assertions against `/services/page.tsx` for the same tokens. Phase 8's most valuable and cheapest verification lever is extending these exact patterns to the newly-touched surfaces (`t.landing.*`, `calculateur-roi/page.tsx` source, `layout.tsx` source) rather than inventing new test infrastructure.

Two gaps were found that 08-CONTEXT.md's locked decisions do **not** cover, and that the planner must explicitly resolve (see Open Questions): (a) `HeroSection.tsx`'s primary CTA points to `/services`, which is neither the simulator nor direct contact, and is not listed as a target anywhere in CONTEXT.md; (b) LANDING-01's literal requirement text ("aperçu des services — cartes renvoyant vers chaque page dédiée") is structurally different from what D-04–D-06 lock in (a single combined problems+illustrative-cards section with one bottom CTA to `/simulateur`, explicitly *no* per-card links to service pages). Neither is a research call to make — they are scope/interpretation decisions for the planner or a discuss-phase follow-up — but both must be surfaced, because success criteria #3 and #4 are graded against the literal requirement text.

**Primary recommendation:** Treat this as five independent, low-risk edit tasks (calculateur-roi, new problem section + page.tsx composition, PhoneAgent teaser, Realisations bridge, layout.tsx JSON-LD) each closed out by extending the existing `PRICE_PATTERN`-style Vitest guard to the file/translation namespace it touched, plus one final full-repo grep sweep task for `€|prix|tarif` scoped to `src/app`, `src/components`, `src/lib/translations.ts` (excluding the confirmed-out-of-scope `demo/`, `api/crm/`, and test-fixture files).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRIX-01 | No price/price-range/tariff mention anywhere across the 9 service pages, landing, or simulator | Confirmed only one remaining violation-in-a-locked-target (`layout.tsx` priceRange, D-09) plus two **unlocked** dead-code carriers (`ServicesHeroSection.tsx`/`t.services.hero`, `MaintenanceSection.tsx`, `OffersSection.tsx`) that are orphaned (not imported anywhere) — see Code Examples / Common Pitfalls. Reusable audit pattern: `PRICE_PATTERN` in `translations.test.ts`. |
| PRIX-02 | `/calculateur-roi` no longer displays or estimates any price | Full current file read (317 lines) — exact fields, derived values, and JSX blocks to remove are enumerated in Code Examples. |
| LANDING-01 | Landing follows: problèmes → aperçu services → fonctionnement → enjeux → preuve sociale → CTA | Current `page.tsx` composition mapped section-by-section against this sequence — gap identified (see Open Questions): no explicit "fonctionnement"/"enjeux" sections exist today, and D-04–D-06 do not add "aperçu des services" cards-to-pages as literally specified. |
| LANDING-02 | Every landing CTA → simulator or direct contact; none → price/price anchor | Full CTA inventory built across all 6 current landing sections (see Architecture Patterns § CTA Inventory) — 2 CTAs flagged as unresolved by CONTEXT.md's locked decisions. |
| LANDING-03 | Social proof shows Feuillette, Gecko Cabane, Les Folies Temps Danse | Confirmed already live and correct: `src/data/projects.ts` indices 0-2, rendered via `Realisations.tsx`'s `work-list`. No changes needed to this part; only the trailing bridge block (D-10) changes. |
</phase_requirements>

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Calculateur ROI (PRIX-02)**
- D-01: Keep `/calculateur-roi` but strip the price entirely: remove "Prix mensuel de la solution" (499€), "Setup" (250€) fields, and everything computed from them (`ratioSocle`, `ratioTotal`, `amortissementMois`, "Rentabilisé en ~N mois", "Votre agent coûte X€/mois et vous en rapporte Y€/mois"). What remains: "Capacité opérationnelle récupérée" (temps d'équipe libéré, en €/mois) and the optional upside block (CA récupéré sur appels manqués) — a pure value/capacity calculator, no cost-vs-price comparison.
- D-02: Final CTA under the results points to `/services/agent-vocal-ia` (the tool is agent-vocal-specific; that page already carries its own simulateur/contact CTAs) — not directly to `/simulateur` or contact.
- D-03: Orphaned inputs to remove/repurpose: `prixMensuel`, `setup` fields and their `ControlRow`s in "Paramètres avancés" `<details>`. `facteurInterruption` and `joursMois` stay (not price-related).

**"Problèmes PME → Services" section (LANDING-01)**
- D-04: Reuse `ProblemSection.tsx`'s visual structure (numbered card grid, `sec-head`/`problem-grid`/`problem-good`) but replace its current generic `t.services.problem` content with new copy — this component is currently orphaned (unused since Phase 6 rebuilt `/services` as an index) and becomes the landing's new problem section.
- D-05: Show only 3-4 major/universal PME pain points (not 9, not 5-6) — e.g. "invisible en ligne", "personne ne répond au téléphone", "image dépassée", "pas le temps de gérer les réseaux" — without forcing an explicit 1:1 mapping to every one of the 9 services. Exact wording is Claude's discretion.
- D-06: No per-card service links. Cards are illustrative only; a single CTA at the bottom of the section routes to `/simulateur` (e.g. "Quel est votre besoin ? Testez le diagnostic") — consistent with pushing qualification through the simulator rather than sending visitors straight to `/services`.

**Agent Vocal IA section on the landing**
- D-07: Reduce `PhoneAgent.tsx` to a short teaser: title + 1-2 sentences + the "live" badge. Remove the detailed feature bullet list (`pa.features`) and the animated `PhoneFlow` SVG scroll-diagram entirely — that level of detail already lives on `/services/agent-vocal-ia` (Phase 6).
- D-08: Single CTA in the teaser → `/services/agent-vocal-ia`. Drop `/demo` and `/services#phone-agent` (broken anchor). The `/calculateur-roi` CTA is superseded by D-02's new destination on that page itself.

**Site-wide price audit (PRIX-01)**
- D-09: Remove the global `priceRange: "€€"` field from the `ProfessionalService` JSON-LD block in `src/app/layout.tsx` (line ~170) — renders on every page. Distinct from the per-service `Service.priceRange` schema question flagged for Phase 9.
- D-10: Rewrite `Realisations.tsx`'s bridge block ("Voir toutes nos offres & tarifs" / "Quatre formules, des prix publics et un devis sous 48h") to point to `/simulateur` instead of `/services`, with new copy dropping every price/tariff/"formules" mention (also fixes the stale "Quatre formules" — there are 9 offers now).

### Claude's Discretion
- Exact wording of the 3-4 problem cards (D-05) and the section's intro/title copy.
- Exact new headline/labels for the calculator's remaining "Capacité récupérée" card now that the price-comparison framing is gone (D-01).
- Exact rewritten copy for `Realisations.tsx`'s bridge block (D-10) and the shortened `PhoneAgent.tsx` teaser (D-07).

### Deferred Ideas (OUT OF SCOPE)
None new — the one candidate (visual-inspiration sourcing for the problem section) is a research task for planning/UI-phase, not a deferred scope item. Price mentions in `src/app/api/crm/*`, `src/app/demo/*`, `src/data/services.test.ts` are confirmed unrelated (bakery-demo product prices/test fixtures) and confirmed out of this phase's audit scope by re-verification below.
</user_constraints>

## Project Constraints (from CLAUDE.md)

- **graphify (project-level, `C:\portfolio\CLAUDE.md`):** This project has a knowledge graph at `graphify-out/`. `graphify-out/wiki/` does not currently exist (empty directory) so there is no wiki to navigate instead of raw files. After modifying code files during execution, the convention is to run `graphify update .` (AST-only, no API cost) to keep the graph current — the planner should add this as a final housekeeping step, not a per-task one.
- **RTK (user-level, global `CLAUDE.md`):** All shell commands the executor runs (git, test, lint, etc.) must be prefixed with `rtk` (e.g. `rtk git commit`, `rtk npx vitest run`) even inside `&&` chains. This is an execution-time convention, not a planning concern, but plan tasks that specify literal shell commands should use the `rtk`-prefixed form.
- No other actionable CLAUDE.md directives apply to this phase (no forbidden patterns, no additional testing rules beyond the project's own Vitest suite already covered under Validation Architecture below).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Price/tariff text removal | Frontend (React components + `translations.ts`) | — | Pure static content; no backend, no API involved. |
| ROI calculator math (client-side) | Browser / Client | — | 100% client-side `useState` computation in `calculateur-roi/page.tsx`; "100% front, calcul instantané" by design comment. No server round-trip. |
| Landing section composition/ordering | Frontend (Next.js page, `'use client'`) | — | `src/app/page.tsx` is a client component; section order is literally the JSX children array. |
| i18n copy (fr/en/th) | Frontend (`src/lib/translations.ts`) | — | Established SVC-06 precedent: content lives in the shared `Translations` interface/object, never hardcoded in components. |
| Global JSON-LD schema | Frontend Server (SSR, `layout.tsx`) | — | `layout.tsx` is a server component injecting `<script type="application/ld+json">`; renders identically on every route including landing/services/simulator. |
| Price-language regression guard | Test / CI (Vitest, `src/**/*.test.ts`) | — | `PRICE_PATTERN`/`SIMU_PRICE_PATTERN` already exist in `translations.test.ts`; extending them is a test-tier task, not a frontend-tier task. |

## Standard Stack

No new libraries are introduced by this phase. The existing stack is reused as-is:

| Library | Version (from package.json) | Purpose | Why Standard (for this repo) |
|---------|------|---------|--------------|
| next | 15.x (App Router) | Routing, SSR for `layout.tsx`, client pages | Already the project framework |
| react | 19.x | UI components | Already the project framework |
| vitest | ^4.1.11 | Test runner, `.test.ts` files under `src/**` | Already the project's only test runner — `environment: 'node'`, no jsdom/RTL configured |
| (none — hand-rolled) | — | i18n (`translations.ts` + `LanguageContext`/`useLanguage()`) | Established in prior phases (SVC-06 decision explicitly rejected extracting to a separate content file); no i18n library (next-intl, etc.) is used |

**No installation required.** Skip the Package Legitimacy Audit — this phase adds zero external dependencies.

## Architecture Patterns

### System Architecture Diagram

```
Browser (client-only, 'use client' everywhere touched in this phase)
│
├─ / (page.tsx, client component)
│    useReveals() ── IntersectionObserver sweep over [data-reveal] (global, MutationObserver-driven)
│    │
│    ├─ HeroSection      → cta_primary: href="/services" ⚠ NOT in CONTEXT.md scope (see Open Q)
│    │                    → cta_secondary: href="#contact" (in-page anchor)
│    ├─ Manifeste         (narrative only, no CTA)
│    ├─ [NEW] Problems    → t.landing.problems (new i18n key) — D-04/05/06
│    │                    → single CTA → /simulateur
│    ├─ Realisations      → work-list (Feuillette/Gecko/Folies, already correct — LANDING-03)
│    │                    → bridge block CTA → /simulateur (rewritten, D-10)
│    ├─ PhoneAgent        → teaser only (D-07) → single CTA → /services/agent-vocal-ia (D-08)
│    ├─ Partners          (logo ticker, no CTA)
│    └─ ContactSection    → POST /api/contact (unchanged, out of scope)
│
├─ /calculateur-roi (page.tsx, client component, 100% client math)
│    input state (useState) → derived values (plain arithmetic, no backend)
│    prixMensuel/setup fields REMOVED (D-01/D-03) → ratioSocle/ratioTotal/amortissementMois REMOVED
│    remaining: capaciteRecuperee card + optional upside (caRecupere/margeRecuperee)
│    final CTA → /services/agent-vocal-ia (D-02)
│
├─ /services (index, unaffected — already price-free, SVC-03 complete)
├─ /services/agent-vocal-ia (dynamic [slug] route, unaffected, CTA destination only)
├─ /simulateur (unaffected, already SIMU-01..08 complete, CTA destination only)
│
└─ layout.tsx (SERVER component, renders on every route)
     ProfessionalService JSON-LD → priceRange: "€€" REMOVED (D-09)
```

### Recommended Project Structure

No new files/folders. All edits are in-place:
```
src/
├── app/
│   ├── page.tsx                    # re-sequence children: insert new Problems section
│   ├── layout.tsx                  # remove priceRange line (~170)
│   └── calculateur-roi/page.tsx    # strip prixMensuel/setup + derived math + JSX
├── components/sections/
│   ├── ProblemSection.tsx          # repurposed for landing (or renamed — planner's call)
│   ├── PhoneAgent.tsx              # reduced to teaser, PhoneFlow sub-component deleted
│   └── Realisations.tsx            # bridge block rewrite only (lines ~52-64)
└── lib/
    └── translations.ts             # new landing.problems key; edit landing.phone, landing.work;
                                     # (services.problem / services.hero left as dead code — see Pitfalls)
```

### Pattern: i18n content ownership (established, SVC-06 precedent)
**What:** Every visible string lives under a typed key path in the `Translations` interface (`src/lib/translations.ts`, ~2500+ lines, one object per locale: `fr`, `en`, `th`), consumed via `useLanguage().t`.
**When to use:** Any new/edited copy in this phase — no hardcoded JSX strings.
**Example (existing `t.landing.phone` shape, to be trimmed per D-07):**
```typescript
// Source: src/lib/translations.ts lines 239-253 (fr, mirrored at 991 en / 1758 th)
phone: {
  num: string;
  badge: string;
  title_l1: string; title_l2: string; title_l3_it: string;
  sub: string;
  features: string[];        // ← D-07: delete this field's usage in PhoneAgent.tsx
  cta_demo: string;          // ← D-08: delete (was /demo)
  cta_more: string;          // ← D-08: delete (was /services#phone-agent, dead anchor)
  cta_roi: string;           // ← D-08: delete/repoint (was /calculateur-roi)
  flow_label: string; flow_rec: string;
  flow_steps: { t: string; k: string; v: string }[];  // ← D-07: delete, PhoneFlow removed
}
```
The `Translations` interface has **no existing `landing.problems` key** — D-04's new section requires adding one (recommended shape below), in the shared interface plus all 3 locale object literals (fr required now; en/th at minimum need placeholder/translated content to keep `translations.test.ts`'s locale-parity tests — see Validation Architecture — passing, if such a parity test is added for this new key).

**Recommended new key (no existing precedent to reuse verbatim, modeled on `t.services.problem`'s shape which already fits D-04's numbered-card-grid):**
```typescript
// New addition to the landing interface, all 3 locales
problems: {
  num: string;
  title_l1: string; title_l2_it: string;
  intro: string;
  items: { n: string; title: string; desc: string }[];  // 3-4 items per D-05
  good_news: string;
  cta: string;          // D-06: single bottom CTA label, e.g. "Testez le diagnostic"
}
```

### Anti-Patterns to Avoid
- **Hardcoding the new problem-card copy directly in `ProblemSection.tsx`:** breaks the SVC-06 i18n precedent and the existing `en`/`th` locale switcher (`Navbar.tsx`'s `LANGS = ['fr','en','th']`) would silently show French text to `en`/`th` users.
- **Leaving `t.services.problem` and `t.services.hero` (both contain price language: `hero.badge = "OFFRES & TARIFS — 2026"` in fr, `"OFFERS & PRICES"` in en, `"บริการ & ราคา"` in th) untouched under the assumption "it's fine, nothing renders it":** technically true today (both are orphaned, unreferenced by any `.tsx` under `src/app`), but a future accidental re-import would silently reintroduce a price string past the JSON-string `PRICE_PATTERN` guard, because that guard currently only scans `t.services.pages` and `t.simulateur`, not `t.services.hero`/`t.services.problem`. See Common Pitfalls.
- **Assuming `/calculateur-roi`'s only inbound link is `PhoneAgent.tsx`'s `cta_roi`:** verified true (`grep -rn "calculateur-roi" src` → 1 result outside the page itself), so D-01's rework is safe, but re-verify at execution time in case a plan task elsewhere adds a new link before this phase lands.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting stray price/tariff text across dozens of translation strings | A new ad-hoc regex or manual `grep` review per file | Extend the existing `PRICE_PATTERN` / `SIMU_PRICE_PATTERN` constants already defined in `src/lib/translations.test.ts` (lines 11 & 17) to also scan `translations[lang].landing` (and, if kept, `translations[lang].services.hero`/`.problem`) | The regex is already tuned (handles €/฿/$/£, `prix`/`tarifs?`/`euros?`/`price`/`pricing`, "à partir de", and a stricter variant for `devis`/`coûte`/`gratuit`/`free`) and battle-tested against Phase 6/7's own price-free requirements (SVC-02, SIMU-06). Reinventing it risks a laxer pattern that misses a locale-specific term (as the Thai `ราคา` case below shows was almost missed). |
| Verifying a page's rendered JSX contains no literal price token | Manually eyeballing components | `readFileSync` the page/component source and `.not.toContain(token)` — exact pattern already used in `src/data/services.test.ts` lines 97-107 (`o-price`, `o-from`, `pop-tag`, `€`, `prix`, `tarif`) | Proven pattern in this exact repo for exactly this exact requirement family (SVC-02/PRIX-01); a source-string test catches hardcoded strings that a JSON-serialization test on `translations.ts` would not (e.g. a stray literal in `calculateur-roi/page.tsx` itself, which is not i18n-routed). |

**Key insight:** This phase's "hand-roll risk" isn't algorithmic (there's no calculation or library-replaceable logic involved) — it's *test-coverage* risk: writing a new bespoke check when an equivalent, already-passing check exists one file away. Reuse the two existing test patterns instead of inventing a third.

## Common Pitfalls

### Pitfall 1: Orphaned components/translation keys keep dead price text technically "in the repo" but outside every existing guard
**What goes wrong:** `ServicesHeroSection.tsx` (badge: `"OFFRES & TARIFS — 2026"` / `"OFFERS & PRICES"` / `"บริการ & ราคา"`), `t.services.problem` (unused, generic 4-item content), `MaintenanceSection.tsx` (`p.price`, `p.priceNote`), and `OffersSection.tsx` (`o.price`) are **not imported by any file under `src/app`** — confirmed via `grep -rln` for each component name restricted to `src/app`, zero matches. They render nowhere today, so they do not violate PRIX-01's "no price mention on a rendered page" as long as they stay orphaned. But `translations.test.ts`'s `PRICE_PATTERN` guard only `JSON.stringify`s `t.services.pages` and `t.simulateur` — it does **not** scan `t.services.hero` or `t.services.problem`, so these price strings can sit in the codebase indefinitely without ever tripping a test, even though a careless future `import` would resurrect a live PRIX-01 violation with zero test failure.
**Why it happens:** Phase 6 rebuilt `/services` as an index and left the pre-rebuild hero/problem sections in place instead of deleting them, because they were repurposable (per D-04, `ProblemSection.tsx` *is* being repurposed this phase).
**How to avoid:** The planner should decide one of: (a) delete `ServicesHeroSection.tsx`, `MaintenanceSection.tsx`, `OffersSection.tsx` and their now-fully-dead translation keys (`services.hero`, plus whatever `Maintenance`/`Offers` consume) as a cleanup task in this phase, or (b) explicitly defer that cleanup and extend the `PRICE_PATTERN` guard to cover `t.services.hero` too (cheap, ~1 line) so a future accidental resurrection fails CI immediately even if the files stay. Doing neither leaves a silent gap between "PRIX-01 passes today" and "PRIX-01 is actually enforced going forward."
**Warning signs:** `grep -rn "ราคา\|TARIFS\|PRICES" src/lib/translations.ts` returning hits that no test catches.

### Pitfall 2: `/calculateur-roi`'s derived-value chain has more dependents than the two fields being deleted
**What goes wrong:** `prixMensuel` and `setup` (D-03's removal targets) feed `gainNetSocle`, `ratioSocle`, `amortissementMois`, `ratioTotal`, `amortLabel`, `amortNeg` — a 6-deep derivation chain (lines 102-119 of `calculateur-roi/page.tsx`). Deleting the two input fields without tracing every downstream `const` leaves dangling references that fail to compile (TypeScript) rather than failing silently, which is good, but a naive line-by-line edit could miss `amortLabel`'s JSX usage at line 287 or the headline claim's template string at lines 281-284 if the editor only searches for `prixMensuel`/`setup` literally and not their derived variable names.
**Why it happens:** The ROI v2 "socle" calculation was explicitly designed (per the file's own header comment) so the headline claim is "carried by the socle alone" — meaning the price-dependent ratio *is* the headline, not a side detail.
**How to avoid:** Remove in dependency order: delete `prixMensuel`/`setup` from `DEFAULTS` and their `ControlRow`s first (compiler will then flag every now-broken reference: `gainNetSocle`, `ratioSocle`, `amortissementMois`, `ratioTotal`, `amortLabel`, `amortNeg`, and the JSX in the "Carte 2" `roi-card-main` block lines 279-288) — let the TypeScript compiler's "unused variable"/"cannot find name" errors drive the removal list rather than grepping for the two field names alone.
**Warning signs:** `npm run build` (or `tsc --noEmit`) failing after the fields are removed — this is expected mid-edit, not a regression; the task isn't done until it compiles clean.

### Pitfall 3: LANDING-02's literal wording ("simulateur or direct contact") is narrower than two locked CTA destinations
**What goes wrong:** D-02 and D-08 both lock a landing/tool CTA to `/services/agent-vocal-ia` — a specific service page, which is neither `/simulateur` nor a direct phone/email contact action. A literal read of LANDING-02 ("Tous les CTA de la landing renvoient vers le simulateur ou le contact direct… aucun CTA ne pointe vers un prix ou une ancre de prix") would flag `/services/agent-vocal-ia` as non-compliant, even though it is fully price-free (Phase 6 requirement SVC-02) and does itself contain simulator/contact CTAs one click deeper.
**Why it happens:** D-02/D-08 optimize for "send agent-vocal-curious visitors to the page with full detail" rather than "always terminate on simulator/contact in one hop" — a reasonable UX call, but one that isn't literally what LANDING-02's success-criterion text says.
**How to avoid:** This is a locked decision, not a research finding to override — flag it to the user/discuss-phase rather than silently "fixing" it in planning. If the success-criteria grader checks LANDING-02 by literal regex against CTA `href`s, D-02/D-08 will need either a criterion-wording amendment or a one-more-hop tolerance built into the grading approach.
**Warning signs:** An automated LANDING-02 verification step that greps `page.tsx`/`PhoneAgent.tsx` for `href="/simulateur"|href="#contact"|mailto:|tel:` and fails on `/services/agent-vocal-ia`.

### Pitfall 4: `HeroSection.tsx`'s primary CTA is untouched by any locked decision but is squarely in LANDING-02's scope
**What goes wrong:** `HeroSection.tsx` (rendered first on the landing, `t.landing.hero.cta_primary = "Voir nos offres"`, `href="/services"`) is a landing CTA that routes to neither the simulator nor direct contact. It is not mentioned anywhere in 08-CONTEXT.md's Decisions, Discretion, or canonical target file list — meaning either the discuss-phase session missed it, or it was implicitly judged out of scope and just wasn't written down.
**Why it happens:** CONTEXT.md's canonical-refs list of "existing code — direct targets" enumerates `page.tsx`, `ProblemSection.tsx`, `PhoneAgent.tsx`, `Realisations.tsx`, `calculateur-roi/page.tsx`, `layout.tsx`, `translations.ts` — `HeroSection.tsx` is conspicuously absent despite being the first thing a visitor sees.
**How to avoid:** Surface this explicitly before planning locks in a task list (see Open Questions) — don't silently add or silently skip the Hero CTA fix.
**Warning signs:** Success criterion #4 verification failing solely on the hero CTA after every other CTA in scope has been fixed.

## Code Examples

### Exact current `/calculateur-roi` price-dependent derivation chain (D-01/D-03 removal scope)
```typescript
// Source: src/app/calculateur-roi/page.tsx, current state (lines 96-119)
const tempsAppelMensuelH = (v.appelsJour * v.dureeMin / 60) * v.joursMois;
const capaciteRecuperee = tempsAppelMensuelH * v.coutHoraire * v.facteurInterruption; // KEEP

const caRecupere = upside ? v.appelsManques * v.ticketMoyen * v.joursMois : 0;        // KEEP
const margeRecuperee = caRecupere * (v.margeBrute / 100);                            // KEEP

const gainNetSocle = capaciteRecuperee - v.prixMensuel;        // DELETE (depends on prixMensuel)
const ratioSocle = v.prixMensuel > 0 ? capaciteRecuperee / v.prixMensuel : 0;  // DELETE
const amortissementMois = gainNetSocle > 0 ? v.setup / gainNetSocle : null;    // DELETE (depends on setup)

const beneficeTotal = capaciteRecuperee + margeRecuperee;      // KEEP (feeds upside card only)
const ratioTotal = v.prixMensuel > 0 ? beneficeTotal / v.prixMensuel : 0;  // DELETE

// amortLabel / amortNeg (lines 110-119): DELETE entirely — only consumer of amortissementMois
```

### Exact JSX blocks to delete in `/calculateur-roi`
```tsx
// Source: src/app/calculateur-roi/page.tsx lines 234-251 (inside <details> "Paramètres")
<ControlRow label="Prix mensuel de la solution" value={v.prixMensuel} onChange={set('prixMensuel')} min={0} max={2000} step={1} suffix="€ / mois" />
<ControlRow label="Setup one-shot" value={v.setup} onChange={set('setup')} min={0} max={2000} step={10} suffix="€" />

// Source: lines 279-288, "Carte 2 — Principale (SOCLE seul)" — entire block's framing must change
// per D-01's "Claude's Discretion" item (new headline/labels needed, price-comparison framing removed)
<div className="roi-card roi-card-main">
  <p className="roi-claim">Votre agent coûte <strong>{fmtEur(v.prixMensuel)}/mois</strong> ...</p>
  <div className="roi-mult">{fmtMult(ratioSocle)}</div>
  <div className="roi-mult-sub">le coût de la solution</div>
  <div className={`roi-amort ${amortNeg ? 'neg' : ''}`}>{amortLabel}</div>
</div>
```

### Existing reusable price-guard pattern (extend, don't reinvent)
```typescript
// Source: src/lib/translations.test.ts lines 8-17 (already in the repo)
const PRICE_PATTERN = /€|฿|\bprix\b|\btarifs?\b|\beuros?\b|\bprice\b|\bpricing\b|à partir de/i;
const SIMU_PRICE_PATTERN = /€|฿|\$|£|\bprix\b|\btarifs?\b|\beuros?\b|\bprice\b|\bpricing\b|\bdevis\b|\bco[uû]te?\w*\b|\bgratuit\w*\b|\bfree\b|à partir de/i;

// Recommended extension for this phase (new test, same file):
it('PRIX-01: no pricing language appears anywhere in t.landing, for any locale', () => {
  for (const lang of LANGS) {
    const serialized = JSON.stringify(translations[lang].landing);
    expect(serialized).not.toMatch(PRICE_PATTERN);
  }
});
```

### Existing reusable source-string audit pattern (extend for calculateur-roi + layout.tsx)
```typescript
// Source: src/data/services.test.ts lines 97-107 (already in the repo, adapt for new targets)
const roiPageSource = readFileSync(new URL('../app/calculateur-roi/page.tsx', import.meta.url), 'utf8');
it('PRIX-02: no price token in calculateur-roi page source', () => {
  for (const token of ['€', 'prixMensuel', 'Prix mensuel', 'coûte']) {
    expect(roiPageSource).not.toContain(token);
  }
});

const layoutSource = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
it('PRIX-01: no priceRange field in global JSON-LD', () => {
  expect(layoutSource).not.toContain('priceRange');
});
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The recommended new `landing.problems` translation key shape (num/title/intro/items/good_news/cta) is the best fit — CONTEXT.md's D-04 says only "replace `t.services.problem` content," not explicitly "create a new `landing.problems` key" | Architecture Patterns | Low — either approach (repurpose `services.problem` in place vs. new `landing.problems` key) is mechanically equivalent; choosing wrong only costs a rename, not a redesign. Flagged as Open Question, not asserted as locked. |
| A2 | `ServicesHeroSection.tsx`, `MaintenanceSection.tsx`, `OffersSection.tsx` are safe to leave untouched (orphaned, not rendered) without violating PRIX-01 as graded today | Common Pitfalls #1 | Medium — if the phase's site-wide audit is interpreted as "no price string anywhere in the repo" rather than "no price string on any rendered page," these three files would need deletion too. Verified via `grep`/import-search that they are currently unreferenced from `src/app`, so the risk is about audit *interpretation*, not about the underlying fact. |

**If this table is empty:** N/A — see above; both entries are LOW-MEDIUM risk interpretation questions, not unverified factual claims (all file/content claims in this document were confirmed by direct `Read`/`Grep` against the actual repository, not by training-data recall).

## Open Questions (RESOLVED — see 08-UI-SPEC.md)

**Resolution status (added 2026-09-21, post-planning):** all four questions below are resolved; they are retained verbatim for the audit trail.

- **#1 and #2** — resolved by `08-UI-SPEC.md`'s CTA Destination Table (which states "Resolves RESEARCH.md Open Questions #1 and #2"): `HeroSection.tsx`'s primary CTA is repointed to `/simulateur` (class A, plan 08-05), and the two `/services/agent-vocal-ia` destinations locked by D-02/D-08 are confirmed class-B exceptions to LANDING-02's literal wording. Now also recorded explicitly as **D-11** in `08-CONTEXT.md`.
- **#3 and #4** — resolved by `08-UI-SPEC.md`'s section-order spec (which states "Resolves RESEARCH.md Open Questions #3 and #4"): the services overview survives as its own distinct 9-card `ServicesPreview` grid with per-card `/services/{slug}` links (class C, now **D-12** in `08-CONTEXT.md`), separate from the D-04-D-06 problem section; and "fonctionnement"/"enjeux" become distinct new `FonctionnementSection.tsx` / `EnjeuxSection.tsx` components rather than being absorbed loosely into `Manifeste`/`PhoneAgent` (plan 08-04, composed in plan 08-06).

1. **Does `HeroSection.tsx`'s primary CTA (`/services`, "Voir nos offres") need to change under LANDING-02?**
   - What we know: It is a landing-page CTA, not mentioned anywhere in 08-CONTEXT.md, and its current destination (`/services`) is neither `/simulateur` nor direct contact.
   - What's unclear: Whether the discuss-phase session considered and intentionally excluded it, or missed it.
   - Recommendation: Raise this explicitly before finalizing the plan — either add a task to repoint it (e.g., to `/simulateur`, mirroring D-06/D-10's pattern) or get an explicit "out of scope, `/services` is acceptable because it's itself price-free" ruling recorded.

2. **Do D-02 and D-08's `/services/agent-vocal-ia` CTA destinations satisfy LANDING-02 as literally worded?**
   - What we know: Both are locked decisions; both route to a specific, price-free service page rather than to `/simulateur` or a direct-contact channel.
   - What's unclear: Whether LANDING-02 / success-criterion #4 will be graded by literal CTA-destination check (simulator/contact-only) or by the softer "no CTA points to a price or price anchor" reading.
   - Recommendation: Confirm the grading approach for LANDING-02 before writing a verification task that would fail these two locked decisions.

3. **Does LANDING-01's literal "aperçu des services (cartes renvoyant vers chaque page dédiée)" survive as a separate section, or is it fully absorbed into the D-04–D-06 combined problems section (with no per-card links, per D-06)?**
   - What we know: D-04–D-06 describe one section (illustrative problem cards + one bottom CTA to `/simulateur`), explicitly *without* per-card service links — which is a different shape than LANDING-01's literal text.
   - What's unclear: Whether a distinct "aperçu des services" section (i.e., something resembling the existing `/services` index cards, embedded on the landing) is still expected, or whether the user's D-06 ruling supersedes that clause of LANDING-01 entirely.
   - Recommendation: Treat D-04–D-06 as authoritative (locked decisions outrank literal requirement text per project process), but flag the requirement-vs-decision gap in the plan so `/gsd:verify-work` doesn't fail LANDING-01 on a literal-text technicality.

4. **Are "fonctionnement" and "enjeux" (LANDING-01's 3rd/4th sequence steps) expected as distinct new sections, or satisfied implicitly by existing `Manifeste`/`PhoneAgent teaser` content?**
   - What we know: The current landing has no section explicitly labeled/structured as "how it works" or "what's at stake" — `Manifeste` is closer to a philosophy/manifesto section, and the reduced `PhoneAgent` teaser (D-07) is agent-vocal-specific, not a general "how we work" explainer.
   - What's unclear: Whether CONTEXT.md's silence on this means "no new section needed, existing sections satisfy it loosely" or "this was missed."
   - Recommendation: Map the final section order explicitly against all 6 LANDING-01 steps in the plan and note any steps satisfied "loosely" vs. "literally," rather than assuming full compliance.

## Environment Availability

Skipped — this phase has no external tool/service/runtime dependencies. All work is in-repo Next.js/React/TypeScript edits plus Vitest, all already installed and verified present (`vitest ^4.1.11` in `package.json`, `npm run test` → `vitest run`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 |
| Config file | `vitest.config.ts` — `environment: 'node'`, `include: ['src/**/*.test.ts']` (note: `.test.tsx` is **not** included — no component-render testing in this repo; all existing tests are logic/string/JSON assertions) |
| Quick run command | `rtk npx vitest run src/lib/translations.test.ts src/data/services.test.ts` |
| Full suite command | `rtk npm run test` (→ `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRIX-01 | No price/tariff string in `t.landing.*` (any locale) | unit (JSON-string regex) | `rtk npx vitest run src/lib/translations.test.ts -t "landing"` | ❌ Wave 0 — extend existing describe block, pattern already exists |
| PRIX-01 | No `priceRange` field in global JSON-LD | unit (source-string) | `rtk npx vitest run src/app/layout.test.ts` (new file, mirrors `services.test.ts`'s source-read pattern) | ❌ Wave 0 — no `layout.test.ts` currently exists |
| PRIX-02 | No price token in `/calculateur-roi` page source | unit (source-string) | `rtk npx vitest run src/app/calculateur-roi/page.test.ts` (new file) | ❌ Wave 0 — no test file currently exists for this route |
| LANDING-01 | Section order in `page.tsx` matches intended sequence | manual-only (visual/structural review) — justification: section *order* is a JSX array; a test could assert import order via source-string but wouldn't catch semantic mismatches flagged in Open Questions #3/#4 | manual review during `/gsd:verify-work` | — |
| LANDING-02 | Every landing CTA `href` resolves to `/simulateur`, `#contact`, `tel:`, or `mailto:` (pending resolution of Open Questions #1/#2) | unit (source-string, once destinations are confirmed) | `rtk npx vitest run src/app/page.test.ts` (new file) | ❌ Wave 0 — depends on Open Question #1/#2 resolution before the exact assertion list can be written |
| LANDING-03 | Feuillette/Gecko Cabane/Les Folies Temps Danse render in `Realisations.tsx` | Already implicitly covered — `projects.ts` is static data, no test currently asserts on it directly, but no change needed this phase | N/A (no regression risk — untouched by this phase's edits) | ✅ (structurally verified via direct code read, no test needed) |

### Sampling Rate
- **Per task commit:** targeted `rtk npx vitest run <touched test file>`
- **Per wave merge:** `rtk npm run test` (full suite — cheap, `environment: 'node'`, no browser/jsdom startup cost)
- **Phase gate:** Full suite green before `/gsd:verify-work`, plus a manual grep sweep: `rtk grep -rn "€\|prix\|tarif" src/app src/components src/lib/translations.ts` (excluding `demo/`, `api/crm/`) to catch anything the targeted tests didn't enumerate.

### Wave 0 Gaps
- [ ] `src/lib/translations.test.ts` — add a `describe('translations.landing — no pricing language (PRIX-01)')` block covering `t.landing.problems` (new), `t.landing.phone` (post-D-07 trim), `t.landing.work` (post-D-10 rewrite)
- [ ] `src/app/layout.test.ts` — new file, source-string assertion that `priceRange` is absent (mirrors `services.test.ts`'s `readFileSync` pattern)
- [ ] `src/app/calculateur-roi/page.test.ts` — new file, source-string assertions for removed fields/tokens (`prixMensuel`, `setup`, `€`, `ratioSocle`, `amortissementMois`)
- [ ] `src/app/page.test.ts` — new file, once Open Questions #1-#4 are resolved, asserting every landing CTA `href` matches the agreed-upon allowed destination set

## Security Domain

No new user input, authentication, session, or data-persistence surface is introduced by this phase (the ROI calculator remains 100% client-side arithmetic with no new form fields being added — only numeric `ControlRow`s being *removed*; no new POST/API routes). ASVS categories below are marked not-applicable or unchanged from existing baseline.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth surface touched |
| V3 Session Management | No | No session surface touched |
| V4 Access Control | No | No access-control surface touched |
| V5 Input Validation | No (unchanged) | `/calculateur-roi`'s remaining numeric inputs (`appelsJour`, `dureeMin`, `coutHoraire`, etc.) already use the existing `clamp()` + `type="number"` + `min`/`max` pattern (lines 35, 58-69) — this phase only *removes* two of these fields, it does not add new unvalidated input paths |
| V6 Cryptography | No | Not applicable |

### Known Threat Patterns for {stack}

Not applicable — this phase makes no changes to any trust boundary, input-validation surface, or data flow into a backend. The only "removal" risk is a broken TypeScript build (caught at compile time, not a security issue) — see Common Pitfalls #2.

## Sources

### Primary (HIGH confidence — direct repository reads, this session)
- `C:\portfolio\.planning\phases\08-landing-simplification-pricing-policy\08-CONTEXT.md` — full locked-decisions text
- `C:\portfolio\.planning\REQUIREMENTS.md` — PRIX-01/02, LANDING-01/02/03 exact wording
- `C:\portfolio\src\app\page.tsx`, `src\app\calculateur-roi\page.tsx`, `src\app\layout.tsx` (lines 1-60, 160-172), `src\app\services\page.tsx`
- `C:\portfolio\src\components\sections\{ProblemSection,PhoneAgent,Realisations,HeroSection,Manifeste,Partners,ContactSection,ServicesHeroSection,MaintenanceSection,OffersSection,PhoneAgentExplainer}.tsx`
- `C:\portfolio\src\components\layout\Navbar.tsx`
- `C:\portfolio\src\lib\translations.ts` (interface block lines 95-285; fr block 287-1059; en block 1061-1717; th block 1718-2484)
- `C:\portfolio\src\lib\translations.test.ts`, `src\data\services.test.ts` (existing `PRICE_PATTERN`/source-string audit patterns)
- `C:\portfolio\src\data\services.ts`, `src\data\projects.ts`
- `C:\portfolio\src\hooks\useReveals.ts`
- `C:\portfolio\vitest.config.ts`, `package.json`
- `C:\portfolio\graphify-out\GRAPH_REPORT.md` (community/god-node structure — confirmed no undiscovered hidden coupling relevant to this phase; `PhoneAgent.tsx`/`Realisations.tsx`/`ProblemSection.tsx` all appear as isolated single-node "thin communities," consistent with them being presentational leaf components with no cross-file dependents beyond `page.tsx`)
- Repository-wide `grep`/`Grep` tool sweeps for `€|prix|tarif|price|priceRange` across `src/` (this session, exhaustive for the files enumerated above)

### Secondary (MEDIUM confidence)
None — no external/web sources were needed; this is a closed-corpus internal refactor.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new stack, existing stack directly read from `package.json`
- Architecture: HIGH — every file/line reference verified by direct read this session
- Pitfalls: HIGH for #1/#2 (verified by grep/read), MEDIUM for #3/#4 (interpretation questions, not factual claims — correctly flagged as Open Questions rather than asserted pitfalls to "fix")

**Research date:** 2026-09-21
**Valid until:** Effectively indefinite for the factual/file-content claims (stable until someone else edits these files); treat the Open Questions as needing resolution before or during planning, not with a time-based expiry.
