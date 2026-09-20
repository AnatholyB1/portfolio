# Phase 6: Service Pages (Template + Content) - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 11 (new/modified)
**Analogs found:** 10 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/data/services.ts` | model (static data) | CRUD (build-time lookup) | `src/data/projects.ts` | exact |
| `src/lib/translations.ts` (extend `t.services.pages`) | model (i18n content) | CRUD (build-time lookup) | `src/lib/translations.ts` `t.services.offers` (same file, existing block) | exact |
| `src/lib/serviceJsonLd.ts` (new) | utility (pure function) | transform | `src/lib/prospects-schema.ts` | role-match |
| `src/lib/serviceJsonLd.test.ts` (new) | test | transform | `src/lib/prospects-schema.test.ts` | exact |
| `src/data/services.test.ts` (new) | test | CRUD (data integrity) | `src/lib/prospects-schema.test.ts` | role-match |
| `src/app/services/page.tsx` (rewrite) | route/page (index) | request-response (SSR+client hydrate) | itself (current version) + `src/components/sections/Realisations.tsx` (list-of-cards pattern) | exact |
| `src/app/services/layout.tsx` (keep, minor) | config (metadata) | request-response | itself (current version) | exact |
| `src/app/services/[slug]/page.tsx` (new) | route/page (dynamic content) | request-response (SSR+client hydrate) | `src/app/calculateur-roi/page.tsx` (client page paired with sibling layout) + `src/components/sections/OffersSection.tsx` (content-from-i18n-array pattern) | role-match |
| `src/app/services/[slug]/layout.tsx` (new) | controller (metadata + JSON-LD, Server Component) | request-response | `src/app/layout.tsx` (JSON-LD `@graph` block) + `src/app/calculateur-roi/layout.tsx` (sibling static-metadata layout) | role-match |
| `src/components/sections/ServiceFaqAccordion.tsx` (new, or inline in page) | component | event-driven (native disclosure, no JS state) | `src/app/calculateur-roi/page.tsx` `<details className="roi-adv">` block | role-match |
| `src/components/sections/ServiceIndexGrid.tsx` (new, or inline in index page) | component | CRUD (render static list) | `src/components/sections/OffersSection.tsx` | exact |

## Pattern Assignments

### `src/data/services.ts` (model, CRUD)

**Analog:** `src/data/projects.ts` (full file, 41 lines — read in full, no analog gap)

**Full pattern to copy** (locale-agnostic static array, `index` field used as the join key into `translations.ts`):
```typescript
// src/data/projects.ts
export interface Project {
  /** Index in t.landing.work.items[] — used to retrieve i18n desc + tags */
  index: number;
  /** Canonical project name (same across all locales) */
  name: string;
  /** Display year */
  year: string;
  /** Optional URL for the project — null if no public link */
  href: string | null;
}

export const projects: Project[] = [
  { index: 0, name: 'Feuillette', year: '2025', href: '/demo/feuillette' },
  // ...
];
```

**Apply to `services.ts` as:**
```typescript
export interface Service {
  slug: string;           // '/services/[slug]' route param, fixed per D-04/SEO doc
  index: number;          // join key into t.services.pages.items[index]
  caseStudyProjectIndex: number | null; // join key into src/data/projects.ts, or null for trust-signals-only (D-05)
}

export const services: Service[] = [
  { slug: 'landing-page', index: 0, caseStudyProjectIndex: null },
  // ... 9 entries total, order matches SEO doc §9 slugs for the 4 new offers
];

