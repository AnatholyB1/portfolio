# Phase 6: Service Pages (Template + Content) - Research

**Researched:** 2026-09-20
**Domain:** Next.js App Router dynamic routing, i18n content modeling, on-page SEO/AEO schema markup
**Confidence:** HIGH (framework mechanics, verified live against installed version) / MEDIUM (content strategy, verified against project conventions) / LOW (external design inspiration — no direct 21st.dev API access this session)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Rewrite content fresh for all 5 existing offers — do not port the current short marketing blurbs as a base. The new problème/fonctionnement/enjeux structure is different enough in purpose that porting-and-expanding would fight the new format.
- **D-02:** Target depth is concise, per SVC-06 literally — roughly 300-500 words total per page. Do not default to long-form "pillar" depth (800-1200+ words) despite the SEO/GEO/AEO strategy doc's general preference for citable long-form; conciseness wins for this milestone.
- **D-03:** Keep the existing checkmark-bullet list format (✓ feature bullets) under the "fonctionnement" section — do not convert to flowing prose. Reuses `OffersSection.tsx`'s established visual/content pattern.
- **D-04:** Align the 5 existing offer names/slugs to the SEO doc's keyword clusters where it suggests a better-matching term (not a blanket rename) — the 4 new offers already have their slugs fixed by the SEO doc (`community-management`, `branding`, `meta-ads`, `google-ads`).
- **D-05:** Social proof strategy is a hybrid: reuse the 3 existing case studies (Feuillette, Gecko Cabane, Les Folies Temps Danse) on a service page only where genuinely relevant to that service; otherwise use trust signals (methodology, guarantees, "sans engagement", responsiveness) instead of forcing an unrelated case study. Real per-service case studies for the 4 new offers are v2 scope (SVC2-01).
- **D-06:** Apply this same hybrid approach uniformly across all 9 pages, including the 5 existing offers — do not treat existing vs new offers differently for social proof.
- **D-07:** Claude's discretion to draft the exact Branding vs Rebranding+Premium scope split, informed by typical agency scoping conventions and the SEO doc's framing. Default direction: Branding = identity/logo/guidelines/brand-voice work with no site changes; Rebranding+Premium = full site rebuild bundled with premium branding. Confirm exact wording during planning/content writing.
- **D-08:** The Branding and Rebranding+Premium pages must explicitly cross-link to each other so prospects can self-select the right offer.
- **D-09:** Claude's discretion whether to group the 9 services by category or keep a flat ordered list on `/services` — pick whichever reads best with 9 items; grouping requires adding a category field to the data model if chosen.
- **D-10:** Drop the "popular" emphasis tag/badge that exists today on the offers grid. No static popularity badge on the new index — the diagnostic simulator (Phase 7) is the intended mechanism for surfacing fit, not a badge.
- **D-11:** Pull both structural/component inspiration from 21st.dev (FAQ accordion patterns, service/feature-card layouts) and content/flow inspiration from other agency or SaaS marketing sites — both sources in scope.
- **D-12:** No specific 21st.dev components or reference sites were named — researcher/`/gsd:ui-phase` selects fitting examples.

### Claude's Discretion

- Exact Branding vs Rebranding+Premium wording/scope split (D-07) — draft it, confirm during planning.
- `/services` index grouping vs flat list (D-09) — pick based on what reads best.
- Specific 21st.dev components and reference sites to draw from (D-12) — research/ui-phase selects.

### Deferred Ideas (OUT OF SCOPE)

- Real per-service case studies for the 4 new offers (Community Management, Branding, Meta Ads, Google Ads) — tracked as `SVC2-01` (v2). The hybrid social-proof approach (D-05) is the explicit interim measure.
- `priceRange` in the `Service` schema.org objects recommended by the SEO doc conflicts with the site-wide no-price policy — flagged for whoever plans Phase 9 (SEO & Discovery Wiring) to resolve, not actionable in this phase.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SVC-01 | Chaque offre a sa propre page dédiée `/services/[slug]` | Architecture Patterns (dynamic route + `generateStaticParams`), `src/data/services.ts` data model proposal |
| SVC-02 | Structure fixe : problème → fonctionnement → enjeux → preuve sociale → FAQ → double CTA, jamais de prix | Recommended Project Structure, translations.ts type shape proposal, Common Pitfalls (dead `/simulateur` link) |
| SVC-03 | `/services` devient une page d'index listant les 9 services | Architecture Patterns (index page redesign), reuse of `.offer` card CSS |
| SVC-04 | Branding distingue son périmètre de "Rebranding + Site Premium" | Assumptions Log (A1: scope split draft), D-07/D-08 cross-link pattern |
| SVC-05 | Schema.org `FAQPage` + bloc réponse directe citable sous H1/H2 | Code Examples (official Next.js JSON-LD pattern), Common Pitfalls (language-locking, XSS escaping) |
| SVC-06 | Contenu i18n dans `translations.ts` (fr/en/th), concis | Architecture Patterns (data/content split precedent from `projects.ts`), Standard Stack |

