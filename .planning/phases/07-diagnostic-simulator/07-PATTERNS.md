# Phase 7: Diagnostic Simulator - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 12 (new) + 2 (extend-in-place)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/app/simulateur/layout.tsx` | route/config (Server Component metadata + JSON-LD) | request-response | `src/app/services/[slug]/layout.tsx` | exact |
| `src/app/simulateur/page.tsx` | component (client wizard host) | event-driven (step state machine) | `src/app/services/[slug]/page.tsx` (structure) + `src/app/calculateur-roi/page.tsx` (useState-driven client tool) | role-match |
| `src/lib/simulateur/questions.ts` | model/data (question bank) | transform (pure data + pure fn) | `src/data/services.ts` | role-match |
| `src/lib/simulateur/questions.test.ts` | test | transform | `src/data/services.test.ts` | role-match |
| `src/lib/simulateur/priorityOrder.ts` | model/config (fixed constant) | transform | `src/data/services.ts` (`services` array + `LOCKED_SLUGS` convention in its test) | role-match |
| `src/lib/simulateur/scoring.ts` | service/utility (pure scoring functions) | transform | `src/lib/serviceJsonLd.ts` (pure, framework-free lib module convention) | role-match |
| `src/lib/simulateur/scoring.test.ts` | test | transform | `src/lib/serviceJsonLd.test.ts` + `src/app/api/simulateur/route.test.ts` (payload-shape assertions) | role-match |
| `src/components/simulateur/ScoreGauge.tsx` | component (SVG + count-up) | streaming (animation tween → state) | `src/components/sections/MethodologySection.tsx` | exact |
| `src/components/simulateur/Wizard.tsx` (or inline in `page.tsx`) | component (multi-step form) | event-driven / request-response (final submit) | `src/app/calculateur-roi/page.tsx` (`ControlRow` + `useState`) + `src/components/sections/ContactSection.tsx` (form + submit + status) | role-match |
| Submit handler (inside Wizard) | controller-ish (client fetch call) | request-response | `src/components/sections/ContactSection.tsx`'s `handleSubmit` | exact |
| `src/lib/translations.ts` (extend: add `simulateur` key, all 3 locales) | config/i18n data | transform | existing `services.pages` block (`ServicePageContentBase`/`FaqItem` shape) | exact |
| `src/lib/translations.test.ts` (extend: add simulateur + price-lint assertions) | test | transform | existing `SVC-02` no-price-guard block (lines 7-10, 75-80) | exact |

## Pattern Assignments

### `src/app/simulateur/layout.tsx` (route/config, request-response)

**Analog:** `src/app/services/[slug]/layout.tsx`

**Imports pattern** (lines 1-5 of analog):
```typescript
import type { Metadata } from "next";
import { translations } from "@/lib/translations";
import { buildFaqJsonLd, buildJsonLdScript } from "@/lib/serviceJsonLd";
```
No `getServiceBySlug`/`notFound` needed — `/simulateur` has no dynamic segment, so drop those two imports and the `generateStaticParams`/`notFound()` machinery (lines 21-32, 55-58 of the analog do not apply here).

**Core pattern** (lines 33-53, adapted — no `params`, no per-slug branching):
```typescript
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com";

export const metadata: Metadata = {
  title: translations.fr.simulateur.metaTitle,
  description: translations.fr.simulateur.metaDescription,
  alternates: { canonical: "/simulateur" },
  robots: { index: true, follow: true }, // NOT calculateur-roi's { index: false, follow: false }
  openGraph: {
    title: translations.fr.simulateur.metaTitle,
    description: translations.fr.simulateur.metaDescription,
    type: "website",
    locale: "fr_FR",
    siteName: "Sèvalys",
    url: "/simulateur",
  },
};

export default function SimulateurLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = buildFaqJsonLd(translations.fr.simulateur.faq, `${SITE_URL}/simulateur`);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildJsonLdScript(jsonLd) }} />
      {children}
    </>
  );
}
```
Keep the analog's comment block explaining the "hardcoded-French JSON-LD is intentional" gap (analog lines 7-15) — copy verbatim, it documents the same Server-Component-can't-see-`LanguageContext` constraint (RESEARCH.md Pitfall 6).

