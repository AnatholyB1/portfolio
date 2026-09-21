---
phase: 08-landing-simplification-pricing-policy
reviewed: 2026-09-21T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - src/app/calculateur-roi/page.test.ts
  - src/app/calculateur-roi/page.tsx
  - src/app/globals.css
  - src/app/layout.test.ts
  - src/app/layout.tsx
  - src/app/page.test.ts
  - src/app/page.tsx
  - src/components/sections/EnjeuxSection.tsx
  - src/components/sections/FonctionnementSection.tsx
  - src/components/sections/HeroSection.tsx
  - src/components/sections/PhoneAgent.tsx
  - src/components/sections/ProblemSection.tsx
  - src/components/sections/Realisations.tsx
  - src/components/sections/ServicesPreview.tsx
  - src/lib/translations.test.ts
  - src/lib/translations.ts
findings:
  critical: 0
  warning: 6
  info: 2
  total: 8
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-09-21
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Reviewed the landing-simplification and pricing-policy changes: the ROI calculator's D-01
rework (dropping the price-ratio/amortization card in favor of a single "capacité récupérée"
card), the new landing sections (`problems`, `servicesPreview`, `method`, `enjeux`), the
simplified `PhoneAgent` teaser, and the `translations.ts` content backing all of it in
fr/en/th. The PRIX-01/PRIX-02 no-pricing-language guards hold up (verified against the
test suite's regex and independently grepped for `€`/`prix`/`tarif` across `translations.ts`
and the ROI page source — no hits). No security vulnerabilities, injection vectors, or
crash-causing bugs were found.

The issues found are real but non-critical: a content/count mismatch in the "réalisations"
section copy (claims six case studies, ships four), a numeric-input edge case in the ROI
calculator that silently violates its own declared bounds, a global side effect in
`FonctionnementSection`'s GSAP cleanup, an accessibility gap in the calculator's form
controls, and CSS left behind by the two markup simplifications (old ROI multiplier/amort
card, old Phone Agent flow-diagram teaser) that no longer has any consumer.

## Warnings

### WR-01: ROI calculator input clamp defaults to 0 instead of the field's declared minimum

**File:** `src/app/calculateur-roi/page.tsx:61-64`
**Issue:** When a user clears a numeric `<input type="number">` field, `e.target.valueAsNumber`
is `NaN`, and the handler falls back to `0` regardless of the field's own `min`:
```tsx
onChange={(e) => {
  const raw = e.target.valueAsNumber;
  onChange(Number.isNaN(raw) ? 0 : clamp(raw, min, max));
}}
```
Several fields have a `min` well above 0 — e.g. `dureeMin` (`min={1}`), `coutHoraire`
(`min={10}`), `facteurInterruption` (`min={1.0}`). Clearing any of these silently sets
the underlying state to `0`, which is below the declared bound and, for
`facteurInterruption`, zeroes out `capaciteRecuperee` entirely (it's a multiplicative
factor). The paired `<input type="range">` for the same field also receives `value={0}`,
which is outside its own `min` attribute, so the number badge and the slider position
disagree with the field's stated bounds until the user re-types a value.
**Fix:**
```tsx
onChange={(e) => {
  const raw = e.target.valueAsNumber;
  onChange(Number.isNaN(raw) ? min : clamp(raw, min, max));
}}
```

### WR-02: `FonctionnementSection` cleanup kills every ScrollTrigger instance on the page, not just its own

**File:** `src/components/sections/FonctionnementSection.tsx:43-45`
**Issue:**
```tsx
return () => {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
};
```
`ScrollTrigger.getAll()` returns every registered ScrollTrigger in the application, not
just the ones this effect created. Today this happens to be safe only because
`FonctionnementSection` is the sole ScrollTrigger consumer on `/` (the other consumer,
`MethodologySection.tsx`, lives on a different route). The moment a second
ScrollTrigger-driven section is added to the same page (or this section is used
alongside `MethodologySection` in a shared layout), unmounting `FonctionnementSection`
will silently kill the other component's scroll-linked animations.
**Fix:** Track only the triggers this effect created and kill those:
```tsx
const triggers: ScrollTrigger[] = [];
stepEls.forEach((stepEl, i) => {
  triggers.push(ScrollTrigger.create({ trigger: stepEl, /* ... */ }));
});
triggers.push(ScrollTrigger.create({ trigger: wrap, /* ... */ }));
return () => triggers.forEach((t) => t.kill());
```

### WR-03: "Six partenaires, six métiers différents" copy overstates the four réalisations actually shown