</phase_requirements>

## Summary

This phase adds the **first dynamic route** (`/services/[slug]`) to a Next.js **16.1.6** (not 14 — see Pitfall 1) App Router site that otherwise uses only static routes. The codebase has no UI component library (no shadcn/ui, no Radix, no headless-UI packages in `package.json`) — every section is a hand-rolled React component styled with plain custom CSS classes (`.sec`, `.wrap`, `.offer`, `.sec-head`, etc.) defined in `src/app/globals.css`. Tailwind v4 is installed but the existing component style is closer to a bespoke design-token CSS system than utility-first classes. New work should follow this existing convention rather than introduce a component library.

The codebase already has a clean precedent for splitting **locale-agnostic static data** from **locale-specific copy**: `src/data/projects.ts` holds `{index, name, year, href}` while `src/lib/translations.ts` holds the per-locale `desc`/`tags` looked up by `index`. The 9 service pages should follow the identical pattern: a new `src/data/services.ts` holds `{slug, index, ...}` (locale-agnostic, drives `generateStaticParams` and routing) while `translations.ts` gets a new `t.services.pages.items[]` array (or similar) holding the localized problème/fonctionnement/enjeux/preuveSociale/faq content, indexed by the same `index`.

Because `layout.tsx` files in this codebase are Server Components carrying static `metadata` exports while `page.tsx` files are Client Components (for `useReveals()`), the per-slug metadata and per-slug `FAQPage` JSON-LD must be generated in `layout.tsx` via `generateMetadata({params})` (Next.js 16 requires `params` to be awaited as a Promise), using a **hardcoded French content source** (the `fr` object exported from `translations.ts`, or the new French-language service data directly) — because the site's language is a **client-only, post-hydration** concept (`useState('fr')` + `localStorage`, no locale in the URL), the server-rendered/crawled version of every page is always French. This exactly matches the existing root `layout.tsx` precedent, which already hardcodes its global `FAQPage` JSON-LD in French rather than pulling from the `LanguageContext`.

**Primary recommendation:** Model content as `src/data/services.ts` (static, locale-agnostic slug/order/category/caseStudyRef) + a new `t.services.pages.items[]` block in `translations.ts` (locale-specific copy) exactly mirroring the `projects.ts`/`Realisations.tsx` split already in the codebase; generate per-slug metadata and FAQPage JSON-LD in `[slug]/layout.tsx` (Server Component, `generateMetadata` + a hardcoded-French JSON-LD builder) while `[slug]/page.tsx` stays a Client Component reading `params` via React's `use()` hook and rendering copy through `useLanguage()`; render the FAQ with native `<details>/<summary>` (no accordion library, no custom JS state machine) to guarantee Google can crawl the full answer text regardless of open/closed state.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Route generation for 9 slugs (`generateStaticParams`) | API/Backend (build-time, Server Component) | — | Runs at build time in `page.tsx`/`layout.tsx`, not client-reachable code |
| Per-slug `<title>`/meta description | Frontend Server (SSR) | — | `generateMetadata` in `layout.tsx`, Server Component only (Next.js constraint) |
| Per-slug `FAQPage` JSON-LD | Frontend Server (SSR) | — | Must be in initial HTML for crawlers; rendered in `layout.tsx` alongside `{children}` |
| Locale-specific copy rendering (problème/fonctionnement/…) | Browser/Client | — | `page.tsx` is `'use client'` for `useReveals()`; reads `useLanguage()` context, which only resolves post-hydration |
| Scroll-reveal animation (`data-reveal`) | Browser/Client | — | `useReveals()` IntersectionObserver, unchanged pattern from existing sections |
| Slug → static data lookup (`services.ts`) | Frontend Server (SSR) build step | Browser/Client (re-imported for consistent lookup) | Same static module imported by both `layout.tsx` (server) and `page.tsx` (client) — no duplication |
| FAQ accordion open/close UI state | Browser/Client | — | Native `<details>`, no JS required at all — works without hydration |
| `/services` index listing | Frontend Server (SSR) | Browser/Client (reveal animation) | Static list rendered server-side, hydrated for reveal effects only |

## Standard Stack

No new runtime dependencies are required for this phase. The existing stack is sufficient.

### Core (already installed — verified against `package.json`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 [VERIFIED: package.json] | App Router, dynamic routes, metadata API | Already the project's framework — **not 14** as assumed in the phase brief; see Pitfall 1 |
| react / react-dom | 19.2.3 [VERIFIED: package.json] | Component runtime, `use()` hook for reading Promise props in Client Components | Required for the params-in-client-component pattern (Next.js 15+/16) |
| typescript | ^5 [VERIFIED: package.json] | Type-checked content model (`services.ts`, `translations.ts` interfaces) | Existing project convention |
| tailwindcss | ^4 [VERIFIED: package.json] | Present but the codebase's actual component styling is hand-rolled CSS classes in `globals.css`, not Tailwind utility classes | Follow existing convention, don't introduce a new styling paradigm for 9 pages |
| vitest | ^4.1.11 [VERIFIED: package.json] | Unit tests (node environment only, no DOM/RTL configured) | Existing test runner; used today for schema/route-logic tests only |

