# Phase 9: SEO & Discovery Wiring - Pattern Map

**Mapped:** 2026-10-01
**Files analyzed:** 11 (4 modified, 6 new, 1 doc)
**Analogs found:** 10 / 11 (doc annotation has no code analog, trivial)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/serviceSchema.ts` (new) | utility (JSON-LD builder) | transform | `src/lib/serviceJsonLd.ts` | exact |
| `src/lib/serviceSchema.test.ts` (new) | test | transform | `src/lib/serviceJsonLd.test.ts` | exact |
| `src/app/layout.tsx` (modify) | config/layout (global JSON-LD) | request-response (SSR) | itself (`professionalService` block l.133-171) + `src/app/services/[slug]/layout.tsx` | exact |
| `src/app/layout.test.ts` (extend) | test (source-text guard) | file-I/O | itself | exact |
| `src/app/sitemap.ts` (modify) | route (metadata) | transform | itself + `[slug]/layout.tsx` `generateStaticParams` | exact |
| `src/app/sitemap.test.ts` (new) | test | transform | `src/app/page.test.ts` (imports `@/data/services`) | role-match |
| `public/llms.txt` (modify) | static content | n/a | itself | exact |
| `src/app/llms.test.ts` (new) | test (fs read) | file-I/O | `src/app/layout.test.ts` (`readFileSync`) | role-match |
| `src/app/linkAudit.test.ts` (new) | test (static scan) | batch / file-I/O | `src/app/page.test.ts` (`HREF_PATTERN`, `extractHrefs`, `DEAD_DESTINATIONS`) | role-match |
| `src/lib/serviceJsonLd.test.ts` (extend, D-01 guard) | test | file-I/O | `src/app/layout.test.ts` source-read | role-match |
| `docs/strategie-seo-geo-llm-2026-09.md` (annotate) | doc | n/a | none (see RESEARCH stale-passage table, lines 26,35,52,69,93,121) | no analog |

## Pattern Assignments

### `src/lib/serviceSchema.ts` (utility, transform)

**Analog:** `src/lib/serviceJsonLd.ts`

**Header / purity constraint** (lines 1-4): the module must stay free of next/*, React, Supabase imports so vitest `environment: 'node'` can import it.
```typescript
// Shared JSON-LD builders for the 9 /services/[slug] pages (Phase 6).
// Must stay free of next/*, React, and Supabase imports so both the Server
// Component layout and any future client caller can import it safely
```

**Builder shape** (lines 14-25): plain exported function returning a plain object, `@id` built from a passed-in URL (siteUrl is a parameter, not read from env):
```typescript
export function buildFaqJsonLd(faq: FaqItem[], pageUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, ... })),
  };
}
```
Note: the new builder returns an OfferCatalog node WITHOUT `@context` (it nests inside the layout `@graph`).

**Data join pattern** (from `src/app/services/[slug]/layout.tsx` lines 3-4, 37, 59): French copy via `translations.fr.services.pages.items[svc.index]`; slugs from `services`:
```typescript
import { services } from "@/data/services";
import { translations } from "@/lib/translations";
const copy = translations.fr.services.pages.items[svc.index];
```
Use single quotes in `src/lib` files (serviceJsonLd.ts style); `src/app` files use double quotes.

**Core pattern to write** (RESEARCH Pattern 1, lines 91-107): `buildServiceCatalogJsonLd(siteUrl)` -> `{ '@type':'OfferCatalog', '@id': `${siteUrl}/#catalog`, name, itemListElement: services.map(s => ({ '@type':'Service', '@id': `${siteUrl}/services/${s.slug}#service`, name: items[s.index].name, description: items[s.index].tagline, url, provider: {'@id': `${siteUrl}/#organization`}, areaServed:'FR' })) }`. No `offers`, `price*` keys (D-03).

**Serialization** (serviceJsonLd.ts lines 36-38): reuse `buildJsonLdScript` if the layout script line is touched:
```typescript
export function buildJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
```

---

### `src/lib/serviceSchema.test.ts` (test, transform)

**Analog:** `src/lib/serviceJsonLd.test.ts`

**Imports/structure** (lines 1-2, 4-5): `import { describe, expect, it } from 'vitest'; import { ... } from './serviceJsonLd';` then `describe('buildX', () => { it(...) })`, using `toMatchObject` / `toEqual` and a cast for nested field access (lines 29-39):
```typescript
const result = buildFaqJsonLd([...], 'https://x.test/services/branding') as { mainEntity: { acceptedAnswer: { text: string } }[] };
for (const entry of result.mainEntity) { expect(entry.acceptedAnswer.text.length).toBeGreaterThan(0); }
```
Use a fake `https://x.test` siteUrl. Assert: 9 items, distinct `@id`/`name`/`url`, `provider['@id']` ends `#organization`, urls match `services` slugs. Add recursive key scan asserting none of `price`, `priceRange`, `priceCurrency`, `offers`, `lowPrice`, `highPrice` (guard test pattern, see layout.test.ts below).

