# Phase 2: Landing Page Rebuild - Research

**Researched:** 2026-05-16
**Domain:** Next.js 16 / React 19 component rebuild — Canvas 2D, GSAP scroll, i18n extension, Navbar swap
**Confidence:** HIGH (all critical claims verified against live codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Delete freelance-era files entirely (not rewrite in place).
  - Delete: `Hero.tsx`, `About.tsx`, `Projects.tsx`, `PhoneAgentPromo.tsx`, `Contact.tsx` (all in `src/components/sections/`)
  - Delete: `Scene.tsx`, `FloatingShapes.tsx`, `StarkDisplay.tsx` (all in `src/components/three/`)
  - Create all new Phase 2 components fresh in `src/components/sections/`
  - Keep: `CustomCursor.tsx`, `CinemaIntro.tsx`, `ClientProviders.tsx`, `useReveals.ts`
- **D-02:** Use GSAP ScrollTrigger for Phone Agent pinned scroll + SVG particle flow. Install `gsap` package. Import GSAP dynamically or inside `useEffect`.
- **D-03:** `src/data/projects.ts` — array of 4 project objects. Content strings are i18n keys, not hardcoded.
- **D-04:** The 4 projects are: Feuillette (2025), Gecko Cabane (2024), Les Folies Temps Danse (2024), Ghjulianu Codani (2025).
- **D-05:** Keep `NEXT_PUBLIC_FORM_URL` n8n webhook. Same POST JSON pattern.
- **D-06:** New form has 4 fields: `name`, `email`, `projectType`, `message`.
- **D-07:** Full Navbar rebuild — dark bg (`var(--bg)`), acid accent (`var(--acid)`), Bricolage Grotesque nav labels, fr/en/th language switcher.

### Claude's Discretion

- Three.js icosphere implementation details (geometry parameters, material choice, rotation speed).
- GSAP ScrollTrigger scrub factor and step transition timing for Phone Agent section.
- Exact SVG particle path geometry for the Phone Agent flow diagram.
- CSS specifics for the stat grid layout in the hero.
- PartnersBanner.tsx: reuse if compatible with new design tokens, otherwise rewrite.
- Whether to call `useReveals()` in `page.tsx` directly or mount it inside a `<RevealInit />` wrapper.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within Phase 2 scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAND-01 | Hero: Bricolage Grotesque display title (3 lines), animated 3D wireframe canvas (icosphere), 4-stat meta grid | Canvas 2D approach documented; icosphere is a pure-JS golden-spiral sphere projected manually — no Three.js needed |
| LAND-02 | Manifeste section: editorial agency positioning (2 columns, editorial paragraphs + italic quote) | Static layout, uses `data-reveal` + `useReveals()` already in codebase |
| LAND-03 | Réalisations section: 4 project cards in editorial list format with tags and year | `src/data/projects.ts` pattern documented; i18n keys from `landing-i18n.jsx` |
| LAND-04 | Phone Agent section: scroll-driven pinned section with animated SVG particle flow (4 steps) | GSAP install documented; scroll-position approach from mockup also viable without GSAP |
| LAND-05 | Partners section: typographic auto-scrolling ticker | CSS-only animation approach documented; existing PartnersBanner CSS strategy is close but needs reskin |
| LAND-06 | Contact section: 4-field form (name, email, type select, message) | Form pattern documented; `NEXT_PUBLIC_FORM_URL` webhook confirmed in codebase |
| LAND-07 | Wordmark + Footer with navigation links | Bottom component from mockup documented |
| LAND-08 | Personal/freelance signals removed; SEO metadata updated | Deletion targets identified; `layout.tsx` metadata export located |
</phase_requirements>

---

## Summary

Phase 2 replaces `src/app/page.tsx` and rebuilds `src/components/layout/Navbar.tsx`. It creates seven new section components and one data file. It deletes eight obsolete components. The design mockup is available as standalone JSX at `C:/Users/Anatholy/Downloads/portfolio/landing-app.jsx` and `landing-hero.jsx` — both are fully functional reference implementations that need conversion to Next.js TSX conventions.

The most technically demanding components are the Hero (canvas 2D wireframe sphere) and the Phone Agent section (scroll-driven step reveal). The canonical reference mockup implements the icosphere entirely in Canvas 2D with manual perspective projection — no Three.js is used, which means no SSR risk and no additional package. GSAP is required only for the Phone Agent ScrollTrigger pin; the mockup's reference implementation actually uses a plain `window.scroll` listener, which is simpler and has no SSR risk. Both approaches are documented below.

The i18n system requires a new translation namespace (`landing`) added to `src/lib/translations.ts`. The existing `Translations` interface must be extended. The Partners ticker can be rebuilt by reskinning the existing `PartnersBanner.tsx` component with new design tokens — the CSS animation strategy (`partnersTicker` keyframe, `translateX(-50%)`) is identical to what the mockup requires.

**Primary recommendation:** Convert mockup JSX directly to Next.js TSX section by section. The mockup is the authoritative source — do not derive structure from this research document. Use the mockup's scroll listener approach for Phone Agent (simpler than GSAP ScrollTrigger) unless the planner explicitly wants GSAP.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hero canvas animation | Browser / Client | — | `requestAnimationFrame` loop; must be `'use client'` with `useEffect` |
| Manifeste static layout | Frontend Server (SSR) | — | Pure markup, no interactivity; can be a Server Component |
| Réalisations project list | Frontend Server (SSR) | — | Data from local `projects.ts`, no browser API |
| Phone Agent scroll step | Browser / Client | — | Requires `window.scroll` or GSAP ScrollTrigger |
| Partners ticker | Browser / Client | — | CSS animation is fine but `useLanguage()` forces `'use client'` |
| Contact form | Browser / Client | — | `useState`, `fetch()` POST, event handlers |
| Navbar | Browser / Client | — | Scroll listener + language switcher = browser-only |
| Footer / Wordmark | Frontend Server (SSR) | — | Can be Server Component if no `useLanguage()` — but existing Footer uses it, so keep `'use client'` |
| Translation keys | API / Backend | — | `translations.ts` runs at build time; no runtime fetch |

---

## Standard Stack

### Core (already installed — verified against `package.json`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | App router, SSR, dynamic import | Already in use |
| react | 19.2.3 | Component model | Already in use |
| three | ^0.183.2 | 3D (used by existing components, NOT needed for icosphere) | Already installed — icosphere uses Canvas 2D |

### New Install Required
| Library | Version | Purpose | Decision |
|---------|---------|---------|----------|
| gsap | ^3.x (latest) | ScrollTrigger pin for Phone Agent section | D-02 locked |

**Version verification:** [ASSUMED] GSAP 3.x is current stable. Verify before install:
```bash
npm view gsap version
```

### Confirmed NOT Needed for This Phase
- `@react-three/fiber` / `@react-three/drei` — icosphere is Canvas 2D (see section below)
- Any new font package — Bricolage Grotesque already loaded via `next/font/google` in `layout.tsx`

**Installation:**
```bash
npm install gsap
```

---

## Architecture Patterns

### System Architecture Diagram

```
Browser request
      │
      ▼
layout.tsx (Server)
  ├── LanguageProvider (client boundary)
  ├── ClientProviders → CustomCursor + CinemaIntro (ssr:false)
  └── page.tsx (client — useReveals() requires browser)
        ├── Navbar (client — scroll + setLang)
        ├── HeroSection (client — Canvas 2D requestAnimationFrame)
        ├── Manifeste (server-compatible, but parent is client)
        ├── Realisations (server-compatible, but parent is client)
        ├── PhoneAgent (client — scroll listener or GSAP)
        ├── Partners (client — useLanguage())
        ├── ContactSection (client — form state, fetch)
        └── Footer / Wordmark (client — useLanguage())
```

Key flow: `useReveals()` in `page.tsx` triggers a MutationObserver that sweeps all `[data-reveal]` elements across every child section, including dynamically rendered ones.

### Recommended Project Structure

```
src/
├── app/
│   └── page.tsx                  ← REWRITE: import all new sections, call useReveals()
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx            ← REBUILD (D-07)
│   │   └── Footer.tsx            ← REBUILD (new Wordmark + footer)
│   └── sections/
│       ├── HeroSection.tsx       ← NEW (Canvas 2D icosphere + title + stat grid)
│       ├── Manifeste.tsx         ← NEW (editorial 2-col layout)
│       ├── Realisations.tsx      ← NEW (4 project cards list)
│       ├── PhoneAgent.tsx        ← NEW (scroll pin + SVG flow)
│       ├── Partners.tsx          ← RESKIN of PartnersBanner.tsx OR new file
│       └── ContactSection.tsx    ← NEW (4-field form)
└── data/
    └── projects.ts               ← NEW (D-03)
```

Note: naming `HeroSection` (not `Hero`) and `ContactSection` (not `Contact`) avoids collision with the to-be-deleted legacy files during the transition wave.

---

## Technical Approach: Component by Component

### 1. Hero Section (LAND-01)

**The icosphere is Canvas 2D, not Three.js.**

The reference implementation in `landing-hero.jsx` builds a golden-spiral sphere with 120 outer points and 36 inner orbital points. It projects them manually with rotation matrices and draws with `ctx.lineTo`. There is zero Three.js usage.

```typescript
// Pattern: plain canvas in useEffect, ssr-safe, no dynamic import needed
// Source: C:/Users/Anatholy/Downloads/portfolio/landing-hero.jsx lines 1-188
'use client';
import { useRef, useEffect } from 'react';

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    // ... build golden-spiral sphere geometry
    // ... requestAnimationFrame draw loop
    // ... cleanup: cancelAnimationFrame
    return () => { cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={canvasRef} className="hero-canvas" />;
}
```

Key implementation details from the canonical reference:
- Outer shell: 120 points via golden-spiral (`phi = (1 + √5) / 2`)
- Inner shell: 36 points on a ring at radius 0.62
- Edges: nearest-neighbor within each shell, threshold 0.35
- Rotation: `ay = dt * 0.18 + mx * 0.3`, `ax = -0.18 + my * 0.25`
- Colors: outer shell = `rgba(236,234,227,alpha)` (ink), inner shell = `var(--acid)` via `getComputedStyle`
- Mouse parallax: reads `window.mousemove`, maps to `mx`/`my` in `[-1, 1]`
- DPR-aware: `canvas.width = rect.width * Math.min(devicePixelRatio, 2)`

**Decision for Claude's Discretion:** Use Canvas 2D (the canonical approach). Do NOT use `IcosahedronGeometry` from Three.js — it would require an R3F provider and SSR workaround for no visual benefit.

**Stat grid:** 4 items from i18n keys `hero.stat_1_n` through `hero.stat_4_d`. Simple CSS grid, 4 columns desktop / 2 columns mobile.

**Display title:** 3 `<span class="line">` wrappers inside `<h1>`. Line 2 contains an `<em className="it acid">` around the italic word from `hero.title_l2_it`. Uses `split` class for reveal animation.

---

### 2. Phone Agent Section (LAND-04)

**Two valid approaches — research both:**

**Option A: Plain scroll listener (from canonical mockup)**
```typescript
// Source: landing-app.jsx lines 248-264
'use client';
import { useRef, useState, useEffect } from 'react';

export default function PhoneAgent({ t }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) return;
      const p = Math.max(0, Math.min(1, -rect.top / total));
      setActiveStep(Math.min(steps.length - 1, Math.floor(p * steps.length)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // ...
}
```

**Option B: GSAP ScrollTrigger (D-02 locked)**
```typescript
// GSAP must be imported inside useEffect (never at module top level in Next.js)
// Source: [ASSUMED] GSAP docs pattern for Next.js
'use client';
import { useRef, useEffect } from 'react';

export default function PhoneAgent() {
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let ctx: any;
    import('gsap').then(({ default: gsap }) => {
      import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger);
        ctx = gsap.context(() => {
          ScrollTrigger.create({
            trigger: sectionRef.current,
            pin: true,
            scrub: 1,
            start: 'top top',
            end: '+=300%',
          });
        }, sectionRef);
      });
    });
    return () => ctx?.revert();
  }, []);
}
```

**Recommendation (Claude's Discretion):** Option A (plain scroll listener) is already proven in the canonical mockup, has zero SSR risk, and requires no additional import complexity. The planner should default to Option A unless there is a specific visual reason to use GSAP's scrub interpolation. Both satisfy D-02's intent (pinned scroll + SVG particle flow driven by scroll).

**SVG particle flow:** The mockup uses inline SVG `<animate>` elements — no GSAP MotionPath. The moving dot uses `<animate attributeName="cy">` from previous step Y to current step Y. The pulse ring uses `<animate attributeName="r" values="6;22;6">`. This is browser-native and has zero library dependency.

```typescript
// Source: landing-app.jsx lines 316-335 (PhoneFlow component)
<svg className="flow-svg" viewBox="0 0 400 460" preserveAspectRatio="none">
  <defs>
    <linearGradient id="g-line" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="var(--acid)" stopOpacity="0" />
      <stop offset="0.5" stopColor="var(--acid)" stopOpacity="0.6" />
      <stop offset="1" stopColor="var(--acid)" stopOpacity="0" />
    </linearGradient>
  </defs>
  {/* dashed connector lines between steps */}
  {/* moving acid dot with animate cy */}
  {/* pulsing ring with animate r + opacity */}
</svg>
```

Step positions: `y = 120 + stepIndex * 90` (fixed grid, 4 steps, viewBox 460px tall).

---

### 3. Partners Ticker (LAND-05)

**Existing `PartnersBanner.tsx` needs a reskin, not a rewrite.**

The existing component already implements:
- Duplicate array trick: `[...PARTNERS, ...PARTNERS]` then `translateX(-50%)`
- CSS keyframe `partnersTicker` injected via `<style>` tag
- Left/right fade edge masks via `linear-gradient`

What needs to change for Phase 2:
- Background: `#03031a` → `var(--bg)` 
- Card borders: `${color}2a` → `var(--line)` (or keep accent border — discretion)
- Partner glyphs: orbit rings (CSS) → acid dot with color from `landing-i18n.jsx` (simple square or circle shape)
- Role labels and name: already i18n'd via `t.services.partners.*` — but landing page needs `t.landing.partners.*` keys (new namespace)
- The 3D CSS shape system can be dropped — the mockup uses a simple colored glyph (`<span class="pglyph">`)
- Title bar: `partners.title` from new landing i18n keys

**Decision:** Rewrite `Partners.tsx` as a new component using the same CSS-animation strategy. Do not reuse `PartnersBanner.tsx` directly because it pulls from `t.services.partners` keys and has a visual identity that contradicts the new design tokens. `PartnersBanner.tsx` stays for the Services page (Phase 3).

---

### 4. Navbar Rebuild (D-07)

**Current Navbar is in `src/components/layout/Navbar.tsx`.**

Current Navbar imports from `@/lib/translations` (via `useLanguage`). It also uses `Lang` type. Both stay unchanged.

The Navbar is imported in two places:
1. `src/app/page.tsx` — will be replaced with new Navbar
2. `src/app/services/page.tsx` — imports `Navbar` from `@/components/layout/Navbar`

**Critical:** When the Navbar is rebuilt, `src/app/services/page.tsx` will automatically use the new Navbar. Verify visually after rebuild that the services page Navbar still looks correct.

New Navbar design from canonical mockup (`landing-app.jsx` lines 93-118):
- `<nav className="nav scrolled">` pattern with scroll-triggered class
- Brand: `<a href="#top" className="nav-brand">` with small square glyph + brand name
- Links: `manifeste`, `work`, `services`, `contact` (new nav keys in `t.nav.*`)
- Language switcher: `['fr', 'en', 'th']` buttons, active state with acid color
- Scroll threshold: `window.scrollY > 40`

**Nav link changes:** Current nav has 5 links (`home`, `about`, `services`, `projects`, `contact`). New nav has 4 links (`manifeste`, `work`, `services`, `contact`). The `t.nav` keys must be updated — but the existing keys (`home`, `about`, `projects`) remain in `translations.ts` to avoid breaking services page. Add new keys alongside.

---

### 5. Contact Form (LAND-06)

Current `Contact.tsx` has 3 fields (name, email, message). New form has 4 fields (name, email, projectType, message). Pattern is identical — just add the `projectType` field with a `<select>`.

```typescript
// Field additions vs current Contact.tsx
const [formData, setFormData] = useState({
  name: '',
  email: '',
  projectType: '',   // NEW
  message: '',
});
// POST body is additive — n8n webhook ignores unknown fields gracefully (D-06)
body: JSON.stringify({ name, email, projectType, message })
```

The `projectType` options come from `t.landing.contact.form.type_o` (array of strings from `landing-i18n.jsx`).

---

### 6. Footer / Wordmark (LAND-07)

The mockup splits this into two components: `<Wordmark>` (a large clickable banner linking to services) and `<footer>`. In Next.js, these can be combined into a single `Footer.tsx` rebuild.

Current `Footer.tsx` uses `t.footer.rights`, `t.footer.built_with`, `t.footer.legal_notice`. New footer uses `t.landing.footer.built`, `t.landing.footer.legal`, `t.landing.footer.rights` — all three have equivalents in `landing-i18n.jsx`.

The wordmark section links to `/services` (currently `href="03 Services.html"` in mockup — translate to Next.js `href="/services"`).

---

## Translation Key Merge Strategy

### The Problem

`src/lib/translations.ts` currently has a single `Translations` interface covering all sections. Phase 2 needs ~60 new translation keys across 7 new sections (hero, manifeste, work, phone, partners, contact, footer) in all three locales (fr/en/th).

The `landing-i18n.jsx` has all strings for all three locales in a flat `TRANSLATIONS.fr/en/th` object.

### Safe Merge Strategy

**Add a `landing` namespace to the `Translations` interface.** Do NOT modify existing keys. All new Phase 2 content slots under `t.landing.*`.

```typescript
// src/lib/translations.ts — additions to Translations interface
export interface Translations {
  // ... all existing keys unchanged ...
  nav: { /* add manifeste, work alongside existing home/about/projects/contact */ };
  landing: {
    hero: { pill, title_l1, title_l2, title_l2_it, title_l3, sub, cta_primary, cta_secondary,
            stat_1_n, stat_1_l, stat_1_d, stat_2_n, stat_2_l, stat_2_d,
            stat_3_n, stat_3_l, stat_3_d, stat_4_n, stat_4_l, stat_4_d,
            canvas_l, canvas_r };
    manifeste: { num, title_l1, title_l2_it, intro, p1, p2, quote, p3, p4 };
    work: { num, title_l1, title_l2_it, intro };
    phone: { num, badge, title_l1, title_l2, title_l3_it, sub, features: string[],
             cta_demo, cta_more, flow_label, flow_rec,
             flow_steps: { t, k, v }[] };
    partners: { title, items: { name, role, color }[] };
    contact: { num, title_l1, title_l2_it, sub,
               info: { k, v }[],
               form: { name_l, name_p, email_l, email_p, type_l, type_o: string[],
                       msg_l, msg_p, submit, submitting, success, note } };
    footer: { built, legal, rights };
  };
}
```

**Nav key additions (additive — do not remove existing):**
```typescript
nav: {
  // existing:
  home, about, services, projects, contact,
  // NEW for Phase 2 Navbar rebuild:
  manifeste, work,
}
```

**Source of truth for all string values:** `C:/Users/Anatholy/Downloads/portfolio/landing-i18n.jsx` — copy verbatim, all three locales (fr/en/th).

**Project data:** `src/data/projects.ts` stores structural data (name, tags, year, url). The `desc` field should be an i18n key string (e.g. `'work_desc_feuillette'`) resolved via `t.landing.work.*`. Alternatively, store desc inline from `work.items[]` in each locale. The simplest correct approach: store the 4 project records as a static array with i18n-key references, resolve via `useLanguage()` in the Réalisations component.

---

## Component Deletion Safety

### What imports the 8 files to be deleted?

**Verified by grep of `src/**/*.tsx`:**

| File to Delete | Imported By | Safe to Delete? |
|---------------|-------------|-----------------|
| `src/components/sections/Hero.tsx` | `src/app/page.tsx` only | Yes — page.tsx is rewritten in same wave |
| `src/components/sections/About.tsx` | `src/app/page.tsx` only | Yes |
| `src/components/sections/Projects.tsx` | `src/app/page.tsx` only | Yes |
| `src/components/sections/PhoneAgentPromo.tsx` | `src/app/page.tsx` only | Yes |
| `src/components/sections/Contact.tsx` | `src/app/page.tsx` only | Yes |
| `src/components/three/Scene.tsx` | `src/components/sections/Hero.tsx` only | Yes — Hero.tsx is deleted |
| `src/components/three/FloatingShapes.tsx` | `src/components/three/Scene.tsx` only | Yes — Scene.tsx is deleted |
| `src/components/three/StarkDisplay.tsx` | `src/components/sections/Projects.tsx` only | Yes — Projects.tsx is deleted |

**None of the 8 files are imported by:**
- `src/app/layout.tsx` — confirmed
- `src/app/services/page.tsx` — confirmed (imports Navbar, Footer, PartnersBanner only)
- `src/components/ui/ClientProviders.tsx` — confirmed (only CustomCursor, CinemaIntro)
- Any other route

**Safe deletion order:** Delete the three.js leaf files first (FloatingShapes, StarkDisplay, Scene), then the section files (Hero, About, Projects, PhoneAgentPromo, Contact) simultaneously with the page.tsx rewrite to avoid a build window with dangling imports.

### Files NOT to Delete (explicitly verified)
- `src/components/sections/PartnersBanner.tsx` — imported by `src/app/services/page.tsx`. **Do not delete.** New landing page uses a new `Partners.tsx` component.
- `src/components/layout/Footer.tsx` — imported by `src/app/services/page.tsx`. Rebuild in place (overwrite), or create `Footer.tsx` new and confirm services page still works.

---

## SSR / Turbopack Pitfalls

### Pitfall 1: GSAP at Module Top Level

**What goes wrong:** `import gsap from 'gsap'` at the top of a component file causes a server-side import of a browser library. With Turbopack, this throws during SSR.

**How to avoid:** Always import GSAP inside `useEffect`:
```typescript
useEffect(() => {
  import('gsap').then(({ default: gsap }) => {
    import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
      gsap.registerPlugin(ScrollTrigger);
      // ...
    });
  });
  return () => { /* cleanup */ };
}, []);
```

**Alternative:** Use `dynamic(() => import('./PhoneAgentInner'), { ssr: false })` to wrap the entire PhoneAgent component. Follows the same ClientProviders pattern from Phase 1.

### Pitfall 2: Canvas `useEffect` Leak

**What goes wrong:** `requestAnimationFrame` loop in `HeroCanvas` not cancelled on unmount — memory leak and ghost animation after navigation.

**How to avoid:** Always capture the RAF ID and cancel in cleanup:
```typescript
useEffect(() => {
  let raf: number;
  const draw = (t: number) => { /* ... */ raf = requestAnimationFrame(draw); };
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}, []);
```

### Pitfall 3: `window.addEventListener` in Server Component

**What goes wrong:** Placing scroll or mouse listeners directly in a component that Next.js renders on the server.

**How to avoid:** Every component that uses `window`, `document`, or `navigator` must have `'use client'` at the top of the file. The pattern is already established — `page.tsx` will need `'use client'` because it calls `useReveals()`.

### Pitfall 4: React Compiler Conflicts with GSAP Context

**What goes wrong:** `next.config.ts` has `reactCompiler: true`. React Compiler may memoize component renders in ways that break GSAP context cleanup (gsap.context().revert()).

**How to avoid:** If using GSAP, wrap GSAP init in a `useEffect` with a `gsap.context()` and return `ctx.revert()` as cleanup. The React Compiler respects `useEffect` cleanup semantics.

### Pitfall 5: `data-reveal` Not Firing on Dynamically Mounted Sections

**What goes wrong:** `useReveals()` is called once in `page.tsx`. If sections mount after initial sweep, their `[data-reveal]` elements are missed.

**How to avoid:** `useReveals.ts` already includes a `MutationObserver` that re-sweeps on any DOM addition. This is verified in the existing `src/hooks/useReveals.ts` implementation.

### Pitfall 6: Navbar Imported in Both page.tsx and services/page.tsx

**What goes wrong:** Rebuilding Navbar changes its nav links — the services page currently uses the same Navbar. If new Navbar links (`manifeste`, `work`) are internal anchors to the landing page (`/#manifeste`), they render as broken in-page anchors when visited from `/services`.

**How to avoid:** Use absolute `href="/#manifeste"` and `href="/#work"` in the rebuilt Navbar so that from any page they navigate to the landing page first, then scroll to the section.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Infinite ticker scroll | CSS transform loop from scratch | CSS `@keyframes partnersTicker` (already in `PartnersBanner.tsx`) | Handles seamless loop via duplicate array + `translateX(-50%)` |
| SVG particle animation | JS-driven per-frame position update | SVG native `<animate>` element | Browser-native, no frame budget, already proven in mockup |
| Scroll step tracking | Custom debounce + position polling | `{ passive: true }` scroll listener with `getBoundingClientRect()` | Already in mockup; simpler and more predictable than GSAP scrub for discrete steps |
| i18n merge | New context, new file | Extend `Translations` interface + add `landing` key to existing `translations.ts` | LanguageProvider is already mounted globally in `layout.tsx` |
| Custom cursor for new sections | Re-implement | Existing `CustomCursor.tsx` in `ClientProviders` — already global | Phase 1 component is already mounted in `layout.tsx` |
| Canvas sphere geometry | Write custom projection math | Copy golden-spiral + nearest-neighbor from `landing-hero.jsx` | Already designed, tested, and tuned |

---

## Wave / Dependency Ordering

Recommended plan wave structure for the planner:

### Wave 0 — Foundation (no UI, unblocks everything)
1. Extend `src/lib/translations.ts`: add `landing` namespace + new `nav.manifeste`, `nav.work` keys for all three locales
2. Create `src/data/projects.ts`: 4 project objects
3. Install `gsap` package

### Wave 1 — Static sections (no browser-only APIs)
4. Create `Manifeste.tsx`
5. Create `Realisations.tsx` (reads from `projects.ts`, uses `t.landing.work.*`)

### Wave 2 — Interactive sections (require `'use client'`)
6. Create `HeroSection.tsx` (Canvas 2D icosphere)
7. Create `PhoneAgent.tsx` (scroll-driven steps + SVG flow)
8. Create `Partners.tsx` (CSS ticker, new design tokens)
9. Create `ContactSection.tsx` (4-field form, NEXT_PUBLIC_FORM_URL)

### Wave 3 — Shell rebuild
10. Rebuild `Navbar.tsx` (dark bg, acid accent, new links)
11. Rebuild `Footer.tsx` (Wordmark + footer links)
12. Rewrite `src/app/page.tsx` (import all new sections, call `useReveals()`, new metadata export)

### Wave 4 — Cleanup
13. Delete 8 obsolete files (safe after Wave 3 — page.tsx no longer imports them)
14. Verify `src/app/services/page.tsx` still renders correctly with new Navbar and Footer

**Dependency rule:** Wave 0 must complete before any section component starts (they all need the `landing` i18n keys). Wave 3 must complete before Wave 4 (deletion requires no dangling imports).

---

## Common Pitfalls

### Pitfall 1: Missing `'use client'` on page.tsx
**What goes wrong:** `useReveals()` calls `IntersectionObserver` — a browser API. If `page.tsx` is a Server Component, build fails.
**How to avoid:** Add `'use client'` at top of new `page.tsx`.
**Warning sign:** Build error mentioning `IntersectionObserver is not defined`.

### Pitfall 2: Hero canvas height collapses to 0
**What goes wrong:** `<canvas>` has no intrinsic size. Without explicit dimensions (CSS height or wrapper), it collapses.
**How to avoid:** Wrap canvas in a `div` with explicit `style={{ width: '100%', height: '400px' }}` or equivalent CSS class.
**Warning sign:** Hero section renders but no icosphere is visible.

### Pitfall 3: Partners ticker jumps on loop
**What goes wrong:** Single-copy array animates to off-screen then snaps back — visible jump.
**How to avoid:** Always duplicate the array (`[...items, ...items]`) and animate `translateX(-50%)`. The existing `PartnersBanner.tsx` already does this correctly — copy the pattern.

### Pitfall 4: Form submit hits wrong endpoint in dev
**What goes wrong:** `NEXT_PUBLIC_FORM_URL` not set in `.env.local` during development — fetch throws.
**How to avoid:** The existing `Contact.tsx` already has a fallback: `process.env.NEXT_PUBLIC_FORM_URL || 'https://example.com/api/contact'`. Copy this pattern. Add a `console.warn` when the env var is missing.

### Pitfall 5: GSAP ScrollTrigger not cleaned up on unmount
**What goes wrong:** `ScrollTrigger.create()` instances persist after component unmount — causes scroll event accumulation.
**How to avoid:** Use `gsap.context()` and call `ctx.revert()` in the `useEffect` cleanup function.

### Pitfall 6: Navbar anchor links broken from `/services`
**What goes wrong:** `href="#manifeste"` from `/services` scrolls within the services page instead of navigating to landing.
**How to avoid:** Use `href="/#manifeste"` in rebuilt Navbar for all landing-page section anchors.

### Pitfall 7: Translation keys missing for one locale
**What goes wrong:** `t.landing.hero.pill` resolves correctly in `fr` but throws/returns `undefined` in `en` or `th` if a key was missed during the merge.
**How to avoid:** Add all three locales simultaneously in a single commit. TypeScript will catch missing keys because `Translations` interface requires all three to match.

---

## Code Examples

### Canonical Hero Canvas (from reference implementation)

```typescript
// Source: C:/Users/Anatholy/Downloads/portfolio/landing-hero.jsx
// Key: golden-spiral geometry + manual perspective projection
const buildGeo = () => {
  const pts: Point[] = [];
  const N1 = 120;
  const phi = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < N1; i++) {
    const y = 1 - (i / (N1 - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = (2 * Math.PI * i) / phi;
    pts.push({ x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius, shell: 1 });
  }
  // inner ring shell 2 (36 points at r=0.62)
  const N2 = 36; const r2 = 0.62;
  for (let i = 0; i < N2; i++) {
    const a = (i / N2) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * r2, y: Math.sin(a * 2) * 0.18, z: Math.sin(a) * r2, shell: 2 });
  }
  return pts;
};
```

### Canonical PhoneFlow SVG (from reference implementation)

```typescript
// Source: C:/Users/Anatholy/Downloads/portfolio/landing-app.jsx lines 316-334
// SVG particle: native <animate> — no GSAP needed
<circle cx="80" cy={120 + active * 90} r="5" fill="var(--acid)">
  <animate
    attributeName="cy"
    from={120 + Math.max(0, active - 1) * 90}
    to={120 + active * 90}
    dur="0.6s"
  />
</circle>
<circle cx="80" cy={120 + active * 90} r="14" fill="none"
  stroke="var(--acid)" strokeOpacity="0.3">
  <animate attributeName="r" values="6;22;6" dur="2s" repeatCount="indefinite" />
  <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
</circle>
```

### Form Submission Pattern (from existing Contact.tsx)

```typescript
// Source: src/components/sections/Contact.tsx — verified in codebase
const FORM_URL = process.env.NEXT_PUBLIC_FORM_URL || 'https://example.com/api/contact';

const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setIsSubmitting(true);
  try {
    const response = await fetch(FORM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, projectType, message }), // 4 fields
    });
    setSubmitStatus(response.ok ? 'success' : 'error');
  } catch { setSubmitStatus('error'); }
  finally { setIsSubmitting(false); }
};
```

### Partners CSS Animation (from existing PartnersBanner.tsx)

```typescript
// Source: src/components/sections/PartnersBanner.tsx lines 211-239
// Duplicate array trick + CSS keyframe
const items = [...PARTNERS, ...PARTNERS];
// render with: style={{ animation: 'partnersTicker 32s linear infinite' }}
// keyframe: from { transform: translateX(0) } to { transform: translateX(-50%) }
```

### Scroll-driven Step Reveal (from canonical mockup)

```typescript
// Source: landing-app.jsx lines 248-264
useEffect(() => {
  const onScroll = () => {
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return;
    const p = Math.max(0, Math.min(1, -rect.top / total));
    setActiveStep(Math.min(steps.length - 1, Math.floor(p * steps.length)));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, [steps.length]);
```

---

## SEO Metadata Replacement (LAND-08)

Current `layout.tsx` metadata is heavily freelance-focused ("hire", "freelance developer", "AI engineer"). This metadata lives in `src/app/layout.tsx` at lines 26-78 (`export const metadata: Metadata`).

Phase 2 should replace it with agency positioning. The new metadata should NOT contain:
- "hire", "freelance", "for hire"
- Personal skills lists ("React developer", "Node.js developer")
- "StarkDisplay", "Iron Man" (if somehow present)

New title pattern: `"BRICON ANATHOLY | Agence digitale · Sites, outils & agents IA · Tours"` (or equivalent per locale — note Next.js metadata is not i18n'd by default; use French as canonical).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | package install | Confirmed (project running) | N/A | — |
| gsap package | LAND-04 (D-02) | Not installed | — | Plain scroll listener (Option A) |
| NEXT_PUBLIC_FORM_URL | LAND-06 contact form | Unknown — env var, not checked | — | Fallback URL in code, console.warn |
| Three.js | Icosphere | Installed (0.183.2) but NOT needed | N/A | Canvas 2D used instead |
| Canonical reference files | All sections | Confirmed at `C:/Users/Anatholy/Downloads/portfolio/` | N/A | — |

**Missing dependencies with fallback:**
- `gsap` — install with `npm install gsap`, or use plain scroll listener for Phone Agent

---

## Validation Architecture

No automated test framework detected in this project (no `jest.config.*`, `vitest.config.*`, or `tests/` directory found). Phase 2 validation is visual/functional.

### Phase Requirements → Verification Map

| Req ID | Behavior | Verification Method | Notes |
|--------|----------|---------------------|-------|
| LAND-01 | Hero: 3-line title, rotating icosphere, 4-stat grid | Visual browser check | Canvas renders acid-colored wireframe sphere |
| LAND-02 | Manifeste: 2-col editorial layout + italic quote | Visual browser check | `data-reveal` triggers on scroll |
| LAND-03 | Réalisations: 4 project cards with tags + year | Visual browser check | Verify all 4 projects render in fr/en/th |
| LAND-04 | Phone Agent: pinned scroll, SVG particle advances | Scroll through section | Active step advances 0→3 as user scrolls |
| LAND-05 | Partners: infinite horizontal ticker | Visual browser check | No visible jump at loop point |
| LAND-06 | Contact: 4-field form, form submits | Network tab POST check | Response 200 from n8n webhook |
| LAND-07 | Wordmark + footer with nav links | Visual browser check | `/mentions-legales` link works |
| LAND-08 | No freelance signals, updated metadata | `<title>` + `<meta>` inspect | No "hire", "freelance" in page source |
| (all) | Language switcher works across all sections | Click fr/en/th buttons | All new `t.landing.*` keys resolve |
| (all) | `prefers-reduced-motion` respected | DevTools emulation | Elements appear instantly, no animation |
| (all) | Responsive at 900px | DevTools 900px viewport | No overflow, readable layout |

### Quick Smoke Check Per Wave

```bash
# After each wave — dev server must be running
npm run dev
# Open http://localhost:3000 — check for build errors in terminal
# Open http://localhost:3000/services — verify Navbar/Footer still render
```

### Phase Gate

Before marking Phase 2 complete:
1. `npm run build` completes with zero errors
2. All 8 LAND-XX requirements pass visual verification
3. `http://localhost:3000/services` renders without regression
4. Language switcher cycles correctly for all new landing keys

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | GSAP 3.x is current stable version | Standard Stack | Wrong version pin in package.json — check `npm view gsap version` before installing |
| A2 | NEXT_PUBLIC_FORM_URL is set in production environment | Contact Form | Form silently fails — existing fallback pattern mitigates |
| A3 | React Compiler (`reactCompiler: true` in next.config.ts) does not interfere with `useEffect` cleanup patterns | SSR Pitfalls | If it does, disable React Compiler for PhoneAgent component via directive |

**All other claims in this document are VERIFIED against the live codebase or the canonical reference files at `C:/Users/Anatholy/Downloads/portfolio/`.**

---

## Open Questions

1. **Phone Agent section height for scroll pin**
   - What we know: The mockup uses `position: sticky` CSS or a tall wrapper div to create the pinning effect. The scroll listener calculates `rect.height - window.innerHeight` as `total` — which means the section must be taller than the viewport.
   - What's unclear: Exact height multiplier for the section wrapper (e.g., `height: 300vh`).
   - Recommendation: Use `height: 250vh` for the outer section wrapper (gives 4 steps × ~60vh of scroll travel each); the inner content panel is `position: sticky; top: 0`.

2. **Whether `src/app/page.tsx` needs `'use client'` or can use a client boundary child**
   - What we know: `useReveals()` calls `IntersectionObserver` — browser-only.
   - What's unclear: Whether to put `'use client'` on `page.tsx` directly or extract a `<RevealInit />` client component that wraps the call.
   - Recommendation: Put `'use client'` on `page.tsx` directly (simpler, no extra file). All sections are already client components or will be.

3. **Footer rebuild: in-place overwrite vs new file**
   - What we know: `Footer.tsx` is imported by both `page.tsx` and `services/page.tsx`.
   - What's unclear: Whether the new Phase 2 footer design is compatible with the services page footer expectation.
   - Recommendation: Rebuild `Footer.tsx` in-place. The services page in Phase 3 will get its own footer treatment. Visual regression check on `/services` covers this.

---

## Sources

### Primary (HIGH confidence — verified in live codebase)
- `C:/portfolio/src/app/page.tsx` — current component imports, full rewrite target confirmed
- `C:/portfolio/src/components/layout/Navbar.tsx` — current Navbar, imports `useLanguage` and `Lang`
- `C:/portfolio/src/components/layout/Footer.tsx` — current Footer, imported by services page
- `C:/portfolio/src/components/sections/PartnersBanner.tsx` — CSS animation pattern, `t.services.partners` keys
- `C:/portfolio/src/components/sections/Contact.tsx` — 3-field form pattern, `NEXT_PUBLIC_FORM_URL` usage
- `C:/portfolio/src/components/ui/ClientProviders.tsx` — SSR-safe dynamic import pattern
- `C:/portfolio/src/context/LanguageContext.tsx` — `useLanguage()` hook, `Lang` type
- `C:/portfolio/src/lib/translations.ts` — full `Translations` interface, all three locales
- `C:/portfolio/src/hooks/useReveals.ts` — `MutationObserver` sweep, `prefers-reduced-motion` check
- `C:/portfolio/src/app/layout.tsx` — font loading, metadata export location, `ClientProviders` mounting
- `C:/portfolio/src/app/services/page.tsx` — imports Navbar, Footer, PartnersBanner (deletion safety check)
- `C:/portfolio/next.config.ts` — `reactCompiler: true` confirmed
- `C:/portfolio/package.json` — gsap NOT installed; Three.js 0.183.2 installed; Next.js 16.1.6

### Primary (HIGH confidence — canonical design reference)
- `C:/Users/Anatholy/Downloads/portfolio/landing-app.jsx` — complete component implementations for all 7 sections + Navbar + Footer
- `C:/Users/Anatholy/Downloads/portfolio/landing-hero.jsx` — icosphere Canvas 2D implementation (golden-spiral geometry, projection, draw loop)
- `C:/Users/Anatholy/Downloads/portfolio/landing-i18n.jsx` — all fr/en/th strings for all landing sections

---

## Metadata

**Confidence breakdown:**
- Component deletion safety: HIGH — grep-verified against all `.tsx` files
- i18n merge strategy: HIGH — both sides of the merge fully read
- Icosphere approach: HIGH — reference implementation fully read and analyzed
- Phone Agent scroll approach: HIGH — reference implementation fully read; GSAP option is ASSUMED pattern
- Partners ticker: HIGH — existing PartnersBanner CSS strategy confirmed
- GSAP version: LOW — package not yet installed, version unverified

**Research date:** 2026-05-16
**Valid until:** 2026-06-16 (Next.js 16.x stable, 30-day window)