**Contrast, not to copy:** `src/app/calculateur-roi/layout.tsx` uses `robots: { index: false, follow: false }` because it's an internal sales tool — `/simulateur` is explicitly the opposite (SIMU-08 wants it indexed/citable). Do not copy that `robots` line.

---

### `src/app/simulateur/page.tsx` (component, event-driven)

**Analogs:** `src/app/services/[slug]/page.tsx` (top-of-file convention) + `src/app/calculateur-roi/page.tsx` (client-only stateful tool body)

**Imports/shell pattern** (from `services/[slug]/page.tsx` lines 1-13):
```typescript
'use client';
// page.tsx must be 'use client' because useReveals() calls IntersectionObserver (browser API)
// Metadata + FAQPage JSON-LD live in src/app/simulateur/layout.tsx — do NOT add them here

import { useReveals } from '@/hooks/useReveals';
import { useLanguage } from '@/context/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
```
No `use(params)` / `getServiceBySlug` — `/simulateur` has no route param.

**Page shape** — reuse the `services/[slug]/page.tsx` skeleton: `<Navbar />`, `<main>` with `data-reveal` sections for the pillar intro (lines 27-48 style: hero-like intro block), then the wizard region, then a FAQ block using the exact `<details>`/`<summary>` markup (lines 135-147):
```tsx
<section className="svc-sec">
  <div className="wrap">
    <h2 className="svc-h2">{t.simulateur.faq.heading}</h2>
    <div className="faq-list">
      {t.simulateur.faq.items.map((item, i) => (
        <details className="faq-item" key={i} data-reveal data-reveal-delay={String(i % 3)}>
          <summary className="faq-q">{item.q}</summary>
          <p className="faq-a">{item.a}</p>
        </details>
      ))}
    </div>
  </div>
</section>
```
(Note: `07-UI-SPEC.md` requires the FAQ `<p>` to always be in the DOM, not conditionally rendered on open — the `<details>` native element already satisfies this since content stays in the DOM regardless of `open` state; do not add a JS-controlled conditional render on top.)

**Client-tool state-machine pattern** (from `calculateur-roi/page.tsx` lines 1, 7, 86-91):
```typescript
'use client';
import { useState } from 'react';
// ...
export default function SimulateurPage() {
  const [step, setStep] = useState(0); // question index, or 'contact'/'result' sentinel
  const [answers, setAnswers] = useState<{ questionId: string; value: string | string[] }[]>([]);
  const set = (questionId: string) => (value: string | string[]) =>
    setAnswers((prev) => [...prev.filter((a) => a.questionId !== questionId), { questionId, value }]);
  // formRenderedAt captured once, per RESEARCH.md Pitfall 3 (hydration-safe):
  const [formRenderedAt] = useState(() => Date.now());
  // ...
}
```
This mirrors `calculateur-roi`'s `const [v, setV] = useState(DEFAULTS); const set = (key) => (val) => setV(...)` curried-setter convention (lines 87-91) — reuse the same curry shape for per-question answer setters.

---

### `src/lib/simulateur/questions.ts` (model/data, transform)

**Analog:** `src/data/services.ts`

**Pattern to copy** (data-array + typed interface + pure lookup helper, analog lines 19-34, 36-91, 93-97):
```typescript
// src/data/services.ts's shape:
export interface Service {
  slug: string;
  index: number;
  caseStudyProjectIndex: number | null;
  featureIcons: string[];
}
export const services: Service[] = [ /* ...9 literal entries... */ ];
export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}
```
Apply the same shape to `Question`/`QuestionOption` (per RESEARCH.md Pattern 1): plain exported array of literals + one or more pure exported helper functions (`nextQuestionId`), no classes, no side effects — this is the established "data spine + join-key + pure helper" convention this codebase already uses twice (`services.ts` here, and `projects.ts` for case studies).