---

### `src/app/layout.tsx` (modify: add `hasOfferCatalog`)

**Analog:** itself.

**Imports** (lines 1-7): add alongside existing alias imports, e.g. `import { buildServiceCatalogJsonLd } from "@/lib/serviceSchema";` (double quotes, `@/` alias).

**Insertion point** (lines 133-171, `professionalService`; `SITE_URL` const at line 27):
```typescript
const professionalService = {
  "@type": "ProfessionalService",
  "@id": `${SITE_URL}/#service`,
  ...
  openingHours: "Mo-Fr 09:00-18:00",   // l.170
};
```
Add `hasOfferCatalog: buildServiceCatalogJsonLd(SITE_URL),` before the closing brace. The `@graph` at l.213-216 (`[org, professionalService, website, faq]`) needs no change. Script serialization at l.224 `JSON.stringify(jsonLd)`: optionally swap to `buildJsonLdScript(jsonLd)`.

**Constraint:** the literal substring `priceRange` must not appear anywhere in layout.tsx, even in comments (layout.test.ts l.12). Keep `"ProfessionalService"`, `areaServed`, `openingHours` literals intact (l.16-18).

---

### `src/app/layout.test.ts` (extend)

**Analog:** itself (lines 1-20): source-text read, never import layout.tsx.
```typescript
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const layoutSource = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8');