// Don't Hand-Roll (RESEARCH.md): colocate one lookup helper here
export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}
```

---

### `src/lib/translations.ts` — extend `t.services.pages.items[]`

**Analog:** same file, existing `offers` block (lines 37-46 interface, 238-252 fr content)

**Interface pattern to copy** (lines 37-46):
```typescript
offers: {
  num: string;
  title_l1: string;
  title_l2_it: string;
  intro: string;
  from: string;
  popular: string;
  cta: string;
  items: { name: string; tagline: string; price: string; description: string; features: string[] }[];
};
```

**Content pattern to copy** (lines 238-252, fr locale — same shape repeated for `en`/`th` further down the file):
```typescript
offers: {
  num: "03 / 09",
  title_l1: "Nos",
  title_l2_it: "offres.",
  intro: "...",
  from: "À partir de",
  popular: "Le plus demandé",
  cta: "Demander un devis",
  items: [
    { name: "Landing Page", tagline: "L'essentiel pour être visible", price: "1 200 – 1 800 €", description: "...", features: ["...", "..."] },
    // ...
  ],
},
```

**Apply to new `pages` block:** mirror this exact shape but drop `price`, add `problème`/`fonctionnement`(reuse `features: string[]` field name and rendering, per D-03)/`enjeux`/`preuveSociale`/`faq`/`metaDescription`/`title`/`benefit`. Add the parallel interface entry near line 37 (inside `services:` block) and three content blocks (fr ~line 252, en ~line 503, th — locate via same `services:` key pattern) at the same nesting depth as `offers`. **Critical:** every field added to the interface must be filled in for all 3 locales or TypeScript will error — this file has exactly 3 locale export blocks (`fr`, `en`, `th`) sharing one `Translations` interface (line 3).

---

### `src/lib/serviceJsonLd.ts` (new pure function)

**Analog:** `src/lib/prospects-schema.ts` (full file, 64 lines — read in full)

**Pattern to copy** — pure function, no framework imports, isolated and unit-testable:
```typescript
// src/lib/prospects-schema.ts (style precedent)
import { z } from 'zod';

export const prospectSchema = z.object({ /* ... */ });
export type ProspectSubmission = z.infer<typeof prospectSchema>;

/**
 * Pure predicate — no React/Next/Supabase imports, so both client and
 * server code can import it safely.
 */
export function isSpamSubmission(raw: unknown, now: number = Date.now()): boolean {
  // ...
}
```

**Apply to `serviceJsonLd.ts` as:**
```typescript
export interface FaqItem { q: string; a: string; }

export function buildFaqJsonLd(faq: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

// Centralized escaping helper (Don't Hand-Roll / Pitfall 4 — root layout.tsx
// does NOT do this today; don't propagate that gap)
export function buildJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
```

**No React/Next imports** — same zero-dependency constraint as `prospects-schema.ts` (its file-header comment explicitly says "Must stay free of next/server, Supabase, Resend or node:crypto imports so both sides can import it safely" — apply the identical constraint here since both `layout.tsx` (server) and any future client preview would import it).

---

### `src/lib/serviceJsonLd.test.ts` / `src/data/services.test.ts` (new tests)

**Analog:** `src/lib/prospects-schema.test.ts` (read lines 1-60; full pattern established there)

**Imports + structure pattern** (lines 1-22):
```typescript
import { describe, expect, it } from 'vitest';
import { isSpamSubmission, prospectSchema, SPAM_MIN_ELAPSED_MS } from './prospects-schema';

const validPayload = { /* ... */ };

function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const clone = { ...obj };
  delete clone[key];
  return clone;
}

describe('prospectSchema', () => {
  it('accepts a complete valid payload', () => {
    const result = prospectSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });
  it('rejects a payload missing telephone (D-01)', () => {
    const result = prospectSchema.safeParse(omit(validPayload, 'telephone'));
    expect(result.success).toBe(false);
  });
  // ...
});
```
**Environment note:** `vitest.config.ts` is `environment: 'node'` — no DOM/jsdom. These are pure-function/data-shape tests only (matches SVC-01/02/05 test map in RESEARCH.md), not component render tests.

---

### `src/app/services/[slug]/layout.tsx` (new, Server Component)

**Analog A — JSON-LD `@graph` shape:** `src/app/layout.tsx` lines 183-227 (FAQPage block + `<script>`/`<Script>` usage)
**Analog B — sibling static-metadata layout convention:** `src/app/calculateur-roi/layout.tsx` (full file, 17 lines) and `src/app/services/layout.tsx` (full file, 66 lines)

**Metadata + robots pattern to copy** (`src/app/calculateur-roi/layout.tsx`, full file):
```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calculateur de ROI · Agent IA téléphonique",
  description: "...",
  robots: { index: false, follow: false },
};

