---
phase: 06-service-pages-template-content
reviewed: 2026-09-20T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/app/globals.css
  - src/app/services/[slug]/layout.tsx
  - src/app/services/[slug]/not-found.tsx
  - src/app/services/[slug]/page.tsx
  - src/app/services/layout.tsx
  - src/app/services/page.tsx
  - src/data/services.test.ts
  - src/data/services.ts
  - src/lib/serviceJsonLd.test.ts
  - src/lib/serviceJsonLd.ts
  - src/lib/translations.test.ts
  - src/lib/translations.ts
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-09-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed the data spine (`services.ts`), the shared JSON-LD builder (`serviceJsonLd.ts`), the three-locale content dictionary (`translations.ts`), the 9 `/services/[slug]` page/layout components, the `/services` index, and the new Phase 6 CSS. The unit tests for `services.ts`, `serviceJsonLd.ts` and `translations.ts` are thorough and enforce the key data invariants (slug bijection, 9-of-9 completeness, caseQuote/signals mutual exclusivity, no-price guard, crossLink resolvability). Data content itself is internally consistent across fr/en/th for the files checked.

The main defect found is a real correctness/SEO gap: the FAQPage JSON-LD emitted server-side (and the page's `<title>`/meta description) is permanently hardcoded to French, while the visible page content switches to the visitor's browser-detected or stored language immediately on mount — including for a default-locale (en-US) crawler render. This directly undermines the stated purpose of this phase (structured data for SEO/GEO/LLM discovery, SVC-05) for two of the three shipped locales. Several smaller robustness and dead-code issues are also listed below.

## Critical Issues

### CR-01: FAQPage JSON-LD (and page `<title>`/description) never match the rendered page for en/th visitors, including default-locale crawlers

**File:** `src/app/services/[slug]/layout.tsx:27-55`, `src/app/services/layout.tsx:3-68`

**Issue:** `generateMetadata` and the FAQPage JSON-LD builder in `[slug]/layout.tsx` always read from `translations.fr.services.pages.items[svc.index]` (lines 31, 34-46, 53, 55). Meanwhile `src/context/LanguageContext.tsx` initializes `lang` to `'fr'` only until its first `useEffect` runs, at which point it reads `localStorage` and, if nothing is stored, calls `detectBrowserLang()` — which returns `'en'` for any non-fr/non-th `navigator.language`. This means:
- Any first-time visitor whose browser isn't French sees the page's FAQ, headings, features, etc. switch to English/Thai within a tick of mount, while the `<script type="application/ld+json">` FAQPage payload embedded in the initial HTML keeps the French Q&A pairs.
- Googlebot's default rendering profile uses `en-US`, so Google's own headless render of every one of the 9 pages will show the same mismatch between visible content and structured data — the exact audience `docs/strategie-seo-geo-llm-2026-09.md` (SVC-05) is targeting.
- The `<title>`/meta description built in `generateMetadata` (and the static index metadata in `services/layout.tsx`) are likewise always French regardless of the resolved locale.

The code comments acknowledge this is inherited from `src/app/layout.tsx`'s existing pattern ("the existing … gap must not be propagated" is stated as an intent in `serviceJsonLd.ts`, but the propagation happens anyway in `layout.tsx`). Propagating a known-bad pattern to 9 new, SEO-purposed pages multiplies its impact rather than containing it.

**Fix:** Resolve the locale server-side before building metadata/JSON-LD instead of hardcoding `translations.fr`, e.g. read the `Accept-Language` header (via `headers()` in the Server Component) or, more robustly, move locale into the URL (`/en/services/[slug]`) so crawlers get a URL whose static HTML actually matches its own metadata:
```ts
import { headers } from "next/headers";
// ...
const lang = resolveLangFromAcceptLanguage((await headers()).get("accept-language"));
const copy = translations[lang].services.pages.items[svc.index];
```
At minimum, add `inLanguage: "fr-FR"` to the JSON-LD and document that the schema is intentionally fr-only, so it stops silently contradicting whatever language the visitor/crawler actually sees.

## Warnings

### WR-01: `caseQuote`/`signals` mutual-exclusivity is enforced only by tests, not by the type system

**File:** `src/lib/translations.ts:5-21` (`ServicePageContent`), `src/app/services/[slug]/page.tsx:86-116`

**Issue:** `ServicePageContent` declares `caseQuote: string | null` and `signals: { t: string; d: string }[]` as two independent, uncoupled fields. The actual contract ("3 signals when caseQuote is null, otherwise []") is documented only in a comment and enforced only by `translations.test.ts`'s "social-proof rule" test. `page.tsx`'s "Preuve sociale" section (lines 89-114) blindly trusts this: if `caseStudyProjectIndex !== null` but a future edit leaves `caseQuote` null for one locale, or leaves `signals` empty when it shouldn't be, the page silently renders an empty `<div className="reassure-grid">` with no cards and no error.

**Fix:** Model the pairing as a discriminated union so a violation is a compile error, not a silent empty section, e.g.:
```ts
socialProof:
  | { kind: 'case'; quote: string }
  | { kind: 'signals'; items: { t: string; d: string }[] };
```

### WR-02: No runtime guard against an invalid `services.ts` ↔ `projects.ts` join

**File:** `src/app/services/[slug]/page.tsx:89-104`

**Issue:** `const project = projects[svc.caseStudyProjectIndex as number];` is dereferenced immediately afterwards (`project.href`, `project.name`, `project.year`) with no check that `project` is defined. This join is currently correct and covered by `services.test.ts` ("every non-null caseStudyProjectIndex is a valid projects index"), but that's a test-time guarantee only — if `projects.ts` is ever edited (an entry removed/reordered) without re-running the test suite before deploy, this throws a client-side `TypeError` and crashes the page for every locale at runtime, with no defensive fallback.

**Fix:**
```ts
const project = projects[svc.caseStudyProjectIndex as number];
if (!project) return null; // or fall back to the signals branch
```

### WR-03: Dead CSS left over from the pre-D-10 pricing/popularity design

**File:** `src/app/globals.css:479, 482-483`

**Issue:** `.pop-tag`, `.o-from`, and `.o-price` were the "most requested" badge and price display for the old 4-card offers grid. Per D-10/SVC-03, the new `/services` index (`src/app/services/page.tsx`) intentionally never renders price or "popular" markup (confirmed: no remaining `o-price`/`o-from`/`pop-tag`/`popular` references anywhere under `src/app`, and `services.test.ts` explicitly asserts their absence from the index page source). These three rules are now unreachable dead code.

**Fix:** Remove the three rules, or add a one-line comment if they're intentionally kept for a different, still-shipping surface.

## Info

### IN-01: Slugs are untyped strings, so a `crossLink` typo is only caught by a runtime test

**File:** `src/data/services.ts:19-26`, `src/lib/translations.ts:20`

**Issue:** `Service.slug` and `ServicePageContent.crossLink.slug` are both plain `string`. A typo in a `crossLink.slug` value is caught only by `translations.test.ts`'s `getServiceBySlug` resolvability check, not by the compiler.

**Fix:** Derive a literal union from `services`, e.g. `export const services = [...] as const satisfies Service[];` and type `slug` as `(typeof services)[number]['slug']`, so an invalid cross-link slug is a type error.

### IN-02: Cross-link block breaks the section rhythm

**File:** `src/app/services/[slug]/page.tsx:118-122`

**Issue:** Every other content block on the page is `<section className="svc-sec"><div className="wrap">...</div></section>`, giving it the `.svc-sec` top border and vertical padding (`globals.css:681`). The `crossLink` block is a bare `<div className="wrap">` with no `<section>` wrapper, so it renders without that spacing/border between "Preuve sociale" and "FAQ" — likely intentional (it's just a one-line link) but worth confirming against the UI spec since it's the only exception.

### IN-03: New service pages use plain `<a>` instead of `next/link`

**File:** `src/app/services/page.tsx:47`, `src/app/services/[slug]/page.tsx:32, 120`, `src/app/services/[slug]/not-found.tsx:16`

**Issue:** Internal navigation between the index and the 9 service pages (and back) uses `<a href>`, causing a full page reload with no prefetching. This matches the rest of the codebase (no file under `src/` imports `next/link`), so it isn't a regression introduced by this phase, but this phase concentrates the site's densest cluster of internal links (index → 9 pages, crossLink between related pages, back-to-index), which is exactly where client-side navigation would pay off most.

---

_Reviewed: 2026-09-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
