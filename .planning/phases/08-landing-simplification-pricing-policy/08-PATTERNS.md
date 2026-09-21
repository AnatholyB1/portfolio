# Phase 8: Landing Simplification & Pricing Policy - Pattern Map

**Mapped:** 2026-09-21
**Files analyzed:** 12 (8 modified, 3 new components, 1 new test-file family — 4 new test files)
**Analogs found:** 12 / 12 (all files have an in-repo analog; this phase adds no new stack)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/page.tsx` | route/composition | request-response (SSR/client compose) | itself (in-place edit) | exact — only re-sequencing imports/JSX children |
| `src/components/sections/ProblemSection.tsx` | component | transform (i18n → JSX) | itself (in-place content swap, D-04) | exact |
| `src/components/sections/ServicesPreview.tsx` (**new**) | component | transform (data + i18n → JSX list) | `src/app/services/page.tsx`'s `offers-grid` card loop + `OptionsSection.tsx`'s `upsell-grid` card loop | role-match (composite of two existing analogs) |
| `src/components/sections/FonctionnementSection.tsx` or similar (**new**, D-04/UI-SPEC step 3) | component | transform (i18n → JSX, scroll-driven) | `src/components/sections/MethodologySection.tsx` (reused verbatim per UI-SPEC) | exact |
| `src/components/sections/EnjeuxSection.tsx` or similar (**new**, UI-SPEC step 4) | component | transform (i18n → JSX) | `src/components/sections/ReassuranceSection.tsx` (reused verbatim per UI-SPEC) | exact |
| `src/components/sections/PhoneAgent.tsx` | component | transform (i18n → JSX), teaser reduction | itself (in-place trim, D-07/D-08) | exact |
| `src/components/sections/Realisations.tsx` | component | transform (data + i18n → JSX) | itself (in-place bridge-block rewrite, D-10) | exact |
| `src/components/sections/HeroSection.tsx` | component | transform (i18n → JSX) | itself (CTA href/label only) | exact |
| `src/app/calculateur-roi/page.tsx` | route/client-page | transform (client-side arithmetic → JSX) | itself (in-place field/derivation removal, D-01/D-03) | exact |
| `src/app/layout.tsx` | route (server) | request-response (SSR JSON-LD) | itself (delete one field) | exact |
| `src/lib/translations.ts` | config/i18n content | transform (typed content object) | itself (interface + fr/en/th literal edits) | exact |
| `src/lib/translations.test.ts` | test | unit (JSON-string regex) | itself, extend existing `describe` blocks | exact |
| `src/app/layout.test.ts` (**new**) | test | unit (source-string) | `src/data/services.test.ts` (`readFileSync` + `.not.toContain` pattern) | exact |
| `src/app/calculateur-roi/page.test.ts` (**new**) | test | unit (source-string) | `src/data/services.test.ts` (same pattern) | exact |
| `src/app/page.test.ts` (**new**) | test | unit (source-string, CTA href assertions) | `src/data/services.test.ts` (same pattern) | exact |

## Pattern Assignments

### `src/app/page.tsx` (route/composition, request-response)

**Analog:** itself — current file already read in full above (33 lines).

**Current full pattern:**
```typescript
'use client';
import { useReveals } from '@/hooks/useReveals';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';
import Manifeste from '@/components/sections/Manifeste';
import Realisations from '@/components/sections/Realisations';
import PhoneAgent from '@/components/sections/PhoneAgent';
import Partners from '@/components/sections/Partners';
import ContactSection from '@/components/sections/ContactSection';