export default function CalculateurRoiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```
(For `[slug]/layout.tsx`, `robots` must be the *opposite* — `index: true` — and `metadata` must come from `generateMetadata({params})` since it's per-slug, not static; see `06-RESEARCH.md` Pattern 2 for the exact `generateMetadata` + `notFound()` code already drafted there.)

**FAQPage JSON-LD shape to copy** (`src/app/layout.tsx` lines 183-212):
```typescript
const faq = {
  "@type": "FAQPage",
  "@id": `${SITE_URL}/#faq`,
  mainEntity: [
    {
      "@type": "Question",
      name: "Qu'est-ce que Sèvalys ?",
      acceptedAnswer: { "@type": "Answer", text: "..." },
    },
    // ...
  ],
};
```
**Deviation required (Pitfall 4/5):** root layout's script tag does NOT escape `<` (`JSON.stringify(jsonLd)` raw, line 225) and uses `next/script` (`<Script strategy="beforeInteractive">`, lines 222-227). The new per-slug layout must NOT copy those two specifics — use a native `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildJsonLdScript(jsonLd) }} />` instead (see `serviceJsonLd.ts` above and RESEARCH.md Code Examples for the exact snippet).

---

### `src/app/services/[slug]/page.tsx` (new, Client Component)

**Analog A — sibling client-page-plus-layout split:** `src/app/calculateur-roi/page.tsx` (`'use client'`, imports `Navbar`, no `Footer` call inside — check whether Footer is rendered by a shared component or omitted; this file renders `<Navbar />` + `<main>` directly, no `<Footer />`, unlike `services/page.tsx` which renders both)
**Analog B — content-from-i18n-array-by-index rendering + checkmark bullets (D-03):** `src/components/sections/OffersSection.tsx` (full file, 50 lines)

**Checkmark bullet pattern to copy verbatim** (`OffersSection.tsx` lines 35-41):
```tsx
<ul className="o-feats">
  {o.features.map((f, j) => (
    <li className="o-feat" key={j}>
      <span className="c">✓</span>{f}
    </li>
  ))}
</ul>
```

**Section shell pattern** (`OffersSection.tsx` lines 9-17, reused across every `.sec`-based section in this codebase — `ProblemSection.tsx`, `ReassuranceSection.tsx` follow the identical shell):
```tsx
<section className="sec border-t" id="offers">
  <div className="wrap">
    <div className="sec-head" data-reveal>
      <div className="sec-num">{ts.num}</div>
      <h2 className="sec-title">
        {ts.title_l1}<br /><em className="it">{ts.title_l2_it}</em>
      </h2>
      <p className="sec-intro">{ts.intro}</p>
    </div>
    {/* section body */}
  </div>
</section>
```

**`use(params)` + `useLanguage()` + `useReveals()` client-page skeleton** — no exact analog exists yet (first dynamic route in repo), but combine `calculateur-roi/page.tsx`'s `'use client'` + `<Navbar />` shell with `OffersSection.tsx`'s `useLanguage()`/i18n-array lookup. Exact code already drafted in `06-RESEARCH.md` Architecture Patterns → Pattern 2 (second code block) — copy that directly; it is verified against live Next.js 16.3.5 docs.

---

### FAQ accordion — native `<details>`/`<summary>` (SVC-05, Don't Hand-Roll)

**Analog:** `src/app/calculateur-roi/page.tsx` lines 222-262 (`<details className="roi-adv">`) — **this is a real, already-shipped precedent in this exact codebase**, not just a research recommendation.

**Structure pattern to copy:**
```tsx
<details className="roi-adv">
  <summary>Paramètres</summary>
  <div className="roi-adv-body">
    {/* always-rendered content — no conditional-on-open rendering */}
  </div>