### Supporting
None required. FAQ accordion, JSON-LD builder, and card grids can all be implemented with native HTML + the existing custom CSS system — no new package needed.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written JSON-LD object literals | `schema-dts` [ASSUMED — package name found via official Next.js docs citation, not independently verified with slopcheck this session; npm registry confirms `schema-dts@2.0.0` exists] | Gives compile-time type safety for the `FAQPage`/`Question`/`Answer` shapes; adds a devDependency for a project that currently hand-types everything. Recommended only if the planner wants stronger typing — not required to satisfy SVC-05. |
| Native `<details>/<summary>` FAQ accordion | A 21st.dev/shadcn accordion component (Radix-based) | Radix-based accordions pull in `@radix-ui/react-accordion`, `class-variance-authority`, etc. — a new dependency chain for a project with zero existing UI-library dependencies. Native `<details>` satisfies Google's "answer must be visible/crawlable" constraint by default and needs no JS. |
| Flat `/services` index with a static grid | A carousel/slider library | Only 9 items — a static grid (reusing `.offer`/`.offers-grid` CSS) is simpler and avoids adding a slider dependency for a non-scrolling use case. |

**Installation:** None required — no `npm install` needed for this phase.

## Package Legitimacy Audit

Not applicable — this phase installs no new external packages. If the planner chooses to add `schema-dts` for JSON-LD typing, run the full Package Legitimacy Gate protocol (slopcheck + `npm view schema-dts version`) before that install; it has not been run in this research session because the install is optional/discretionary, not required to satisfy any SVC-* requirement.

## Architecture Patterns

### System Architecture Diagram

```
Visitor request: GET /services/agent-vocal-ia
        │
        ▼
┌─────────────────────────────────────────────┐
│ /services/[slug]/layout.tsx  (Server Comp.)  │
│  - generateStaticParams() ← src/data/        │
│    services.ts (9 static slugs, build time)  │
│  - generateMetadata({params})                │
│      → await params → find service by slug   │
│      → pulls FRENCH copy directly (title/H1  │
│        pattern "[Service] à Tours · [bénéf]") │
│  - renders <script type="application/ld+json"│
│    id="faq-jsonld"> FAQPage schema (French,   │
│    escaped, built from same static source)   │
│  - notFound() if slug unknown (dynamicParams  │
│    = false recommended — fixed set of 9)      │
└─────────────────────────────────────────────┘
        │  {children}
        ▼
┌─────────────────────────────────────────────┐
│ /services/[slug]/page.tsx  ('use client')    │
│  - const { slug } = use(params)              │
│  - const { t } = useLanguage()  (fr/en/th,    │
│    resolved client-side post-hydration)       │
│  - looks up service record by slug in         │
│    src/data/services.ts → gets `index`       │
│  - renders t.services.pages.items[index]:     │
│      Hero (H1) → Problème (H2) → Fonctionnement│
│      (✓ bullets) → Enjeux → Preuve sociale    │
│      (case study OR trust signals per D-05)   │
│      → FAQ (<details> per question, H2+H3)    │
│      → Double CTA: /simulateur + /#contact    │
│  - useReveals() mounts IntersectionObserver   │
└─────────────────────────────────────────────┘
        │
        ▼
   Rendered HTML (French, SSR) + hydrated
   client-side i18n swap if lang ≠ fr
```

### Recommended Project Structure
```
src/
├── data/
│   ├── projects.ts          # existing precedent — do not modify
│   └── services.ts          # NEW: static, locale-agnostic per-service metadata
│                             #   { slug, index, category?, caseStudyProjectIndex? }
├── lib/
│   ├── translations.ts      # extend: add `pages: { items: ServicePageContent[] }`
│   │                         #   under t.services, one entry per service, per locale
│   └── serviceJsonLd.ts     # NEW: pure function buildFaqJsonLd(faqs) -> object
│                             #   (testable in isolation, no React/Next dependency)
├── app/
│   └── services/
│       ├── page.tsx          # rewritten: index listing (was single mega-page)
│       ├── layout.tsx        # unchanged pattern: static index metadata
│       └── [slug]/
│           ├── page.tsx      # NEW: 'use client', use(params), renders template
│           └── layout.tsx    # NEW: generateMetadata + per-page FAQPage JSON-LD
└── components/
    └── sections/
        ├── ServicePageHero.tsx        # NEW (or adapt ServicesHeroSection)
        ├── ServiceFaqAccordion.tsx    # NEW: <details>/<summary>, no JS state
        └── ServiceIndexGrid.tsx       # NEW: reuses `.offer`/`.offers-grid` CSS
```