export default function Home() {
  useReveals();
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <Manifeste />
        <Realisations />
        <PhoneAgent />
        <Partners />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
```

**New composition (per 08-UI-SPEC.md's "Landing Page Composition" table):** insert 3 new imports/children between `Manifeste` and `Realisations`:
```typescript
import ProblemSection from '@/components/sections/ProblemSection';
import ServicesPreview from '@/components/sections/ServicesPreview'; // new file
import FonctionnementSection from '@/components/sections/FonctionnementSection'; // new file, wraps MethodologySection's pattern
import EnjeuxSection from '@/components/sections/EnjeuxSection'; // new file, wraps ReassuranceSection's pattern
// ...
<HeroSection />
<Manifeste />
<ProblemSection />
<ServicesPreview />
<FonctionnementSection />
<EnjeuxSection />
<Realisations />
<PhoneAgent />
<Partners />
<ContactSection />
```
No `useReveals()`/`Navbar`/`Footer` change — the hook is already global and sweeps every `[data-reveal]` element regardless of which sections mount it.

---

### `src/components/sections/ProblemSection.tsx` (component, transform)

**Analog:** itself, full file already reused verbatim per D-04.

**Full current pattern (18-38, reuse 100% of structure):**
```tsx
'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function ProblemSection() {
  const { t } = useLanguage();
  const ts = t.services.problem;   // ← ONLY LINE TO CHANGE: point to t.landing.problems instead

  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{ts.num}</div>
          <h2 className="sec-title">
            {ts.title_l1}<br /><em className="it">{ts.title_l2_it}</em>
          </h2>
          <p className="sec-intro">{ts.intro}</p>
        </div>
        <div className="problem-grid">
          {ts.items.map((it, i) => (
            <div className="problem-card" data-reveal data-reveal-delay={String(i % 4)} key={i}>
              <span className="pn">{it.n}</span>
              <h3>{it.title}</h3>
              <p>{it.desc}</p>
            </div>
          ))}
        </div>
        <div className="problem-good" data-reveal>{ts.good_news}</div>
        {/* NEW per D-06: add a single bottom CTA here — no existing <a> in this file to copy,
            use HeroSection's/Realisations' `.btn.btn-primary` anchor pattern below */}
      </div>
    </section>
  );
}
```

**CTA `<a>` pattern to add (copy shape from `HeroSection.tsx` lines 208-213):**
```tsx
<a className="btn btn-primary" href="/services">
  {tl.hero.cta_primary} <span className="ar">→</span>
</a>
```
→ becomes (D-06): `<a className="btn btn-primary" href="/simulateur">{ts.cta} <span className="ar">→</span></a>`, centered under `.problem-good` (new wrapping `<div>` with center alignment — no existing centered-CTA-under-banner class in this file; `.svc-cta`'s centered button block in `src/app/services/page.tsx` lines 84-88 is the closest full-page analog for "centered button after a text block").

**CSS classes already defined** (`src/app/globals.css`): `.sec` (269), `.sec-head`/`.sec-num` (270-271), `.problem-grid` (440, 2-col desktop / 1-col ≤900px at 449), `.problem-card` (441-445). No new CSS needed for this section besides the CTA button (reuse `.btn`/`.btn-primary`, already global).

---

### `src/components/sections/ServicesPreview.tsx` (NEW component, transform)

**Analog 1 — card-grid-of-links pattern:** `src/app/services/page.tsx` lines 41-74 (the `offers-grid` `.map()` over `services`).
**Analog 2 — simpler numbered-card styling to reuse per UI-SPEC (`.upsell-card`/`.un`):** `src/components/sections/OptionsSection.tsx` (full file, 36 lines).

**Imports pattern** (from `OptionsSection.tsx` lines 1-2, `services/page.tsx` lines 1-9):
```tsx
'use client';
import { useLanguage } from '@/context/LanguageContext';
import { services } from '@/data/services';
```

**Core pattern — combine OptionsSection's shell with services/page.tsx's data-driven `<a>` loop:**
```tsx
// Shell from OptionsSection.tsx (lines 8-18), loop body adapted from services/page.tsx (lines 42-73)
<section className="sec border-t" id="services-preview">
  <div className="wrap">
    <div className="sec-head" data-reveal>
      <div className="sec-num">{ts.num}</div>
      <h2 className="sec-title">{ts.title_l1}<br /><em className="it">{ts.title_l2_it}</em></h2>
      <p className="sec-intro">{ts.intro}</p>
    </div>
    <div className="svc-preview-grid"> {/* NEW CSS rule — see UI-SPEC's grid spec, 3/2/1 col */}
      {services.map((s, i) => {
        const copy = t.services.pages.items[s.index]; // reuse existing price-free tagline, do NOT write new copy
        return (
          <a key={s.slug} href={`/services/${s.slug}`} className="upsell-card" data-reveal data-reveal-delay={String(i % 4)}>
            <div className="un">{String(i + 1).padStart(2, '0')}</div>
            <h4>{copy.name}</h4>
            <p>{copy.tagline}</p>
          </a>
        );
      })}
    </div>
  </div>