</details>
```

**Matching CSS already shipped** (`src/app/globals.css` lines 629-634 — reuse this styling approach for the new `.faq-item`/`.faq-q`/`.faq-a` classes, do not reinvent the `+`/`−` marker mechanism):
```css
.roi-adv { margin-top: 16px; border: 1px solid var(--line); border-radius: 16px; background: var(--bg-2); }
.roi-adv summary { cursor: pointer; padding: 20px 28px; font-family: var(--font-mono), monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--ink-dim); list-style: none; display: flex; justify-content: space-between; align-items: center; }
.roi-adv summary::-webkit-details-marker { display: none; }
.roi-adv summary::after { content: '+'; color: var(--acid); font-size: 18px; line-height: 1; }
.roi-adv[open] summary::after { content: '−'; }
.roi-adv-body { padding: 0 28px 24px; }
```
Per `06-UI-SPEC.md`, FAQ `<summary>` question text should use the Heading role (32px) not this 11px mono label style — reuse the `<details>`/marker *mechanism* from `.roi-adv`, not its exact typography; new `.faq-item`/`.faq-q`/`.faq-a` classes should be added to `globals.css` following this same structural shape (border/radius/background from `.roi-adv`, typography from `06-UI-SPEC.md`'s Heading/Body rows).

**Answer must never be conditionally rendered** — `<p className="faq-a">{item.a}</p>` always in the DOM (native `<details>` guarantees this; do not add `{open && ...}` guards).

---

### `src/app/services/page.tsx` (index rewrite, SVC-03)

**Analog A — current file itself** (`src/app/services/page.tsx`, full 44 lines) for the `'use client'` + `useReveals()` + `<Navbar/>...<Footer/>` shell convention.
**Analog B — list-of-cards-with-CTA-bridge pattern:** `src/components/sections/Realisations.tsx` (full file, 68 lines) — shows how a static array (`projects`) drives a list of link-cards with a closing CTA bridge (`.work-bridge`), directly analogous to the 9-card grid linking out to `/services/[slug]`.
**Analog C — card grid CSS/markup to reuse minus price (per `06-UI-SPEC.md`):** `OffersSection.tsx` `.offer`/`.offers-grid` (see full file above) with `.o-from`/`.o-price`/`.pop-tag`/`popular` conditional removed entirely per D-10.

**Card-as-link pattern to copy** (`Realisations.tsx` lines 21-48 — shows conditional `<a>` vs `<div>` wrapper, useful if some service cards need different treatment, though for `/services` every card links to a real slug so a plain `<a href={`/services/${s.slug}`}>` wrapping the `.offer` markup is simpler):
```tsx
{projects.map((project) => {
  const item = w.items[project.index];
  return (
    <a key={project.name} href={project.href} className="work-item">
      {/* ... */}
    </a>
  );
})}
```

---

## Shared Patterns

### i18n data/content split (`index`-keyed join)
**Source:** `src/data/projects.ts` + `src/lib/translations.ts` (`t.landing.work.items[project.index]`), consumed in `src/components/sections/Realisations.tsx` line 22 (`const item = w.items[project.index];`)
**Apply to:** `src/data/services.ts` + `t.services.pages.items[service.index]`, consumed in both `[slug]/layout.tsx` (server, hardcoded French) and `[slug]/page.tsx` (client, `useLanguage()`)

### Section shell (`.sec`/`.wrap`/`.sec-head`/`.sec-num`/`.sec-title`/`.sec-intro`)
**Source:** `src/app/globals.css` lines 270-274; used identically in `OffersSection.tsx`, `ProblemSection.tsx`, `ReassuranceSection.tsx`
**Apply to:** Every H2-level section on the new `[slug]/page.tsx` template (Problème/Fonctionnement/Enjeux/Preuve sociale/FAQ) per `06-UI-SPEC.md`'s directive to reuse existing card/section classes rather than invent new ones — note UI-SPEC calls for *denser* spacing (32-64px, not the shipped 140px `.sec` padding) for these shorter pages, so a phase-specific class modifier (e.g. `.sec.sec-compact`) or inline override will be needed since `.sec`'s current CSS is unmodified/shared with the index page.

### Checkmark bullet list (D-03, mandatory verbatim reuse)
**Source:** `src/app/globals.css` lines 485-488 (`.o-feats`/`.o-feat`/`.c`) + `OffersSection.tsx` lines 35-41
**Apply to:** "Fonctionnement" section on all 9 `[slug]/page.tsx` pages — must not be converted to prose per D-03/UI-SPEC.

### Trust-signal / case-study card (D-05/D-06 hybrid preuve sociale)
**Source:** `src/app/globals.css` lines 571-576 (`.reassure-grid`/`.reassure`) + `src/components/sections/ReassuranceSection.tsx` full file
**Apply to:** "Preuve sociale" section — reuse `.reassure` card treatment for trust-signal chips (méthodologie, garantie, "sans engagement") when no case study is genuinely relevant (per D-05, most of the 4 new + several of the 5 existing offers).

### JSON-LD escaping (security — Pitfall 4)
**Source:** `src/app/layout.tsx` line 225 shows the *gap* (unescaped `JSON.stringify`) — do not copy this specific line
**Apply to:** `serviceJsonLd.ts`'s `buildJsonLdScript()` helper (see Pattern Assignments above) must be the only place `JSON.stringify` + `dangerouslySetInnerHTML` is composed for the 9 new pages; always via `.replace(/</g, '\\u003c')`.

### Breadcrumb back-link
**Source:** `src/app/globals.css` line 420 (`.crumb-back`) — already used in `ServicesHeroSection.tsx` line 13 ("← Retour à l'accueil") and `calculateur-roi/page.tsx` line 128 ("← Retour aux services")
**Apply to:** New lighter-weight service-page hero — "← Retour aux services" pointing to `/services` (per `06-UI-SPEC.md` Component Patterns item 1).

### Static data lookup helper (Don't Hand-Roll)
**Source:** No existing helper function precedent (existing code inlines `.find()`/array index lookups directly in components — e.g. `Realisations.tsx` line 22 uses direct index access, not a `.find()`); this is a **new** convention introduced by this phase per RESEARCH.md's explicit Don't-Hand-Roll guidance.
**Apply to:** `getServiceBySlug(slug)` colocated in `src/data/services.ts`, imported identically by both `[slug]/layout.tsx` (server) and `[slug]/page.tsx` (client) to avoid duplicated `.find()` predicates.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/app/services/[slug]/page.tsx` (the `use(params)` async-params-in-Client-Component mechanic specifically) | route/page | request-response | No dynamic `[slug]` route exists anywhere in this codebase today (confirmed via `Glob` — only `calculateur-roi`, `demo`, `mentions-legales` are static app-router segments). The `use()`-hook pattern must be copied from `06-RESEARCH.md`'s Architecture Patterns → Pattern 2 (verified live against official Next.js 16.3.5 docs), not from an in-repo analog. |
| New `.faq-item`/`.faq-q`/`.faq-a` CSS classes | component (styling) | — | No FAQ-specific CSS exists; closest analog is `.roi-adv` (structurally identical `<details>` mechanism) — reuse its border/radius/marker mechanism, but typography must follow `06-UI-SPEC.md`'s Heading/Body rows, not `.roi-adv`'s 11px mono label styling (that was sized for a settings-panel disclosure, not a customer-facing FAQ). |
| Category-grouped `/services` index layout (if planner chooses grouping over D-09's recommended flat list) | component | CRUD | No existing grouped-card-grid analog in this codebase — every existing grid (`OffersSection`, future index) is a flat map over one array. Only relevant if the planner overrides `06-UI-SPEC.md`'s flat-list recommendation. |

## Metadata

**Analog search scope:** `src/data/`, `src/lib/`, `src/app/services/`, `src/app/calculateur-roi/`, `src/app/layout.tsx`, `src/components/sections/`, `src/context/`, `src/hooks/`, `src/app/globals.css`
**Files scanned:** ~20 (full reads) + 1 CSS grep pass + graphify GRAPH_REPORT.md community/god-node scan
**Pattern extraction date:** 2026-09-20