### Pattern 1: Dynamic route with static generation for a fixed, small slug set
**What:** `generateStaticParams` returning all 9 known slugs at build time; `dynamicParams = false` so an unknown slug 404s cleanly instead of attempting on-demand render.
**When to use:** Exactly this case — a small, fully-known, rarely-changing set of routes.
**Example:**
```tsx
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-static-params (v16.3.5, fetched live)
// app/services/[slug]/page.tsx
import { services } from '@/data/services';

export async function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}
export const dynamicParams = false; // unknown slugs -> 404, not on-demand render
```

### Pattern 2: Per-slug metadata + JSON-LD in a Server Component layout, content in a Client Component page
**What:** `layout.tsx` stays a Server Component so it can use `generateMetadata` (Server-Component-only in Next.js) and render the JSON-LD `<script>` tag directly in HTML (crawlable at request time, no hydration needed); `page.tsx` stays `'use client'` per this codebase's established `useReveals()` requirement, reading `params` via React's `use()`.
**When to use:** Whenever a dynamic route needs SEO metadata/schema AND the codebase's established pattern requires the page body to be a Client Component.
**Example:**
```tsx
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata (v16.3.5, fetched live)
// app/services/[slug]/layout.tsx  (Server Component — no 'use client')
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { services } from '@/data/services';
import { fr } from '@/lib/translations'; // hardcoded-French source for SSR/crawler content

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const svc = services.find((s) => s.slug === slug);
  if (!svc) return {};
  const copy = fr.services.pages.items[svc.index];
  return {
    title: `${copy.name} à Tours · ${copy.benefit} | Sèvalys`,
    description: copy.metaDescription,
    alternates: { canonical: `/services/${slug}` },
  };
}

export default async function ServiceSlugLayout({ params, children }: Props) {
  const { slug } = await params;
  const svc = services.find((s) => s.slug === slug);
  if (!svc) notFound();
  const copy = fr.services.pages.items[svc.index];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      {/* Native <script>, not next/script — matches official recommendation for JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      {children}
    </>
  );
}
```

```tsx
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/page (v16.3.5, fetched live)
// app/services/[slug]/page.tsx ('use client' — required for useReveals())
'use client';
import { use } from 'react';
import { useReveals } from '@/hooks/useReveals';
import { useLanguage } from '@/context/LanguageContext';
import { services } from '@/data/services';

export default function ServiceSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { t } = useLanguage();
  useReveals();

  const svc = services.find((s) => s.slug === slug);
  if (!svc) return null; // layout.tsx already called notFound() for real 404s
  const copy = t.services.pages.items[svc.index];

  return (
    <main>
      <h1>{copy.title}</h1>
      {/* problème / fonctionnement / enjeux / preuve sociale / faq / double CTA */}
    </main>
  );
}
```

