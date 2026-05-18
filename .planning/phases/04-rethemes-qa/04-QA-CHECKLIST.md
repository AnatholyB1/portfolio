# Phase 4 QA Checklist

Generated: 2026-05-18
Requirement: QA-01, QA-02, QA-03, QA-04

---

## QA-01 — Responsive at 900px

For each page, set browser viewport to exactly 900px wide and verify:

### Landing Page (`/`)
- [ ] No horizontal scroll at 900px
- [ ] Navbar collapses correctly (hamburger or stacked links — no overflow)
- [ ] Hero section title does not overflow horizontally
- [ ] Stat grid remains readable (no clipped numbers)
- [ ] All sections visible without horizontal scroll

### Services Page (`/services`)
- [ ] No horizontal scroll at 900px
- [ ] Pricing packs grid: wraps cleanly (no cut-off cards)
- [ ] Methodology section rail visible and scrollable
- [ ] Options grid: wraps cleanly

### Mentions Légales (`/mentions-legales`)
- [ ] No horizontal scroll at 900px
- [ ] Legal text readable (no overflow)
- [ ] Navbar collapses correctly

### Demo (`/demo`)
- [ ] No horizontal scroll at 900px
- [ ] Stat grid (2 columns) remains visible
- [ ] Orders + Stock panels stack cleanly on narrow viewport

---

## QA-02 — prefers-reduced-motion

**Code check results (automated — 2026-05-18):**

Files checked:
- `src/components/ui/CinemaIntro.tsx` — No JS-level reduced-motion check found. Animation dismissal relies on CSS only.
- `src/components/ui/CustomCursor.tsx` — No reduced-motion handling found.
- `src/hooks/useReveals.ts` — HANDLED: `window.matchMedia('(prefers-reduced-motion: reduce)').matches` at line 6. Reveals all elements immediately without observer setup when reduced-motion is active.
- `src/components/sections/PhoneAgent.tsx` — No reduced-motion handling found. GSAP ScrollTrigger runs unconditionally.
- `src/components/sections/MethodologySection.tsx` — No reduced-motion handling found.

CSS-level handling (in `src/app/globals.css`):
- Line 113: `@media (prefers-reduced-motion: reduce)` — disables `[data-reveal]` transitions (opacity: 1, transform: none, transition: none)
- Line 391: `@media (prefers-reduced-motion: reduce)` — hides `.hero-canvas-wrap`, pauses `.partners-track` animation, disables `.live/.dot/.d` animations, disables `[data-reveal]` and `.split .line span` transitions

Manual verification steps:
1. Open DevTools → Rendering tab → check "Emulate CSS media feature prefers-reduced-motion: reduce"
2. Hard-reload the page (Ctrl+Shift+R)

### Cinema Intro
- [ ] With reduced-motion: overlay skips animation and dismisses immediately (or appears already dismissed)
- [ ] localStorage `cinemaPlayed` flag still set correctly
- **Note:** No JS-level guard — CSS-only via globals.css. Verify visually that intro does not play motion.

### Scroll Reveal ([data-reveal] elements)
- [ ] With reduced-motion: elements appear immediately on load without fade/slide animation
- **Note:** useReveals.ts has explicit JS guard + CSS fallback in globals.css. Both layers covered.

### PhoneAgent section
- [ ] With reduced-motion: SVG particle flow animation absent or static
- [ ] Pinned scroll behavior still functional (no animation, but scroll still works)
- **Note:** No reduced-motion guard in PhoneAgent.tsx — CSS globals.css covers `.live/.dot/.d` but GSAP ScrollTrigger pin runs unconditionally. Verify manually that the experience is acceptable.

### Methodology section
- [ ] With reduced-motion: GSAP ScrollTrigger rail does not animate; steps visible without motion
- **Note:** No reduced-motion guard in MethodologySection.tsx — verify manually that steps are readable without GSAP rail animation.

---

## QA-03 — SEO Metadata

**Code check results (automated — 2026-05-18):**

Command run:
```
grep -rn "freelance|Développeur web|hire.developer|développeur Full Stack|site personnel|Anatholy BRICON" \
  src/app/layout.tsx src/app/page.tsx src/app/services/page.tsx \
  src/app/mentions-legales/page.tsx src/app/demo/page.tsx
```
Result: **Zero matches — PASS**. No freelance/hire-developer keywords found in any of the checked metadata files.

For each page, confirm in browser (View Source or DevTools → Elements → `<head>`):

### Landing Page (`/`)
- [ ] `<title>` contains no "freelance", "hire", "développeur" keywords
- [ ] `<meta name="description">` contains no freelance/hire-developer signals

### Services Page (`/services`)
- [ ] `<title>` contains no freelance signals
- [ ] `<meta name="description">` positioned as agency offer

### Mentions Légales (`/mentions-legales`)
- [ ] `<title>` is exactly: `Mentions Légales | BRICON ANATHOLY`
- [ ] `<meta name="description">` reads: "Mentions légales de Selenium Phase 02, agence web & IA basée à Tours, France."

### Demo (`/demo`)
- [ ] `<title>` contains no freelance signals (note: demo may have minimal metadata — verify what's set)

---

## QA-04 — /demo/feuillette Untouched

**Automated diff result (2026-05-18):**

Command run:
```
git diff 5f36fa0 HEAD -- src/app/demo/feuillette/
```
Baseline commit: `5f36fa0` — "docs: bootstrap GSD planning — milestone v1.0 Visual Redesign (4 phases, 29 requirements)" (pre-Phase-1 baseline, before any CSS token changes)

Result: **Empty output — PASS**

- [x] `git diff 5f36fa0 HEAD -- src/app/demo/feuillette/` output is empty
- [x] Diff result: **PASS**

**Result:** PASS
**Baseline commit used:** `5f36fa0`
**Changed files (if any):** none

---

## Overall QA Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| QA-01 (900px responsive) | [ ] Pending human verify | Manual viewport test required |
| QA-02 (prefers-reduced-motion) | [ ] Pending human verify | Code check done — JS guard in useReveals.ts + CSS globals; GSAP sections uncovered in JS |
| QA-03 (SEO metadata) | [x] Code check PASS + pending human verify | Zero keyword matches in code; confirm rendered HTML in browser |
| QA-04 (feuillette untouched) | [x] PASS | Automated git diff — empty output |