**Comment-header convention to copy** (analog lines 1-17): a top-of-file comment explaining the join keys and any locked/fixed ordering constraints (mirror this for `PRIORITY_ORDER`'s D-07 rationale and each question's severity/weight rationale).

---

### `src/lib/simulateur/questions.test.ts` (test, transform)

**Analog:** `src/data/services.test.ts`

**Pattern to copy** (lines 11-21, 23-37, 60-63 style — locked-list + shape assertions):
```typescript
import { describe, expect, it } from 'vitest';
import { QUESTIONS, nextQuestionId } from './questions';

describe('QUESTIONS', () => {
  it('has between 3 and 5 entries (D-02)', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(3);
    expect(QUESTIONS.length).toBeLessThanOrEqual(5);
  });
  it('every question id is unique', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('nextQuestionId', () => {
  it('returns the first question id when no answers exist', () => { /* ... */ });
  it('returns null once every question has been answered', () => { /* ... */ });
});
```
Follow `services.test.ts`'s house style: `describe` blocks per exported symbol, one assertion concern per `it`, comment referencing the CONTEXT.md decision ID (`D-02`, `D-06`, etc.) the test enforces — this traceability-comment convention is used throughout the test suite (see also `translations.test.ts` line 7's `// SVC-02 no-price guard`).

---

### `src/lib/simulateur/priorityOrder.ts` (model/config, transform)

**Analog:** the `LOCKED_SLUGS` constant pattern in `src/data/services.test.ts` (lines 11-21) + the 9-slug array itself in `src/data/services.ts`

**Pattern:**
```typescript
// src/lib/simulateur/priorityOrder.ts
import type { ServiceSlug } from './questions';

// D-07: fixed tiebreak order, used ONLY when two services have equal summed
// weight in computeRecommendedServices(). Does not express any other
// preference (e.g. display order elsewhere in the app).
export const PRIORITY_ORDER: ServiceSlug[] = [
  'site-vitrine',
  'agent-vocal-ia',
  'maintenance',
  'rebranding-site-premium',
  'projet-sur-mesure',
  'branding',
  'community-management',
  'meta-ads',
  'google-ads',
];
```
Test it the same way `services.test.ts` tests `LOCKED_SLUGS` (exact-array-equality + "every slug is one of the 9 canonical slugs" + no duplicates).

---

### `src/lib/simulateur/scoring.ts` (service/utility, transform)

**Analog (structural convention — framework-free, no React/DOM/Next imports):** `src/lib/serviceJsonLd.ts`

**Header-comment pattern to copy** (analog lines 1-4):
```typescript
// Pure scoring functions for the /simulateur wizard (Phase 7). Must stay free
// of React, DOM, and Next.js imports so both the wizard's client component
// and vitest (environment: 'node') can import it directly — same constraint
// documented at the top of src/lib/prospects-schema.ts and src/lib/serviceJsonLd.ts.
```

