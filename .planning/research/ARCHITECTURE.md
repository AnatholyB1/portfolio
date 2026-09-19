# Architecture Research

**Domain:** Feature integration into an existing Next.js marketing/CRM site (Sèvalys) — new service pages + lead-capture diagnostic simulator
**Researched:** 2026-09-20
**Confidence:** HIGH (all findings verified by reading the actual codebase — no external ecosystem uncertainty; this is an integration question, not a "what exists" question)

## Version correction (flag for PROJECT.md)

`.planning/PROJECT.md` and the milestone brief both say "Next.js 14 App Router." The installed stack is actually **Next.js 16.1.6 / React 19.2.3** (`package.json`). Still App Router, so none of the integration patterns below change, but two Next 15/16 behaviors matter for new code written in this milestone:
- Route `params`/`searchParams` are async (`Promise`-wrapped) in layouts/pages — matters if `/simulateur` or `/services/[slug]` reads either.
- `fetch` is no longer cached by default (Next 15+ changed the default from "force-cache" to "no-store"). Not directly relevant here since there's no server-side fetching in the new pages, but relevant if a future step adds SSR data fetching from Supabase.

## Standard Architecture (current state, verified by reading source)

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│ src/app  (Next.js 16 App Router, mixed server/client pages)           │
├───────────────────────────────────────────────────────────────────────┤
│  /            /services         /calculateur-roi   /demo  /demo/*     │
│  (marketing)  (ONE long page,   (client tool,       (CRM realtime     │
│               9 sections,       noindex, no          dashboard)       │
│               shows prices)     Supabase write)                       │
├───────────────────────────────────────────────────────────────────────┤
│ src/components/sections/*  — one component per page section           │
│ src/components/layout/*    — Navbar, Footer (shared, absolute hrefs)  │
│ src/components/ui/ClientProviders.tsx — dynamic(ssr:false) registry   │
├───────────────────────────────────────────────────────────────────────┤
│ src/context/LanguageContext.tsx  ←→  src/lib/translations.ts          │
│ (fr/en/th, client-only, localStorage + navigator.language)            │
├───────────────────────────────────────────────────────────────────────┤
│ src/app/api/crm/{products,stock,orders}/route.ts  — VAPI-facing       │
│ src/app/api/contact/route.ts — Resend email only, no Supabase write   │
├───────────────────────────────────────────────────────────────────────┤
│ src/lib/supabase.ts — browser client (anon) + createServerClient()   │
│ Supabase project — tables: products, stock(?), orders                │
│   (no migration files in repo — schema lives only in Supabase itself) │
└───────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities (as actually implemented)

| Component | Responsibility | Notes |
|-----------|----------------|-------|
| `src/app/services/page.tsx` | ONE marketing page, 9 stacked sections (Hero → Problem → Approach → **Offers (has prices)** → PhoneAgentExplainer → **Maintenance (has prices)** → Options → Methodology → Reassurance → Partners → FinalCta) | `'use client'` because `useReveals()` needs `IntersectionObserver`. Metadata lives in a sibling `layout.tsx`, never in `page.tsx`. |
| `src/app/calculateur-roi/page.tsx` | Standalone client-only calculator tool, zero backend, zero Supabase | Closest existing analog to the simulator's *interaction model* (controlled state, live recompute) but NOT its *persistence model* (this page writes nothing). `layout.tsx` sets `robots: { index: false, follow: false }` because it's a sales-rep tool, not an SEO page. |
| `src/context/LanguageContext.tsx` + `src/lib/translations.ts` | fr/en/th strings, one big `Translations` interface, one object per language | 100% client-side (`localStorage`, `navigator.language`). No server-side locale routing (no `/en/`, `/th/` URL segments) — language is a client toggle, same URL for every language. |
| `src/components/ui/ClientProviders.tsx` | Central registry of `dynamic(..., { ssr:false })` imports (CustomCursor, CinemaIntro, MethodologySectionLazy) | Mandatory pattern for anything using Three.js/GSAP/browser-only APIs — Turbopack forbids `ssr:false` directly inside a Server Component. |
| `src/app/api/crm/{products,orders,stock}/route.ts` | VAPI tool-calling backend for the Feuillette phone-agent demo | `createServerClient()` currently uses the **anon key**, not service_role, despite the comment "Client serveur (service_role)" — the function is misnamed/mis-documented, not misconfigured with a secret key. Confirm before assuming RLS is bypassed server-side. |
| `src/app/api/contact/route.ts` | Sends two Resend emails (prospect ack + internal notification) | **Does not write to Supabase at all.** The existing contact form is not currently in the CRM — important precedent: contact ≠ CRM lead today. |

## Recommended Project Structure (additions for this milestone)

```
src/app/
├── services/
│   ├── page.tsx                     # existing — becomes overview/index (see decision below)
│   ├── layout.tsx                   # existing metadata layout
│   └── [slug]/                      # NEW — one route per service
│       ├── page.tsx                 # NEW — reads slug, renders shared template + per-service content
│       └── layout.tsx               # NEW (or generateMetadata in page) — per-service <title>/<meta>/JSON-LD
├── simulateur/
│   ├── page.tsx                     # NEW — 'use client', multi-step wizard, ends with Supabase insert
│   └── layout.tsx                   # NEW — metadata (indexable, this IS an SEO pillar page per the SEO doc)
├── api/
│   ├── crm/{products,stock,orders}/ # unchanged — do not touch (explicit constraint)
│   ├── contact/route.ts             # unchanged — do not touch
│   └── simulateur/                  # NEW (recommended) — route.ts, POST-only, inserts prospect row
├── sitemap.ts                       # MODIFIED — add /services/*, /simulateur entries
└── robots.ts                        # check only — likely no change needed (already permissive)

src/components/
├── sections/
│   ├── ServiceHero.tsx, ServiceProblem.tsx, ...   # NEW — shared, slug-agnostic building blocks
│   └── simulator/                    # NEW — Step1Qualify, Step2Needs, StepResult, etc.
├── layout/Navbar.tsx                 # MODIFIED — services link becomes dropdown or stays single link to /services index
└── ui/ClientProviders.tsx            # MODIFIED only if simulator uses canvas/GSAP (unlikely — keep it plain React state, no dynamic import needed)

src/lib/
├── translations.ts                   # MODIFIED — add nav/simulator UI strings only (see i18n decision)
├── services-content.ts               # NEW — per-service copy (fr only, outside i18n system — see i18n decision)
└── supabase.ts                       # unchanged (createServerClient/browser client reused as-is)
```

### Structure Rationale

- **`services/[slug]/` dynamic route, not 4 separate static folders:** the 4 new services + N existing ones (site web, agent vocal, maintenance, branding-existing-offer) share the same template shape ("problème résolu / fonctionnement / enjeux / FAQ / double CTA"). A dynamic segment with a content map avoids duplicating the page shell 8 times and matches the SEO doc's per-service pillar-page pattern (`/services/community-management`, `/services/branding`, etc.) while keeping one place to fix template-wide layout bugs.
- **`services-content.ts` outside `translations.ts`:** mirrors the SEO doc's own explicit rule for blog/secteurs content — long-form marketing copy should not be forced into the 3-language `Translations` interface. See the i18n decision section below for full rationale.
- **`api/simulateur/route.ts` as a dedicated route, not a Supabase browser-client insert from the client component:** the CRM Supabase browser client currently only exists for the anon-key realtime dashboard reads on `/demo`. Writing a new prospect table should go through a server route (service_role or a scoped anon insert policy) so you can validate/sanitize input server-side (same pattern as `api/contact/route.ts`, which validates before sending) rather than exposing table-insert permissions directly to the browser.

## Architectural Patterns

### Pattern 1: Per-service dynamic route with a shared template + content map

**What:** One `src/app/services/[slug]/page.tsx` that looks up `slug` in a content object/array (in `services-content.ts`) and renders shared section components (`ServiceHero`, `ServiceProblem`, `ServiceHowItWorks`, `ServiceStakes`, `ServiceFAQ`, `ServiceFinalCta`) with per-service copy injected as props.
**When to use:** All 4 new services, and ideally the existing services too (site web, agent vocal, maintenance) once migrated off the single long `/services` page — but migrating existing content is optional for this milestone; the safe move is to add the new dynamic route alongside the existing static page without breaking it.
**Trade-offs:** Pro — one template to maintain, consistent FAQ/JSON-LD/CTA structure required by the SEO doc. Con — `generateStaticParams` must list every slug for SSG; forgetting a slug there means that service page 404s or falls back to on-demand ISR depending on `dynamicParams` config — verify explicitly during implementation.

**Example:**
```typescript
// src/app/services/[slug]/page.tsx
import { getServiceBySlug, allServiceSlugs } from '@/lib/services-content';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return allServiceSlugs.map((slug) => ({ slug }));
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // Next 16: params is a Promise
  const service = getServiceBySlug(slug);
  if (!service) notFound();
  return <ServiceTemplate service={service} />;
}
```

### Pattern 2: Client-side multi-step wizard, server-side single insert on completion

**What:** `/simulateur/page.tsx` is `'use client'` and holds all wizard state (`useState`/`useReducer` for current step + answers), exactly like `calculateur-roi` holds `v`/`upside` state. Unlike the calculator, the LAST step calls `fetch('/api/simulateur', { method: 'POST', body: JSON.stringify(answers) })` instead of just rendering a result client-side.
**When to use:** Any interactive tool that must persist something server-side at the end but stays fully responsive during the interactive steps (no network round-trip per step).
**Trade-offs:** Pro — no server round-trips during navigation, feels instant like the ROI calculator. Con — if the user abandons mid-wizard, nothing is captured (no partial-lead capture) — acceptable for v1.1 scope but worth flagging as a later differentiator (e.g., capture partial lead on step 2/4 via a debounced background call) if drop-off is high.

**Example:**
```typescript
// src/app/simulateur/page.tsx (excerpt)
async function submitDiagnostic(answers: DiagnosticAnswers) {
  const res = await fetch('/api/simulateur', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answers),
  });
  if (!res.ok) { /* show inline error, keep answers in state so user can retry */ }
  const { recommendedServices } = await res.json();
  setStep('result');
  setRecommended(recommendedServices);
}
```

### Pattern 3: New Supabase table additive to the existing CRM schema, not a parallel system

**What:** Add one new table (e.g., `prospects` or `diagnostic_leads`) in the SAME Supabase project used by `products`/`orders`/`stock`. Do not spin up a second Supabase project or a third-party form backend (Airtable, Google Sheets, etc.) for this.
**When to use:** Always, per the milestone's explicit constraint ("réutiliser ce même stockage plutôt que créer un système parallèle, à confirmer dans le milestone" — from the SEO doc addendum).
**Trade-offs:** Pro — one CRM to check, `/demo` dashboard could eventually surface these leads too (future phase, out of scope now), consistent with "no parallel systems" instruction. Con — no migration files exist in this repo today (schema was created directly in Supabase, not via tracked `.sql` migrations) — this milestone is a good opportunity to start tracking schema changes (e.g., a `supabase/migrations/` folder or at minimum documenting the new table's DDL in the phase's SUMMARY.md) since there is currently zero source-of-truth for schema in git.

## Data Flow

### Request Flow — Simulator submission

```
[User completes wizard, clicks final step]
    ↓