describe('global JSON-LD (PRIX-01)', () => {
  it('...', () => { expect(layoutSource).not.toContain('priceRange'); });
});
```
Add: `expect(layoutSource).toContain('hasOfferCatalog')` and `toContain('buildServiceCatalogJsonLd')`.

---

### `src/app/sitemap.ts` (modify)

**Analog:** itself (lines 1-14) plus slug enumeration from `[slug]/layout.tsx` l.21-23 (`services.map((s) => ({ slug: s.slug }))`).

**Current code to extend** (lines 1-8):
```typescript
import type { MetadataRoute } from "next";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com";
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
```
Add `import { services } from "@/data/services";`. Build `const serviceEntries: MetadataRoute.Sitemap = services.map((s) => ({ url: `${SITE_URL}/services/${s.slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.8 }))`, add a `/simulateur` entry (monthly, 0.8), and spread `...serviceEntries` after the `/services` entry. Annotating the const with `MetadataRoute.Sitemap` avoids the `as const` literal-widening issue on `changeFrequency`.

---

### `src/app/sitemap.test.ts` (new)

**Analog:** `src/app/page.test.ts` for `@/data/services` import (line 3) and describe/it loop style (lines 157-162):
```typescript
import { describe, expect, it } from 'vitest';
import { services } from '@/data/services';
for (const s of services) { expect(...).toContain(...) }
```
Import `sitemap from './sitemap'` directly (only `next` types, erased; safe under node env). Assert all 9 slug URLs, `/simulateur`, 5 originals, no duplicate urls. Do not hardcode the slug list; derive from `services`.

---

### `public/llms.txt` (modify)

**Analog:** itself, Links block lines 25-31:
```
- Accueil : https://sevalys.com/
- Services & tarifs : https://sevalys.com/services      <- l.28, relabel to "Services"
- Calculateur de ROI (agent vocal) : https://sevalys.com/calculateur-roi
```
Keep the `- Label : URL` format (space-colon-space). Add 9 lines `- {items[i].name} à Tours : https://sevalys.com/services/{slug}` and `- Simulateur de diagnostic : https://sevalys.com/simulateur`. Do not touch l.20 "Devis : sous 48h". No "Différenciation" section (D-04).

---

### `src/app/llms.test.ts` (new)

**Analog:** `src/app/layout.test.ts` lines 1-8 (`readFileSync(new URL(...), 'utf8')`). Public file is at `../../public/llms.txt` relative to `src/app`:
```typescript
const llms = readFileSync(new URL('../../public/llms.txt', import.meta.url), 'utf8');
```
Split lines with `/\r?\n/` (CRLF on Windows). Assert each `https://sevalys.com/services/${slug}` and `/simulateur` present, and `expect(llms.toLowerCase()).not.toContain('tarif')`.

---

### `src/app/linkAudit.test.ts` (new, test, static scan)

**Analog:** `src/app/page.test.ts`.

**Safe file read helper** (lines 9-15):
```typescript
const readIfExists = (relative: string): string => {
  try { return readFileSync(new URL(relative, import.meta.url), 'utf8'); } catch { return ''; }
};
```

**Href extraction** (lines 89-105), reuse verbatim (or copy into the audit):
```typescript
const HREF_PATTERN = /href=(?:"([^"]*)"|\{`([^`]*)`\})/g;
function extractHrefs(source: string): string[] {
  const hrefs: string[] = [];
  let match: RegExpExecArray | null;
  HREF_PATTERN.lastIndex = 0;
  while ((match = HREF_PATTERN.exec(source)) !== null) {
    if (match[1] !== undefined) hrefs.push(match[1]);
    else if (match[2] !== undefined) hrefs.push(`\`${match[2]}\``);
  }
  return hrefs;
}
```
Template hrefs are returned wrapped in backticks, e.g. the known `` `/services/${s.slug}` `` (page.test.ts l.63); also `` `/services/${copy.crossLink.slug}` `` must map to the slug set.

**Prefix skip list** (line 62): `['tel:', 'mailto:']`, extend with `http:`/`https:`.

**Dead-destination guard** (lines 65-70): include `/services#phone-agent` as a negative fixture for `resolveHref` (must fail).

**Slug import** (line 3): `import { services } from '@/data/services';` to expand `[slug]`.

**Differences from page.test.ts:** it deliberately excludes Navbar/Footer (l.72-76); the audit must include them. Route table is derived by fs walk of `src/app` for `page.tsx` (use `readdirSync` with `withFileTypes`); anchor table = `id="..."` from components imported by `src/app/page.tsx` (parse `@/components/sections/X` imports), so orphan components (PhoneAgentExplainer, FinalCtaSection) do not mask `#phone-agent`. Full design: RESEARCH lines 149-156.

---

### `src/lib/serviceJsonLd.test.ts` (extend with D-01 guard)

**Analog:** `src/app/layout.test.ts` source-text pattern. Read `../app/services/[slug]/layout.tsx` as text and assert it does not contain `'Service'` / `"Service"` as an `@type` literal, and still uses `buildFaqJsonLd` (imports at layout l.5). Note the existing file uses `import { describe, expect, it } from 'vitest'` and relative imports. Put the guard in `serviceSchema.test.ts` if preferred to avoid mixing concerns.

---

## Shared Patterns

### Source-text guard tests encode policy
**Source:** `src/app/layout.test.ts` lines 4-19, `src/app/page.test.ts` lines 17, 61-70
**Apply to:** layout.test.ts extension, serviceSchema.test.ts, llms.test.ts, linkAudit.test.ts
Read source via `readFileSync(new URL(rel, import.meta.url), 'utf8')`, never import Server Components (`next/font` fails under `environment: 'node'`). Failure messages carry context strings (`expect(x, \`msg\`)`).

### French-hardcoded server schema
**Source:** `src/app/services/[slug]/layout.tsx` lines 7-15, 37, 59
**Apply to:** serviceSchema.ts, layout.tsx
Use `translations.fr`, never language context (i18n is client-only post-hydration). `SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com"` (layout l.27, sitemap l.3).

### Single source of truth for slugs
**Source:** `src/data/services.ts` (`services`, `index` join key, 9 slugs)
**Apply to:** sitemap.ts, serviceSchema.ts, all new tests, llms.txt drift test
Never hardcode the 9 slugs in code or tests.

### No-price policy (PRIX-01 / D-03)
**Source:** `src/app/layout.test.ts` l.11-13
**Apply to:** layout.tsx (no `priceRange` substring even in comments), serviceSchema.ts (no `price*`/`offers` keys), llms.txt (no "tarif")

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `docs/strategie-seo-geo-llm-2026-09.md` | doc | n/a | Prose edit; use inline blockquote `> **[Superseded 2026-10 — voir §9 / politique sans prix]**` beneath lines 26, 35, 52, 69, 93, 121 (RESEARCH l.182-191); original text kept |
| fs route-walker for `page.tsx` discovery | test helper | batch | No existing test walks `src/app`; use Node `readdirSync`/`statSync`, design in RESEARCH l.151 |
| GSC submit (D-10) | manual checkpoint | n/a | `checkpoint:human-action`, not code; sequence in RESEARCH l.199-206 |

## Metadata

**Analog search scope:** `src/app`, `src/lib`, `src/data`, `public`
**Files read:** sitemap.ts, llms.txt, layout.tsx (excerpts), layout.test.ts, page.test.ts, serviceJsonLd.ts + test, services.ts (head), `[slug]/layout.tsx`
**Pattern extraction date:** 2026-10-01