**Core pattern:** implement exactly `computeRecommendedServices(answers)` and `computeVisualScore(answers)` as shown in RESEARCH.md Pattern 2 (lines 256-303 of `07-RESEARCH.md`) — two named exports, no shared intermediate value, `ServiceSlug[]` vs `number` return types (guards against Pitfall 1's score-conflation risk). Reuse `PRIORITY_ORDER` from `priorityOrder.ts` for the tiebreak exactly as shown there.

**File-naming constraint (RESEARCH.md Pitfall 2):** must be named `scoring.ts`, not `scoring.tsx` — `vitest.config.ts`'s `include: ['src/**/*.test.ts']` silently skips `.tsx` test files with `passWithNoTests: true`, so keep this module (and its test) free of JSX entirely.

---

### `src/lib/simulateur/scoring.test.ts` (test, transform)

**Analogs:** `src/lib/serviceJsonLd.test.ts` (pure-function unit-test shape) + `src/app/api/simulateur/route.test.ts` (payload-shape/boundary assertions)

**Pattern to copy** (from `serviceJsonLd.test.ts` lines 1-9, 24-27 — `describe`-per-export, edge-case-first):
```typescript
import { describe, expect, it } from 'vitest';
import { computeRecommendedServices, computeVisualScore } from './scoring';

describe('computeRecommendedServices', () => {
  it('never returns fewer than 2 or more than 4 services (SIMU-02)', () => { /* ... */ });
  it('never returns all 9 services', () => { /* ... */ });
  it('breaks ties using PRIORITY_ORDER, deterministically', () => { /* ... */ });
  it('can recommend maintenance standalone when reliability signals dominate (D-08)', () => { /* ... */ });
});

describe('computeVisualScore', () => {
  it('always returns a number within [0, 100] (SIMU-03)', () => { /* ... */ });
});
```
**Boundary-assertion convention to copy** (from `route.test.ts` lines 123-140 — asserting exact object shape via `Object.keys(...).sort()`): use the same "assert exact key set" idiom when testing that the assembled POST payload has no stray score field:
```typescript
it('the assembled payload never includes a score/gauge field (Anti-Pattern guard)', () => {
  // build the same payload the wizard's submit handler would construct
  expect(Object.keys(payload)).not.toContain('score');
  expect(Object.keys(payload)).not.toContain('visualScore');
});
```

---

### `src/components/simulateur/ScoreGauge.tsx` (component, streaming/animation)

**Analog:** `src/components/sections/MethodologySection.tsx` (verbatim scrub-to-state precedent, confirmed shipped in this repo)

**Imports pattern** (analog lines 1-7):
```typescript
'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
```
(Drop `ScrollTrigger`/`registerPlugin` — the gauge animates on mount, not on scroll, per RESEARCH.md Assumption A3 / UI-SPEC's explicit "not on scroll" note — this is the one deviation from the analog.)

**Core count-up pattern** (adapted from analog lines 13-46's `railFill` state + `onUpdate` callback, combined with RESEARCH.md's Pattern 3 code example):
```typescript
function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target); // same reduced-motion branch shape as useReveals()
      return;
    }
    const obj = { v: 0 };
    const tween = gsap.to(obj, { v: target, duration: 1.4, ease: 'power2.out', onUpdate: () => setValue(obj.v) });
    return () => { tween.kill(); };
  }, [target]);
  return value;
}
```
**SVG structure:** hand-rolled `<circle>` pair with `strokeDasharray`/`strokeDashoffset`, per `07-UI-SPEC.md`'s locked dimensions (200px diameter, 14px stroke, track in `--line`, fill arc in `--acid`, rounded linecap) — no charting library, matches the zero-dependency precedent both `RESEARCH.md` and `07-UI-SPEC.md` lock.

**Cleanup pattern to copy** (analog line 43-45's `return () => { ScrollTrigger.getAll().forEach(t => t.kill()) }`): always kill the GSAP tween in the `useEffect` cleanup, same defensive pattern.

---

### Wizard component (`src/app/simulateur/page.tsx` or extracted `Wizard.tsx`) — question screens, contact-capture, submit

**Analogs:** `src/app/calculateur-roi/page.tsx` (`ControlRow` pattern for reusable field UI, curried setters) + `src/components/sections/ContactSection.tsx` (form fields + submit + status state)

**Answer-option control pattern** (adapt `ControlRow`'s shape, analog lines 38-84 — label + controlled input + onChange, min/max/step generalized to select/multi-select):
```tsx
function AnswerOption({
  label, selected, onSelect,
}: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      className={`sim-option${selected ? ' selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}
```
(≥44px touch target and `--acid-soft`/`--acid` selected styling per `07-UI-SPEC.md`'s locked Component & Layout Patterns section — apply via CSS class, not inline style, matching `roi-field`/`roi-toggle`'s class-driven convention.)

**Form field + submit pattern** (`ContactSection.tsx` lines 10-16, 18-36, 60-109 — `useState` object, `status` state machine, controlled inputs, disabled-until-valid submit):
```typescript
const [contact, setContact] = useState({ nom: '', email: '', telephone: '' });
const [consent, setConsent] = useState(false); // unticked default (SIMU-05)
const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

async function handleSubmit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setStatus('sending');
  const payload = {
    nom: contact.nom, email: contact.email, telephone: contact.telephone,
    reponsesDiagnostic: answers,
    servicesRecommandes: computeRecommendedServices(answers), // 2-4 slugs
    consentementRgpd: consent as true,
    website: '', // honeypot, always empty
    formRenderedAt,
  };
  try {
    const res = await fetch('/api/simulateur', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setStatus(body.ok ? 'sent' : 'error');
    if (body.ok) setStep('result');
  } catch {
    setStatus('error');
  }
}
```
Copy the `ContactSection.tsx` disabled-button pattern (`disabled={status !== 'idle'}`, line 107) and the "flip status back to idle on user edit if you want re-submit" convention if needed.

**Payload correctness — do not hand-roll a second type:**
```typescript
// Source: src/lib/prospects-schema.ts (verified in this repo, field-for-field)
import { prospectSchema, type ProspectSubmission } from '@/lib/prospects-schema';
const payload: ProspectSubmission = { ...input, website: '' };
prospectSchema.parse(payload); // optional client-side guard, mirrors server's own check
```

**Honeypot field rendering** (server-verified contract, `07-RESEARCH.md` Code Examples):
```tsx
<input
  type="text" name="website" tabIndex={-1} autoComplete="off"
  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
  aria-hidden="true"
/>
```

**Progress bar pattern (D-14):** no existing exact analog for a fill-bar in this codebase; adapt `MethodologySection.tsx`'s `railFill` `<div style={{ height: ... }}>` idiom (analog line 63) to a horizontal width-based fill:
```tsx
<div className="sim-progress-track">
  <div className="sim-progress-fill" style={{ width: `${(answeredCount / QUESTIONS.length) * 100}%` }} />
</div>
```

---

### `src/lib/translations.ts` (extend — add `simulateur` key, fr/en/th)

**Analog:** the existing `services.pages` block's `ServicePageContentBase`/`FaqItem` shape (translations.ts lines 5-19, 37-44)

**Pattern to copy:**
```typescript
// Add alongside the existing services: { ... } key in the Translations interface
simulateur: {
  metaTitle: string;
  metaDescription: string;
  intro: { /* pillar-intro paragraphs, per D-16 */ };
  questions: Record<string, { text: string; options: Record<string, string> }>; // labelKey lookups joined by questions.ts's ids
  contact: { nomLabel: string; emailLabel: string; telephoneLabel: string; consentLabel: string; rgpdMentions: string; submit: string; errorHeading: string; errorBody: string };
  result: { heading: string; gaugeCaption: string; ctaHeading: string; callLabel: string; writeLabel: string };
  faq: { q: string; a: string }[]; // same FaqItem shape buildFaqJsonLd expects
};
```
Reuse the exact `faq: { q: string; a: string }[]` shape (matches `ServicePageContentBase.faq`, analog line 17) so `buildFaqJsonLd` accepts it with zero adaptation.

---

### `src/lib/translations.test.ts` (extend — locale parity + no-price guard)

**Analog:** the existing `SVC-02` block (lines 7-10, 44-47, 75-80)

**Pattern to copy verbatim (same regex, new scope):**
```typescript
// SIMU-06 no-price guard — must never match anywhere in t.simulateur, for
// any locale (mirrors SVC-02's guard on t.services.pages).
const PRICE_PATTERN = /€|฿|\bprix\b|\btarifs?\b|\beuros?\b|\bprice\b|\bpricing\b|à partir de/i;

it('SIMU-06: no pricing language appears anywhere in simulateur copy, for any locale', () => {
  for (const lang of LANGS) {
    const serialized = JSON.stringify(translations[lang].simulateur);
    expect(serialized).not.toMatch(PRICE_PATTERN);
  }
});

it('fr/en/th all declare simulateur.faq with the same length (locale parity)', () => {
  const lengths = LANGS.map((lang) => translations[lang].simulateur.faq.length);
  expect(new Set(lengths).size).toBe(1);
});
```

---

## Shared Patterns

### Reduced-motion branch (GSAP + reveals)
**Source:** `src/hooks/useReveals.ts` lines 5-11 (`window.matchMedia('(prefers-reduced-motion: reduce)').matches` → skip animation, jump to final state)
**Apply to:** `ScoreGauge.tsx`'s `useCountUp` hook (must use the identical branch shape) and the pillar intro's `data-reveal` sections (via `useReveals()` itself, no new code needed there).

### Pure, framework-free lib modules
**Source:** `src/lib/serviceJsonLd.ts` lines 1-4 (header comment: "Must stay free of next/*, React, and Supabase imports") and `src/lib/prospects-schema.ts` lines 3-6 (same constraint, worded for the schema)
**Apply to:** `src/lib/simulateur/questions.ts`, `scoring.ts`, `priorityOrder.ts` — all three must import only from each other and stay React/DOM/Next-free so `vitest` (environment: `node`) can import them directly and the wizard component can import them too.

### Payload assembly — reuse `prospectSchema`, never hand-type a duplicate
**Source:** `src/lib/prospects-schema.ts` (`prospectSchema`, `ProspectSubmission`) + `src/app/api/simulateur/route.ts` (the exact server-side consumer)
**Apply to:** the wizard's submit handler exclusively — this is the single integration seam between all new frontend code and the already-shipped, unmodifiable backend. Do not add a `score`/`visualScore` field to this payload (Anti-Pattern, SIMU-03).

### FAQ JSON-LD
**Source:** `src/lib/serviceJsonLd.ts` (`buildFaqJsonLd`, `buildJsonLdScript`)
**Apply to:** `src/app/simulateur/layout.tsx` exclusively (Server Component boundary) — do not attempt to call these from `page.tsx`.

### Test traceability comments
**Source:** `src/lib/translations.test.ts` line 7 (`// SVC-02 no-price guard — ...`), `src/data/services.test.ts` line 52 (`// D-05`)
**Apply to:** every new `*.test.ts` file in `src/lib/simulateur/` — prefix non-obvious assertions with the REQUIREMENTS.md/CONTEXT.md ID they enforce (SIMU-01..08, D-01..16), matching the house convention.

### `.ts` not `.tsx` for pure logic + tests
**Source:** `vitest.config.ts`'s `include: ['src/**/*.test.ts']` (confirmed in `07-RESEARCH.md` Pitfall 2, sourced from the config file directly)
**Apply to:** `questions.ts`, `scoring.ts`, `priorityOrder.ts` and their `*.test.ts` files — never `.tsx`, never any JSX/React import in these five files.

## No Analog Found

None — every new file has at least a role-match analog already shipped in this codebase. The only genuinely net-new UI element with no prior shipped precedent is the **progress bar** (D-14) and the **RGPD consent checkbox** (SIMU-05); both are covered above by adapting the closest structurally-similar shipped pattern (`MethodologySection.tsx`'s `railFill` div-width idiom; `ContactSection.tsx`'s form-field/status conventions) rather than a literal existing component — flagged here for the planner's awareness, not left unaddressed.

## Metadata

**Analog search scope:** `src/app/`, `src/lib/`, `src/components/`, `src/data/`, `src/hooks/`, `src/context/`, `.planning/phases/05-*`, `.planning/phases/06-*`
**Files scanned:** `src/app/services/[slug]/layout.tsx`, `src/app/services/[slug]/page.tsx`, `src/app/calculateur-roi/page.tsx`, `src/app/calculateur-roi/layout.tsx`, `src/lib/prospects-schema.ts`, `src/lib/prospects-schema.test.ts` (referenced), `src/app/api/simulateur/route.ts`, `src/app/api/simulateur/route.test.ts`, `src/components/sections/MethodologySection.tsx`, `src/components/sections/ContactSection.tsx`, `src/lib/serviceJsonLd.ts`, `src/lib/serviceJsonLd.test.ts`, `src/data/services.ts`, `src/data/services.test.ts`, `src/hooks/useReveals.ts`, `src/context/LanguageContext.tsx`, `src/lib/translations.ts`, `src/lib/translations.test.ts`, `src/app/mentions-legales/page.tsx`, `graphify-out/GRAPH_REPORT.md`
**Pattern extraction date:** 2026-09-20