[/simulateur client component] → fetch POST /api/simulateur
    ↓
[api/simulateur/route.ts] → validate payload (mirror api/contact/route.ts's isNonEmptyString pattern)
    ↓
[createServerClient()] → supabase.from('prospects' or similar).insert({...})
    ↓
[optional: Resend email to contact@sevalys.com, mirroring api/contact's notification email]
    ↓
[Response: { ok: true, recommendedServices: [...] }]
    ↓
[Client renders result step with recommended services + CTA "appeler" / "écrire"]
```

### Key Data Flows

1. **Diagnostic → lead capture:** Wizard answers computed 100% client-side (recommendation logic can be a pure function, no need for server-side scoring) → single POST at the end → single INSERT into the new prospects table → confirmation shown inline (no redirect needed, unlike a typical form-to-thank-you-page flow, since losing wizard state on redirect would be jarring).
2. **Language toggle → content:** Existing pattern (`useLanguage()` → `t.services.*`) applies only to nav chrome, wizard UI labels/buttons, and validation messages if service pages/simulator stay partially in i18n (see decision below) — NOT to the new long-form per-service body copy, which is French-only in a separate file.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (pre-launch, low traffic) | Single Supabase table insert per submission is more than sufficient. No queue, no rate limiting needed yet. |
| Moderate traffic (site starts ranking, dozens of leads/week) | Add basic spam protection to `/api/simulateur` (honeypot field or simple rate limit by IP) before it becomes a target — the SEO doc explicitly positions `/simulateur` as a highly-linked, AI-crawler-visible pillar page, which also makes it a bot-submission target. |
| High traffic (hundreds of leads/week, multi-service growth) | Not a near-term concern for this milestone; if it happens, the CRM `/demo` dashboard would need a "leads" view added (separate future phase), and the content map in `services-content.ts` might move to a CMS — explicitly out of scope now. |

### Scaling Priorities

1. **First bottleneck:** Spam/bot submissions to a public, unauthenticated insert endpoint — mitigate with basic validation + honeypot, not full auth (this is a public lead-gen tool, requiring login would defeat the purpose).
2. **Second bottleneck (much later):** `services-content.ts` growing unwieldy if every future service is hand-added to one file — not a v1.1 concern with only ~7-8 total services.

## Anti-Patterns

### Anti-Pattern 1: Forcing new long-form service copy through `translations.ts`

**What people do:** Add `services.communityManagement.hero.title_l1`, etc. to the shared `Translations` interface for every new service, because that's "how it's always been done" on `/services`.
**Why it's wrong:** The project's own SEO strategy doc (`docs/strategie-seo-geo-llm-2026-09.md`, section 1 and section 9) explicitly warns against this for exactly this kind of long-form content: it forces mandatory fr/en/th translation of every paragraph, slows down publishing new pages, and these are core-nav SEO pillar pages meant to rank in French local search — translating them to `en`/`th` provides near-zero SEO value for a Tours, France SMB audience and adds ongoing maintenance drag for content that will be edited frequently (SEO copy gets iterated).
**Do this instead:** Keep `t.nav.*`-style short UI strings (nav labels, wizard buttons, generic CTA text, validation errors) in `translations.ts` since those are already established i18n surface area and are cheap to translate. Put the actual service page body copy (hero headline, problem/solution paragraphs, FAQ Q&A, stakes/benefits lists) in a French-only content file (`services-content.ts` or MDX per service), exactly like the recommended pattern for `/secteurs/*` and `/blog/*`. See "i18n decision" below for the full reasoning and a concrete boundary line.

### Anti-Pattern 2: Writing the simulator's Supabase insert directly from the browser

**What people do:** Reuse the existing `supabase` browser client (anon key, used today only for realtime reads on `/demo`) to call `.insert()` directly from the `/simulateur` client component.
**Why it's wrong:** No existing precedent in this codebase does a browser-side write — `orders` (the closest analog) is written server-side in `api/crm/orders/route.ts` even though VAPI is itself calling from a "trusted" backend context. A public-facing wizard is a much less trusted caller (any bot can hit the anon `insert` endpoint if RLS allows it), and a browser-side insert also means the recommendation logic and any server-side dedupe/spam-check has to be duplicated or skipped.
**Instead:** Route through a new `api/simulateur/route.ts` (mirrors `api/contact/route.ts`'s validate-then-act shape), matching the codebase's existing convention that all Supabase writes go through a server route, never directly from a client component.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase (existing project) | `createServerClient()` from `src/lib/supabase.ts`, reused as-is — add a new table, no new project/client needed | Confirm via Supabase MCP/dashboard whether RLS is enabled on `products`/`orders`/`stock` before assuming the same posture is safe for a public-write `prospects` table — a lead-capture table written by anonymous users needs an INSERT-only policy (no SELECT/UPDATE/DELETE for anon), distinct from the internal CRM tables. |
| Resend (existing, via `api/contact/route.ts`) | Reuse the same `Resend` client pattern for an optional "new diagnostic lead" notification email to `contact@sevalys.com` | Not strictly required (the Supabase write is enough to have the lead), but matches how `api/contact` already double-writes: prospect ack email + internal notification email. Simulator could send only the internal notification (no need to email the prospect a receipt for a diagnostic, unlike a contact form). |
| VAPI/Twilio/ElevenLabs phone agent (existing) | **No changes** — explicit "Out of Scope" / constraint in PROJECT.md (`api/crm/*` routes must not change) | Not touched by this milestone at all; the new `prospects` table is a sibling of `products`/`orders`, not a modification to them. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `Navbar` ↔ new `/services/[slug]` routes | Direct `<a href>` (absolute hrefs, per existing constraint — relative hrefs break navigation from `/services`) | Decide now whether `/services` nav item becomes a dropdown (Site Web / Agent Vocal / Community Management / Branding / Meta Ads / Google Ads / Maintenance) or stays a single link to an index page that lists all services with links to `/services/[slug]` — the latter is simpler and lower-risk for this milestone; a mega-menu dropdown is a nice-to-have, not required by any stated requirement. |
| `LanguageContext` ↔ new pages | Existing `useLanguage()` hook usable anywhere client-side, no changes needed to the context/provider itself | Only the CONTENT SOURCE changes (i18n object vs. new content file), not the mechanism — `/services/[slug]` and `/simulateur` can still show the language switcher in the Navbar (it's a global nav element) even if the body content itself doesn't translate; this is the same posture `/calculateur-roi` already has (Navbar renders `t.nav.*` even though the ROI tool's own body text is hardcoded French, untranslated, because it's an internal sales tool — for `/simulateur`/`/services/[slug]` being public SEO pages, French-only body content is a deliberate scope choice, not an oversight, and should be stated as such in the page copy/UX rather than silently breaking the switcher). |
| `/simulateur` wizard state ↔ `api/simulateur` route | One-shot `fetch` POST at wizard completion, JSON payload of all answers | No shared state/store needed — wizard is local `useState`, exactly like `calculateur-roi`'s `v` state object; no Redux/Zustand needed for this scope. |
| `sitemap.ts` ↔ new routes | Static array literal, manually maintained (current pattern, not dynamically generated from a route scan) | Must remember to add every new `/services/[slug]` URL and `/simulateur` by hand — no automatic sync exists today; a follow-up improvement (not required for v1.1) would be generating this list from `allServiceSlugs` in `services-content.ts` to prevent drift. |

## i18n Decision (explicit recommendation, since the milestone brief asks for one)

**Recommendation: new service pages and `/simulateur` follow the SAME pattern as `/secteurs` and `/blog` — i.e., body content lives OUTSIDE `translations.ts`, in French only. Only chrome/UI strings (nav label, wizard step labels/buttons, generic CTA labels, error/validation text) stay inside `translations.ts`.**

Rationale:
1. **The SEO doc already drew this line for a reason that applies equally here.** It explicitly says all new long-form content should live outside `translations.ts` "to avoid mandatory 3-language translation of every article." A service page's body (problem/solution narrative, FAQ, stakes) is exactly this kind of long-form content — the fact that it's reached via core nav rather than a blog index doesn't change its shape or its translation cost. "Core nav vs. blog" is a navigation/IA question, not a content-type question; what matters for the i18n decision is "is this long-form marketing prose that gets iterated on and needs to rank in French local search" — yes for both blog/secteurs AND the new service pages.
2. **Target audience is French SMB owners in Tours/Indre-et-Loire.** The `en`/`th` translations exist for the existing `/` and `/services` pages presumably for occasional international contacts, not because these are core acquisition channels — the entire SEO strategy (GEO/AEO local, "agence web tours", city pages) is French-only by construction. Forcing `en`/`th` on 4-8 new SEO-driven service pages adds translation cost with no strategic upside; the SEO doc doesn't mention `en`/`th` variants anywhere in its content plan.
3. **`/simulateur` is explicitly called out as an SEO/AEO pillar page** in the SEO doc addendum ("le simulateur devient lui-même un atout SEO/GEO/AEO... hautement citable par les moteurs IA"). Its value is tied to being indexed and cited in French for French queries — same reasoning as the service pages.
4. **Practical build-speed argument:** keeping new content out of the shared `Translations` interface means adding a new service page never requires touching/growing the giant `translations.ts` interface (which today is already large and shared across `nav`, `services`, `landing`) — lowers risk of merge conflicts or accidentally breaking existing `fr`/`en`/`th` objects while iterating on new SEO copy.
5. **Boundary to apply concretely:** if a string appears in `Navbar`, `Footer`, or is a UI-mechanical label the wizard needs regardless of language (e.g. "Étape 2/4", "Suivant", "Retour") — put it in `translations.ts`. If a string is marketing/explanatory prose specific to one service or is FAQ/body content — put it in the new French-only content file(s). The existing `/services` page's prices/offers content (already in i18n) is NOT a precedent to follow for the new pages — it predates this milestone's "no i18n for long-form" rule and migrating it is optional/out-of-scope, not a model to copy forward.

This directly resolves the milestone's open question: service pages should NOT stay inside i18n just because they're core nav rather than blog content — nav placement is irrelevant to the i18n decision; content type and translation ROI are what matter, and both point the same direction as the blog/secteurs decision already made.

## Suggested Build Order (dependency-driven)

1. **Supabase schema addition first.** Create the new `prospects` (or `diagnostic_leads`) table in the existing Supabase project, with an anon INSERT-only RLS policy. Nothing else can be tested end-to-end without this existing. Document the DDL in the phase's plan/summary since there are no tracked migration files in this repo today.
2. **`api/simulateur/route.ts` second.** Build and test the insert endpoint (validate payload, insert row, optional Resend notification) against the table from step 1, independent of any UI — can be tested with `curl`/Postman before the wizard UI exists.
3. **`services-content.ts` + shared service page template (`services/[slug]/page.tsx` + section components) third.** This has no dependency on the simulator and can be built/reviewed in parallel with steps 1-2 if using multiple work-streams, but is listed after because it's lower-risk/more mechanical (content authoring + template) than the schema/API work.
4. **`/simulateur` wizard UI fourth**, wired to the route from step 2. Depends on step 2 existing; benefits from step 3 existing too (the wizard's recommendation step needs to link to specific `/services/[slug]` pages, so slugs should be finalized first).
5. **Navbar update + sitemap.ts update last.** Wire the new routes into navigation and the sitemap only once the pages are real and reviewable — avoids shipping dead links during development. Also update `llms.txt` at this point per the SEO doc's own "enrich llms.txt with every new page" rule.
6. **Landing page simplification** (removing pricing tables, restructuring CTAs toward `/simulateur` and contact) can happen at any point after step 3/4 are far enough along to link to, but has no hard technical dependency on the others — it's a content/copy change to existing components (`OffersSection`, `MaintenanceSection`, `FinalCtaSection` on `/` and possibly `/services`), not new infrastructure. Sequence it last only for PM/review reasons (don't change the money-facing page until the replacement funnel is verified working), not for technical dependency reasons.

## Sources

- Direct codebase reads (HIGH confidence, this is what the code actually does today): `src/app/services/page.tsx`, `src/app/calculateur-roi/{page,layout}.tsx`, `src/app/api/crm/{orders,products}/route.ts`, `src/app/api/contact/route.ts`, `src/lib/supabase.ts`, `src/lib/translations.ts`, `src/context/LanguageContext.tsx`, `src/components/ui/ClientProviders.tsx`, `src/components/layout/Navbar.tsx`, `src/app/sitemap.ts`, `package.json`.
- `docs/strategie-seo-geo-llm-2026-09.md` (project's own SEO strategy doc, including the 2026-09-20 addendum specifically about this milestone's 4 new services + simulator) — HIGH confidence, authored for this exact project.
- `.planning/PROJECT.md`, `.planning/STATE.md` — HIGH confidence, current project state/constraints.
- No Context7/official Next.js docs lookup was needed — this is a codebase-integration question, not an ecosystem/library-capability question. The one external-fact claim (Next 15+ changed default fetch caching, async params) is stated as a general Next.js version-migration fact from training knowledge and should be spot-checked against the Next.js 16 release notes/upgrade guide before relying on it if the implementation actually adds server-side data fetching in these new routes — flagged as MEDIUM confidence pending that check.

---
*Architecture research for: Sèvalys v1.1 (Community Management / Branding / Meta Ads / Google Ads service pages + diagnostic simulator)*
*Researched: 2026-09-20*