### Pattern 3: FAQ rendered as native `<details>`/`<summary>`, not a hand-rolled accordion
**What:** Each FAQ question is a `<details>` element; the `<summary>` is the clickable question (should be an `H3` or styled to look like one visually while the actual heading hierarchy uses `H2` for section, per SVC-05's "under key headings H1/H2" requirement — put the citable direct-answer block directly under the `H1`/relevant `H2`, separate from the FAQ accordion answers).
**When to use:** Any FAQ block where Google's crawlability constraint applies ("each acceptedAnswer must be fully visible on the page" — a JS-driven accordion that only renders text into the DOM after the user clicks risks the rich result being rejected).
**Example:**
```tsx
// Hand-rolled per project convention — no citation, follows Don't Hand-Roll guidance below
<div className="faq-list">
  {copy.faq.map((item, i) => (
    <details key={i} className="faq-item" data-reveal data-reveal-delay={String(i % 3)}>
      <summary className="faq-q">{item.q}</summary>
      <p className="faq-a">{item.a}</p>
    </details>
  ))}
</div>
```

### Anti-Patterns to Avoid
- **Fetching or building JSON-LD from `useLanguage()` inside a Client Component:** the JSON-LD must exist in the server-rendered HTML for crawlers; `useLanguage()` only resolves after hydration (and defaults to `'fr'` anyway on first paint), so building JSON-LD client-side either delays it past first paint or silently duplicates the server version. Build it once, server-side, from the French source.
- **Conditionally rendering FAQ answer text only when open (`{open && <p>{answer}</p>}`):** this removes the answer from the initial HTML entirely, failing Google's crawlability requirement for FAQPage rich results. Native `<details>` avoids this by design (content is always in the DOM).
- **Introducing a UI library (shadcn/Radix) for a single accordion:** inconsistent with the zero-dependency, hand-rolled-CSS convention used by every other section in this codebase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FAQ expand/collapse UI | A custom `useState`-driven accordion component | Native `<details>`/`<summary>` | Zero JS needed, built-in keyboard/screen-reader semantics, content always crawlable regardless of open state — directly avoids the Google rich-result rejection risk documented for JS-only accordions |
| JSON-LD XSS escaping | Manual ad-hoc string replacement scattered per page | A single shared `buildJsonLdScript(data)` helper that always applies `.replace(/</g, '\\u003c')` per the official Next.js guide | The existing root `layout.tsx` JSON-LD (`src/app/layout.tsx` ~line 225) does **not** currently escape its `JSON.stringify` output — don't propagate that gap to 9 new pages; centralize the escaping so it can't be forgotten per-page |
| Slug ↔ locale-content lookup | Ad-hoc `.find()` calls duplicated in every component | One small lookup helper (e.g. `getServiceBySlug(slug)`) colocated with `src/data/services.ts` | Both `layout.tsx` (server) and `page.tsx` (client) need the identical lookup; duplicating the `.find()` predicate risks drift if the data shape changes |

**Key insight:** Every piece of "custom" behavior this phase seems to need (accordion, schema typing, slug routing) already has a zero-dependency, framework-native or already-established-in-this-codebase solution. The risk in this phase is not missing tooling — it's needing new *content* (54 fields × 3 locales) without breaking the existing static-data/i18n-content split that `projects.ts` already models correctly.

## Common Pitfalls

### Pitfall 1: Phase brief says "Next.js 14" — the installed version is 16.1.6
**What goes wrong:** Planning tasks around Next.js 14's *synchronous* `params` prop (`params: { slug: string }`) when the installed version (`next@16.1.6`, confirmed in `package.json`) requires `params` to be a `Promise` that must be `await`ed (Server Components) or unwrapped with `use()` (Client Components).
**Why it happens:** The phase description's "additional guidance" section states "Next.js 14 / TypeScript / Tailwind v4 / React" — this is stale/incorrect relative to the actual installed dependency.
**How to avoid:** Always write `params: Promise<{ slug: string }>` and `await params` (Server) / `use(params)` (Client). Confirmed live against `package.json` (`"next": "16.1.6"`) and official Next.js docs fetched during this research session (docs version banner: `16.3.5`, `lastUpdated: 2026-08-25`).
**Warning signs:** TypeScript errors like "Property 'slug' does not exist on type 'Promise<...>'" during implementation — this is the async-params requirement, not a bug.

### Pitfall 2: Metadata/JSON-LD built from `useLanguage()` won't exist for crawlers
**What goes wrong:** If a developer instinctively tries to make the new pages' `<title>`/JSON-LD "properly multilingual" by reading `t` from `useLanguage()`, it silently fails for SEO purposes — `generateMetadata` and JSON-LD-in-`layout.tsx` run server-side/at-build-time where there is no browser `localStorage` and no `LanguageContext`. Even client-side, `useLanguage()`'s initial state is hardcoded to `'fr'` before any `useEffect` runs.
**Why it happens:** The i18n system in this codebase is a client-only, post-hydration mechanism (confirmed in `src/context/LanguageContext.tsx`) — there is no locale segment in the URL and no server-side locale detection.
**How to avoid:** Follow the existing root `layout.tsx` precedent exactly: hardcode the French copy source directly into `generateMetadata` and the JSON-LD builder (import from `translations.ts`'s `fr` export, or a locale-agnostic French-only source), independent of the `LanguageContext`/`useLanguage()` client mechanism.
**Warning signs:** SEO/GEO audit (Phase 9) finding that Google's cached HTML shows blank or English/Thai `<title>` tags, or that `view-source:` on a page shows different content than what's visually rendered.

### Pitfall 3: `/simulateur` doesn't exist yet — double-CTA has a dead link until Phase 7
**What goes wrong:** SVC-02 requires a double CTA ("simulateur/contact") on every service page, but Phase 7 (Diagnostic Simulator, which builds `/simulateur`) is sequenced *after* Phase 6 in `ROADMAP.md`, and Phase 6 is explicitly "independent of Phase 5; can run in parallel" — meaning it can also run before Phase 7 exists.
**Why it happens:** Cross-phase dependency not captured in the phase's own "Depends on: Nothing" framing (that framing refers to Phase 5, not Phase 7).
**How to avoid:** The planner should either (a) build the CTA pointing at `/simulateur` now and accept the 404 as a known, temporary gap to be closed when Phase 7 ships (documented in STATE.md), or (b) point the "simulateur" CTA at `/#contact` as an interim fallback and add a follow-up task/reminder to repoint it once Phase 7 lands. This research recommends (a) — build the correct link now — because SEO-01 (Phase 9) will need `/simulateur` referenced from these pages anyway, and a temporary 404 on an unlaunched feature is lower-risk than a second content-editing pass across 9 files. **Flagged for planner decision — see Open Questions.**
**Warning signs:** Broken-link audit (SEO-03, Phase 9) flags `/simulateur` before Phase 7 ships — this is expected and not a regression if option (a) is chosen.

### Pitfall 4: Existing global JSON-LD doesn't escape `<` — don't copy that gap forward
**What goes wrong:** `src/app/layout.tsx` (~line 225) does `JSON.stringify(jsonLd)` directly into `dangerouslySetInnerHTML` with no character escaping. The official Next.js JSON-LD guide explicitly warns this is an XSS-injection vector and recommends `.replace(/</g, '\\u003c')` (or a sanitizing library) — see Code Examples.
**Why it happens:** All values in the *existing* global JSON-LD are hardcoded literals (no user input), so the risk was latent/theoretical there. The 9 new per-page JSON-LD blocks will also be built from hardcoded (not user-submitted) content, so the same latent-risk profile applies — but there's no reason to skip the one-line fix on new code.
**How to avoid:** Centralize JSON-LD serialization in one helper function (see Don't Hand-Roll) that always escapes.
**Warning signs:** None currently exploitable (no user input flows into JSON-LD in this codebase), but a future contributor copy-pasting the unescaped pattern into a page that *does* interpolate user input (e.g., a future reviews/testimonials page) would introduce a real vulnerability.

### Pitfall 5: `next/script` vs native `<script>` for JSON-LD
**What goes wrong:** The existing root layout uses `<Script strategy="beforeInteractive">` from `next/script` for its JSON-LD. The current official Next.js guidance (fetched live this session) explicitly recommends a **native** `<script>` tag instead: *"The `next/script` component is optimized for loading and executing JavaScript. Since JSON-LD is structured data, not executable code, a native `<script>` tag is the right choice."*
**Why it happens:** The root layout's pattern predates this guidance or followed an older tutorial.
**How to avoid:** For the 9 new per-page JSON-LD blocks, use a plain `<script type="application/ld+json" dangerouslySetInnerHTML={...} />` (no import from `next/script`), matching current official guidance. This is a deliberate, minor deviation from the existing root-layout pattern — flag it as an intentional improvement, not an inconsistency bug, since the planner may reasonably choose to match root layout's `next/script` for visual/pattern consistency instead. Either works functionally; native `<script>` is what Next.js currently recommends.
**Warning signs:** None — both patterns render valid, crawlable JSON-LD. This is a style/best-practice note, not a functional bug.

## Code Examples

Verified patterns from official sources (all fetched live during this research session against Next.js docs version banner `16.3.5`):

### Dynamic route with static params (fixed slug set)
```tsx
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
export async function generateStaticParams() {
  return [{ id: '1' }, { id: '2' }, { id: '3' }];
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

### Reading `params` in a Client Component page (this codebase's exact situation)
```tsx
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/page
'use client';
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
}
```

### JSON-LD with XSS-safe escaping
```tsx
// Source: https://nextjs.org/docs/app/guides/json-ld
export default async function Page({ params }) {
  const { id } = await params;
  const product = await getProduct(id);
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Product', name: product.name };
  return (
    <section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </section>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Synchronous `params` prop (`{ params: { slug } }`) | `params` is a `Promise`, must `await`/`use()` | Next.js 15.0.0-RC (kept working synchronously with a deprecation warning through 15; this project is on 16, where the async form is the only documented pattern) | Every new dynamic-route file in this phase must use the async/`use()` form from day one |
| `themeColor`/`viewport`/`colorScheme` in the `metadata` export | Dedicated `generateViewport` export | Next.js 14.0.0 | Not directly relevant to this phase's metadata (no viewport customization planned), but if the planner copies an old metadata snippet from elsewhere in the codebase, verify it doesn't carry a deprecated field |
| `next/script` for JSON-LD | Native `<script>` tag | Current official guidance (`lastUpdated: 2026-03-02` per docs fetched this session) | See Pitfall 5 |

**Deprecated/outdated:** None else relevant to this phase's scope.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Suggested slugs for the 5 existing offers: `landing-page`, `rebranding-site-premium`, `projet-sur-mesure`, `agent-vocal-ia`, `maintenance` (only the 4 new offers' slugs are fixed by the SEO doc; these 5 are this researcher's draft per D-04, not verified against the SEO doc's keyword-cluster tables) | Architecture Patterns / data model | Low — slugs are easy to rename before launch; but if hardcoded into external backlinks or `sitemap.ts` (Phase 9) before confirmation, would require a redirect |
| A2 | Branding vs Rebranding+Premium split default direction (D-07's suggested wording: Branding = identity-only, no site changes; Rebranding+Premium = full site rebuild + premium branding) is a reasonable industry-standard scoping, not verified against any specific competitor's actual page copy | Phase Requirements (SVC-04) | Medium — if the split reads as arbitrary or contradicts how Sèvalys has scoped past client engagements, could confuse prospects; user already flagged this needs confirmation during planning/content writing (D-07) |
| A3 | `schema-dts` (mentioned only as an optional alternative, not recommended for install) is on the npm registry at `2.0.0` — confirmed via `npm view`, but the package name itself was surfaced via the official Next.js docs citation, not independently slopcheck-verified this session | Standard Stack / Alternatives Considered | Low — not recommended for actual install; if the planner chooses to add it anyway, re-verify via the full Package Legitimacy Gate first |
| A4 | Recommending `dynamicParams = false` (hard 404 on unknown slugs) rather than leaving the default `true` | Architecture Patterns, Pattern 1 | Low — reversible route-segment-config flag; default `true` would instead attempt an on-demand render of an unknown slug and likely error inside the page body when `.find()` returns `undefined` |

## Open Questions (RESOLVED)

1. **Should the "simulateur" CTA on all 9 pages link to `/simulateur` (not yet built, Phase 7) or to `/#contact` as an interim fallback?**
   - What we know: SVC-02 requires a double CTA "simulateur/contact"; Phase 7 builds `/simulateur`; phase ordering allows Phase 6 to ship before Phase 7.
   - What's unclear: Whether the project prefers a temporary 404 (accepted, documented) over a temporary same-destination double-CTA (technically satisfies "two buttons" but both would route to the same page for a while).
   - Recommendation: Build the CTA pointing at `/simulateur` now (see Pitfall 3) and note it in `STATE.md` as a known gap closed by Phase 7 — but this is the planner's/user's call, not locked by CONTEXT.md.
   - **RESOLVED:** Locked in `06-UI-SPEC.md`'s Copywriting Contract (Option A — CTA points at `/simulateur` now, temporary 404 accepted) and implemented in `06-02-PLAN.md`/`06-04-PLAN.md`; the gap is recorded as a known/accepted item in `06-07-PLAN.md`'s completeness gate.

2. **Which of the 3 existing case studies (Feuillette, Gecko Cabane, Les Folies Temps Dande) map to which of the 9 services under the D-05 hybrid rule?**
   - What we know: Feuillette = boulangerie/commerce with an agent vocal IA angle (per the SEO doc's proof-point framing); Gecko Cabane = restaurant; Les Folies Temps Danse = école/association.
   - What's unclear: Exactly which service pages (e.g., Agent Vocal IA obviously maps to Feuillette; but does Maintenance, Landing Page, or Community Management also plausibly cite one of these three, or do they fall back to trust signals only per D-05?) — this is a content-writing decision, not purely technical.
   - Recommendation: Planner/content-writing pass should explicitly map each of the 9 services to either one of the 3 case studies or "trust signals only," and record the mapping in the plan so it's not improvised per-page inconsistently.
   - **RESOLVED:** Mapping locked in `06-01-PLAN.md` Task 1's table — Site Vitrine → Gecko Cabane, Projet Sur Mesure → Les Folies Temps Danse, Agent Vocal IA → Feuillette; the other six services use trust signals only (distinct sets per page, per D-05/D-06).

## Environment Availability

Skipped — this phase has no new external dependencies (no new npm packages, no new APIs/services, no new CLI tools). All work is static content + existing framework mechanics already running in this repository (`next dev`/`next build` already functional per existing `package.json` scripts).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 (node environment only — no jsdom/React Testing Library configured) |
| Config file | `vitest.config.ts` (`environment: 'node'`, `include: ['src/**/*.test.ts']`) |
| Quick run command | `npx vitest run src/data/services.test.ts` |
| Full suite command | `npm test` (= `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SVC-01 | `services.ts` has exactly 9 entries with unique slugs matching the fixed slug list | unit | `npx vitest run src/data/services.test.ts` | ❌ Wave 0 |
| SVC-01 | `translations.ts` `t.services.pages.items` array has one entry per `services.ts` index, for all 3 locales (fr/en/th) — no missing translation keys | unit | `npx vitest run src/lib/translations.test.ts` | ❌ Wave 0 |
| SVC-02 | No `price`/`tarif`/`€` substring appears anywhere in any of the 9 service page content objects (guards PRIX-01 pre-emptively even though PRIX-01 is Phase 8's formal requirement) | unit | `npx vitest run src/lib/translations.test.ts` | ❌ Wave 0 |
| SVC-05 | `buildFaqJsonLd(faq)` pure function produces valid `FAQPage` shape (`@type`, `mainEntity[].acceptedAnswer.text` non-empty) for every service's FAQ array | unit | `npx vitest run src/lib/serviceJsonLd.test.ts` | ❌ Wave 0 |
| SVC-05 | JSON-LD serialization escapes `<` characters (regression guard for Pitfall 4) | unit | `npx vitest run src/lib/serviceJsonLd.test.ts` | ❌ Wave 0 |
| SVC-06 | Word count per service page (fr locale) falls within the ~300-500 word target (D-02) — soft guard, warn not fail, since copy is creative content | unit (advisory) | `npx vitest run src/lib/translations.test.ts` | ❌ Wave 0 |
| SVC-03 | `/services` index links to all 9 `/services/[slug]` paths with no broken hrefs (static check against `services.ts`) | unit | `npx vitest run src/data/services.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run <touched-test-file>`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/data/services.test.ts` — covers SVC-01, SVC-03 (data integrity: 9 unique slugs, index alignment)
- [ ] `src/lib/translations.test.ts` — covers SVC-02, SVC-05 (no-price guard, translation-key completeness across 3 locales, word-count advisory)
- [ ] `src/lib/serviceJsonLd.test.ts` — covers SVC-05 (JSON-LD shape + escaping regression test)
- No framework install needed — Vitest is already configured; these are new test files following the existing `prospects-schema.test.ts` pattern (pure-function unit tests, `node` environment, no DOM).

*Note: this phase has no interactive UI logic that requires a DOM/jsdom environment to test (the FAQ accordion is native `<details>`, requiring no JS state) — the existing `node`-only Vitest environment is sufficient. If the planner later wants to snapshot-test rendered component output, jsdom + React Testing Library would need to be added as a new devDependency (not required for this phase's stated requirements).*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth surface in this phase (static content pages) |
| V3 Session Management | No | No sessions involved |
| V4 Access Control | No | All 9 pages are public marketing content, no access restrictions |
| V5 Input Validation | Marginal — no user input in this phase, but JSON-LD serialization is an output-encoding concern | Escape `<` in `JSON.stringify` output before `dangerouslySetInnerHTML` (see Pitfall 4/Code Examples) — output encoding, not input validation, but the closest ASVS bucket |
| V6 Cryptography | No | Not applicable |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored/reflected XSS via unescaped JSON-LD `dangerouslySetInnerHTML` | Tampering / Information Disclosure | Always run JSON.stringify output through `.replace(/</g, '\\u003c')` (official Next.js recommendation) before injecting; centralize in one helper (see Don't Hand-Roll) so it can't be forgotten on any of the 9 new pages |

No other STRIDE-relevant patterns apply — this phase introduces no forms, no new API routes, and no new data storage (the prospect-capture backend and its RLS/rate-limiting concerns belong to Phase 5, already complete, and Phase 7).

## Sources

### Primary (HIGH confidence)
- https://nextjs.org/docs/app/api-reference/functions/generate-static-params — fetched live, docs version 16.3.5, confirms `generateStaticParams` + `dynamicParams` behavior
- https://nextjs.org/docs/app/api-reference/functions/generate-metadata — fetched live, docs version 16.3.5, confirms async `params`/`generateMetadata` requirements and Server-Component-only constraint
- https://nextjs.org/docs/app/api-reference/file-conventions/page — fetched live, docs version 16.3.5, confirms Client Component `params` access via `use()`
- https://nextjs.org/docs/app/guides/json-ld — fetched live, docs version 16.3.5 (`lastUpdated: 2026-03-02`), confirms native `<script>` recommendation and XSS-escaping guidance
- `C:\portfolio\package.json` — confirms installed versions: `next@16.1.6`, `react@19.2.3`, `typescript@^5`, `vitest@^4.1.11`, no UI-library dependencies
- Direct codebase read: `src/app/layout.tsx`, `src/app/services/{page,layout}.tsx`, `src/components/sections/{OffersSection,Realisations,ReassuranceSection,ServicesHeroSection}.tsx`, `src/lib/translations.ts`, `src/context/LanguageContext.tsx`, `src/data/projects.ts`, `src/hooks/useReveals.ts`, `src/app/globals.css`, `vitest.config.ts`, `src/app/sitemap.ts`

### Secondary (MEDIUM confidence)
- `docs/strategie-seo-geo-llm-2026-09.md` (project-internal, §5 and §9) — fixed slugs for the 4 new services, title/H1 pattern convention, FAQ+citable-answer-block requirement, flagged Branding/Rebranding overlap
- WebSearch: agency/SaaS service-page structure best practices (problem→solution→proof→CTA convention) — multiple independent sources agree, general web-design consensus, not framework-specific fact

### Tertiary (LOW confidence)
- WebSearch on 21st.dev FAQ accordion components — confirms the ecosystem/marketplace exists and that shadcn-based accordions are its dominant offering, but this research did not have direct API/browser access to 21st.dev to select and cite specific component URLs per D-11/D-12; recommend `/gsd:ui-phase` (which has UI hint = yes for this phase) do a follow-up visual pass against 21st.dev directly for structural inspiration, while keeping implementation dependency-free per the Don't Hand-Roll findings above

## Metadata

**Confidence breakdown:**
- Standard stack / framework mechanics: HIGH — verified live against official Next.js docs matching the exact installed version, and against `package.json`
- Architecture (data/content split, JSON-LD placement): HIGH — directly derived from an existing, working precedent already in this codebase (`projects.ts` + `Realisations.tsx`, root `layout.tsx` JSON-LD)
- Content strategy (word counts, case-study mapping, Branding/Rebranding split wording): MEDIUM/LOW — governed by locked CONTEXT.md decisions where present (D-01–D-10), but several specifics (exact slugs for 5 existing offers, exact case-study-to-service mapping, exact Branding scope wording) are explicitly flagged as drafts/assumptions requiring confirmation during planning or content writing
- Design inspiration (21st.dev specifics): LOW — no direct browsing access to 21st.dev's live catalog this session; general accordion/service-page ecosystem patterns confirmed via WebSearch only

**Research date:** 2026-09-20
**Valid until:** 30 days (stable framework-level findings; content-strategy findings are locked by CONTEXT.md and don't expire on a schedule)