</section>
```
**Href-building convention (must copy exactly, tested by `services.test.ts` lines 86-95):** use the template-literal form `` `/services/${s.slug}` `` — never a hardcoded `"/services/site-vitrine"` string; `services.test.ts` asserts `/services page.tsx`'s source contains no literal per-slug string, and the planner should extend an equivalent assertion to this new file.

**CSS:** `.upsell-card`/`.un` already defined (`globals.css` 535-539) — reuse verbatim per UI-SPEC. New `.svc-preview-grid` rule needed (not in `globals.css` yet): pattern to copy is `.upsell-grid`'s responsive breakpoints (`globals.css` 534, 541-542) but at `repeat(3,1fr)` ≥900px / `repeat(2,1fr)` 600-899px / `1fr` <600px per UI-SPEC Section Spec 2.

---

### `src/components/sections/FonctionnementSection.tsx` (NEW component, transform, scroll-driven)

**Analog:** `src/components/sections/MethodologySection.tsx` — reuse **verbatim** per UI-SPEC (structure + CSS), only swap `t.services.method` for a new `t.landing.method` key.

**Full pattern to copy (lines 1-82), single-line content-source change:**
```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLanguage } from '@/context/LanguageContext';

gsap.registerPlugin(ScrollTrigger);

export default function FonctionnementSection() {
  const { t } = useLanguage();
  const ts = t.landing.method;  // ← was t.services.method; NEW key, do not reuse the legacy one (UI-SPEC explicit instruction)
  // ...(rest identical: active-step state, ScrollTrigger effect, .method/.method-rail/.method-steps JSX)
}
```
No CSS changes needed — `.method`, `.method-rail`, `.method-rail-active`, `.method-steps`, `.method-step`, `.ndot`, `.num-big` all already exist (`globals.css` 546-563 and surrounding).

**Note:** `gsap`/`ScrollTrigger` are already project dependencies (used here and nowhere else needs re-verification) — no new install.

---

### `src/components/sections/EnjeuxSection.tsx` (NEW component, transform)

**Analog:** `src/components/sections/ReassuranceSection.tsx` — reuse **verbatim** per UI-SPEC, swap `t.services.reassurance` for new `t.landing.enjeux`.

**Full pattern to copy (lines 1-38), single-line content-source change:**
```tsx
'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function EnjeuxSection() {
  const { t } = useLanguage();
  const ts = t.landing.enjeux;  // ← was t.services.reassurance; NEW key
  return (
    <section className="sec border-t">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{ts.num}</div>
          <h2 className="sec-title">{ts.title_l1}<br /><em className="it">{ts.title_l2_it}</em></h2>
          <p className="sec-intro">{ts.intro}</p>
        </div>
        <div className="reassure-grid">
          {ts.points.map((p, i) => (
            <div className="reassure" key={i} data-reveal data-reveal-delay={String(i % 2)}>
              <span className="rn">{String(i + 1).padStart(2, '0')}</span>
              <div><h4>{p.t}</h4><p>{p.d}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```
CSS unchanged — `.reassure-grid` (571, 2-col ≥900px at 578), `.reassure`/`.rn` already exist.

---

### `src/components/sections/PhoneAgent.tsx` (component, teaser reduction, D-07/D-08)

**Analog:** itself, full file already read (159 lines).

**What to delete entirely:** the `PhoneFlow` function (lines 8-91), its import of `useState`/`useEffect`/`useCallback` if no longer needed, the `onScroll`/`activeStep`/`sectionRef` scroll-listener block (lines 99-117), the `.phone-grid` 2-column wrapper, `pa.features` list rendering (lines 135-139), and 2 of the 3 CTAs (`/demo`, `/services#phone-agent`).

**What survives, reshaped to single column (per UI-SPEC Section Spec 5):**
```tsx
'use client';
import { useLanguage } from '@/context/LanguageContext';

export default function PhoneAgent() {
  const { t } = useLanguage();
  const pa = t.landing.phone;

  return (
    <section className="sec border-t" id="phone">{/* was .phone-section — swap per UI-SPEC spacing note */}
      <div className="wrap" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <span className="phone-badge"><span className="live" />{pa.badge}</span>
        <h2 className="sec-title">
          {pa.title_l1}<br />{pa.title_l2} <em className="it">{pa.title_l3_it}</em>
        </h2>
        <p className="sec-intro">{pa.sub}</p>
        <a href="/services/agent-vocal-ia" className="btn btn-primary">
          {pa.cta_roi} <span className="ar">→</span> {/* cta_roi repurposed as sole CTA label per D-08 */}
        </a>
      </div>
    </section>
  );
}
```
**Auth/guard pattern:** n/a (no auth surface).
**Error handling:** n/a (pure presentational, no async/data fetch).

**Translation interface fields to delete** (from the `landing.phone` block, `src/lib/translations.ts` interface lines 239-253): `features: string[]`, `cta_demo`, `cta_more`, `flow_label`, `flow_rec`, `flow_steps` — and their 3 locale literals (fr ~991-1015, en ~1500-1524-ish, th ~2525-ish, confirm exact ranges at edit time via targeted Grep, do not re-read already-seen ranges). `cta_roi` field/key stays, repurposed.

---

### `src/components/sections/Realisations.tsx` (component, bridge rewrite, D-10)

**Analog:** itself, full file already read (69 lines). Only the trailing `<a className="work-bridge">` block (lines 52-64) changes; `work-list`/`work-item` rendering (lines 20-50) is unchanged (LANDING-03 already satisfied).

**Current bridge block (to replace):**
```tsx
<a href="/services" className="work-bridge" data-reveal>
  <div>
    <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink-faint)' }}>
      —— PROCHAINE ÉTAPE
    </span>
    <h3>Voir toutes nos <em className="it acid">offres &amp; tarifs</em></h3>
    <p>Quatre formules, des prix publics et un devis sous 48h. Vous trouverez probablement ce qu&apos;il vous faut.</p>
  </div>
  <span className="bridge-arrow">→</span>
</a>
```
**New pattern (href + copy change only, same JSX shape, CSS untouched):**
```tsx
<a href="/simulateur" className="work-bridge" data-reveal>
  <div>
    <span className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink-faint)' }}>
      —— PROCHAINE ÉTAPE
    </span>
    <h3>{w.bridge_title_l1} <em className="it acid">{w.bridge_title_it}</em></h3>
    <p>{w.bridge_body}</p>
  </div>
  <span className="bridge-arrow">→</span>
</a>
```
Note: current bridge copy is hardcoded JSX (not routed through `t.landing.work`), breaking the SVC-06 i18n precedent — this phase's edit should move it into new `t.landing.work.bridge_*` fields per the project's established i18n-ownership pattern (see Shared Patterns below), rather than perpetuating the hardcoded-string exception.

---

### `src/components/sections/HeroSection.tsx` (component, CTA repoint, resolves UI-SPEC Section Spec 7)

**Analog:** itself, full file already read (246 lines) — only lines 208-213 change.

**Current:**
```tsx
<div className="hero-ctas" data-reveal data-reveal-delay="3">
  <a className="btn btn-primary" href="/services">
    {tl.hero.cta_primary} <span className="ar">→</span>
  </a>
  <a className="btn btn-ghost" href="#contact">{tl.hero.cta_secondary}</a>
</div>
```
**New (href literal change; `cta_primary` label text updated in translations.ts per Copywriting Contract, e.g. "Lancer le diagnostic"):**
```tsx
<a className="btn btn-primary" href="/simulateur">
  {tl.hero.cta_primary} <span className="ar">→</span>
</a>
<a className="btn btn-ghost" href="#contact">{tl.hero.cta_secondary}</a> {/* unchanged, already compliant */}
```

---

### `src/app/calculateur-roi/page.tsx` (route/client-page, D-01/D-02/D-03)

**Analog:** itself, full file already read (317 lines). This is a dependency-ordered deletion, not a rewrite from a different analog.

**Removal list (exact, in dependency order per RESEARCH.md Pitfall #2):**
1. `DEFAULTS.prixMensuel` (line 22), `DEFAULTS.setup` (line 23)
2. Derived consts (lines 102-104, 107): `gainNetSocle`, `ratioSocle`, `amortissementMois`, `ratioTotal` (keep `beneficeTotal` — line 106, feeds Carte 3)
3. `amortLabel`/`amortNeg` block (lines 110-119)
4. Two `ControlRow`s inside `<details className="roi-adv">` (lines 234-251: "Prix mensuel de la solution", "Setup one-shot") — keep `joursMois` and `facteurInterruption` `ControlRow`s (D-03)
5. Entire "Carte 2 — Principale (SOCLE seul)" JSX block (lines 279-288)
6. In Carte 3 (kept, lines 290-302), replace the `ratioTotal`/`fmtMult` closing line (line 298-300) with an absolute-value phrasing using `beneficeTotal` per UI-SPEC Copywriting Contract: `"Bénéfice total récupéré : {fmtEur(beneficeTotal)}/mois (capacité + CA additionnel)"`.
7. Carte 1 (lines 267-277, "Capacité opérationnelle récupérée") is promoted to `.roi-card-main` styling per UI-SPEC Section Spec 8 — apply the `roi-card roi-card-main` className combo (currently on the deleted Carte 2) to this card instead of plain `roi-card`.

**Verification pattern to let drive cleanup:** run `tsc`/`next build` after step 1 and let compiler errors enumerate every dangling reference — do not grep only for `prixMensuel`/`setup` literal names (RESEARCH.md Pitfall #2 warning).

**No auth/error-handling patterns apply** (100% client-side arithmetic, no fetch).

---

### `src/app/layout.tsx` (server route, D-09)

**Analog:** itself — single-field deletion, no structural analog needed.

**Current (lines 160-172, ProfessionalService JSON-LD block):**
```typescript
areaServed: {
  "@type": "GeoCircle",
  geoMidpoint: { "@type": "GeoCoordinates", latitude: 47.3941, longitude: 0.6848 },
  geoRadius: "50000",
},
priceRange: "€€",        // ← DELETE this line entirely (D-09)
openingHours: "Mo-Fr 09:00-18:00",
```

---

### `src/lib/translations.ts` (i18n content config)

**Analog:** existing `t.services.problem`/`t.services.method`/`t.services.reassurance`/`t.services.pages.items[i].tagline` shapes (all already read above) are the direct templates for the 3 new `t.landing.*` keys.

**Interface additions needed** (mirrors `services.problem`/`.method`/`.reassurance` interface shapes at lines 110-117, 178-191, adapted into the `landing` block, currently lines 204-284):
```typescript
landing: {
  // ...existing hero/manifeste/work/phone/partners/contact/footer...
  problems: {
    num: string;
    title_l1: string; title_l2_it: string;
    intro: string;
    items: { n: string; title: string; desc: string }[];
    good_news: string;
    cta: string;
  };
  method: {
    num: string;
    title_l1: string; title_l2_it: string;
    intro: string;
    steps: { n: string; t: string; d: string }[];
  };
  enjeux: {
    num: string;
    title_l1: string; title_l2_it: string;
    intro: string;
    points: { t: string; d: string }[];
  };
  work: {
    // ...existing num/title_l1/title_l2_it/intro/items...
    bridge_title_l1: string; bridge_title_it: string; bridge_body: string; // NEW, D-10
  };
}
```
**Fields to remove from `phone` interface (lines 239-253):** `features`, `cta_demo`, `cta_more`, `flow_label`, `flow_rec`, `flow_steps`. Keep `num`, `badge`, `title_l1`, `title_l2`, `title_l3_it`, `sub`, `cta_roi`.

**Literal object edits required in all 3 locale blocks** (fr ~287-1059, en ~1061-1717, th ~1718-2484 — confirmed ranges from the initial grep sweep; re-grep at edit time for th if precision needed, do not re-read fr/en ranges already shown above): add `landing.problems`/`landing.method`/`landing.enjeux`/`landing.work.bridge_*`, trim `landing.phone`, per-locale.

**Existing analog literal shape to copy verbatim as a starting template (fr `services.method`, lines 780-793) — adapt content only, not structure:**
```typescript
method: {
  num: "07 / 09",
  title_l1: "Comment", title_l2_it: "ça se passe.",
  intro: "...",
  steps: [ { n: "01", t: "...", d: "..." }, /* 3-4 for landing per UI-SPEC */ ],
},
```

---

## Shared Patterns

### i18n content ownership (SVC-06 precedent, applies to ALL new/edited copy)
**Source:** `src/lib/translations.ts` interface block + `useLanguage()` hook (`src/context/LanguageContext`, consumed identically in every section file above: `const { t } = useLanguage();`).
**Apply to:** every new component (`ServicesPreview.tsx`, `FonctionnementSection.tsx`, `EnjeuxSection.tsx`) and every content edit (`ProblemSection.tsx`, `PhoneAgent.tsx`, `Realisations.tsx`, `HeroSection.tsx`).
**Rule:** never hardcode new copy directly in JSX (the existing `Realisations.tsx` bridge block is the one pre-existing violation of this rule in scope — fix it, don't replicate it, per its Pattern Assignment note above).

### Scroll-reveal (`useReveals`)
**Source:** `src/hooks/useReveals.ts`, mounted once in `page.tsx` (`useReveals()` call, line 16).
**Apply to:** every new section — wrap section head and card-grid items with `data-reveal` / `data-reveal-delay={String(i % N)}` exactly as every existing section does (`ProblemSection.tsx` line 11, 23-24; `MethodologySection.tsx` line 51, 66; `ReassuranceSection.tsx` line 11, 24-25). No new hook registration needed — it's already global via the IntersectionObserver + MutationObserver sweep.

### `.sec`/`.sec-head`/`.wrap` shell (spacing/structure)
**Source:** `src/app/globals.css` lines 269-271 (desktop), 388-389 (mobile ≤900px).
**Apply to:** every new landing section (Problems, ServicesPreview, Fonctionnement, Enjeux) — per UI-SPEC's explicit instruction, do not invent custom section padding; the one exception is `PhoneAgent.tsx`'s teaser, which UI-SPEC explicitly directs to swap `.phone-section`'s 160px padding for the standard `.sec` shell.

### No-price-language regression guard (PRIX-01/PRIX-02, extend don't reinvent)
**Source:** `src/lib/translations.test.ts` lines 8-17 (`PRICE_PATTERN`/`SIMU_PRICE_PATTERN` regex constants) + `describe('translations.services.pages...')` block's `JSON.stringify(...).not.toMatch(PRICE_PATTERN)` pattern (line 99-104).
**Apply to:** new Vitest assertions the planner should add:
```typescript
// Extend src/lib/translations.test.ts with a new describe block:
it('PRIX-01: no pricing language appears anywhere in t.landing, for any locale', () => {
  for (const lang of LANGS) {
    expect(JSON.stringify(translations[lang].landing)).not.toMatch(PRICE_PATTERN);
  }
});
```
**Source:** `src/data/services.test.ts` lines 1-9, 96-107 (`readFileSync` + `.not.toContain(token)` source-string audit pattern).
**Apply to:** 3 new test files:
```typescript
// src/app/layout.test.ts (new)
const layoutSource = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
it('PRIX-01: no priceRange field in global JSON-LD', () => {
  expect(layoutSource).not.toContain('priceRange');
});

// src/app/calculateur-roi/page.test.ts (new)
const roiSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
it('PRIX-02: no price token in calculateur-roi page source', () => {
  for (const token of ['€', 'prixMensuel', 'Prix mensuel', 'coûte']) {
    expect(roiSource).not.toContain(token);
  }
});

// src/app/page.test.ts (new) — LANDING-02 CTA-destination guard
const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
// plus per-component source reads for HeroSection.tsx / ProblemSection.tsx / Realisations.tsx / PhoneAgent.tsx
// assert each href against the CTA Destination Table classes (A/B/C) — see 08-UI-SPEC.md
```

## No Analog Found

None — every file in scope has a direct, exact, or role-matched in-repo analog (this is a closed-corpus refactor per RESEARCH.md; no new libraries, no new architectural pattern).

## Metadata

**Analog search scope:** `src/app/`, `src/components/sections/`, `src/components/layout/`, `src/lib/translations.ts` + `.test.ts`, `src/data/`, `src/app/globals.css` (targeted grep only).
**Files scanned:** `page.tsx`, `layout.tsx`, `calculateur-roi/page.tsx`, `services/page.tsx`, `ProblemSection.tsx`, `MethodologySection.tsx`, `ReassuranceSection.tsx`, `OptionsSection.tsx`, `PhoneAgent.tsx`, `Realisations.tsx`, `HeroSection.tsx`, `translations.ts` (interface + fr landing/services blocks), `translations.test.ts`, `services.test.ts`, `services.ts`, `globals.css` (grep only).
**Pattern extraction date:** 2026-09-21