**File:** `src/lib/translations.ts:954` (fr), `:1732` (en), `:2486` (th)
**Issue:** `landing.work.intro` reads (fr): *"Six partenaires, six métiers différents, une
même méthode : on règle un vrai problème métier."* (mirrored in en/th). But
`src/data/projects.ts` only defines 4 projects, and `landing.work.items` in all three
locales has exactly 4 entries. `Realisations.tsx` renders one `work-item` per project, so
the section literally displays 4 case studies directly under a headline claiming 6. This
reads as a stale leftover from before the case-study list was trimmed from 6 to 4 and is
inaccurate, user-facing marketing copy shipped in all three locales.
**Fix:** Update the copy to match the actual count (e.g. "Quatre partenaires, quatre
métiers différents…") or restore the two missing case studies to `projects.ts`/`work.items`
if six was the intended set.

### WR-04: Dead CSS left over from the removed ROI "multiplier / amortization" card

**File:** `src/app/globals.css:646-652`
**Issue:** `.roi-claim`, `.roi-claim strong`, `.roi-mult`, `.roi-mult-sub`, `.roi-amort`,
`.roi-amort strong`, `.roi-amort.neg` were styling for the price-ratio card that D-01
removed from `calculateur-roi/page.tsx` (confirmed: `page.tsx` no longer renders any of
these class names — `roi-card-main` now hosts the capacity card content instead). This is
unreferenced CSS shipped to production.
**Fix:** Delete the dead rule block (lines 646-652), keeping only the still-used
`.roi-card-bonus`/`.roi-badge`/`.roi-bonus-*`/`.roi-mention` rules below it.

### WR-05: Dead CSS left over from the simplified `PhoneAgent` teaser

**File:** `src/app/globals.css:313-314, 317-326`
**Issue:** `.phone-section`, `.phone-grid`, `.phone-features`, `.phone-features li`,
`.phone-features li:last-child`, `.check`, `.flow`, `.flow-grid`, `.flow-header`, `.rec`,
`.d`, `.flow-svg` styled the old phone-agent flow-diagram teaser. The current
`PhoneAgent.tsx` only renders `<section className="sec border-t" id="phone">` with
`.phone-badge`/`.live` (both still used) plus standard `.sec-title`/`.sec-intro`/`.btn`
classes — none of the classes above appear anywhere else in `src/` (verified via repo-wide
search). This is unreferenced CSS from the pre-simplification markup.
**Fix:** Remove the dead rules, keeping `.phone-badge` and `.live` (still consumed by
`PhoneAgent.tsx`).

### WR-06: ROI calculator's field labels are not programmatically associated with their inputs

**File:** `src/app/calculateur-roi/page.tsx:46-79`
**Issue:** `ControlRow` renders a `<label className="roi-label">{label}</label>` as a
sibling of the `<input type="number">` and `<input type="range">` it describes — the
inputs are not nested inside the `<label>`, and neither the `<label>` nor the inputs carry
`htmlFor`/`id` (or `aria-label`) to link them. Screen-reader users focusing either input
hear no accessible name (e.g. "Nombre d'appels par jour"), only "number, edit text" /
"slider". This affects every field in the calculator (12 controls across the socle,
upside, and advanced-parameters panels).
**Fix:** Give each control a stable id and wire it up, e.g.:
```tsx
const id = useId();
// ...
<label className="roi-label" htmlFor={id}>{label}...</label>
<input id={id} type="number" ... />
<input aria-label={label} type="range" ... />
```

## Info

### IN-01: `HeroSection` reads translation stats via an unchecked string-keyed cast

**File:** `src/components/sections/HeroSection.tsx:233-238`
**Issue:**
```tsx
{([1, 2, 3, 4] as const).map((i) => (
  <div key={i}>
    <div className="it-num">{(tl.hero as Record<string, string>)[`stat_${i}_n`]}</div>
    ...
```
`Translations['landing']['hero']` is fully and explicitly typed (`stat_1_n`, `stat_1_l`,
… `stat_4_d`), but the `Record<string, string>` cast discards that type safety in favor
of dynamic key lookup. A future rename of any `stat_N_x` field in `translations.ts` would
compile cleanly and silently render `undefined` on the landing page instead of failing the
build.
**Fix:** Model the four stats as an array of `{ n, l, d }` objects in `Translations` (or
build one locally with a typed helper) so the map iterates real objects instead of
string-templating into a widened type.

### IN-02: Ambiguous loop-variable name shadows a common testing global

**File:** `src/components/sections/ProblemSection.tsx:20`
**Issue:** `{ts.items.map((it, i) => (` names the per-item variable `it`, which is both a
generic single/two-letter identifier and the conventional name of Vitest/Jest's global
test function (not imported in this file, so no functional collision today, but it reduces
readability and invites confusion if this file is ever touched by someone scanning for
`it(...)` test blocks or if a future refactor adds test utilities to the same scope).
**Fix:** Rename to something descriptive, e.g. `item`.

---

_Reviewed: 2026-09-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
