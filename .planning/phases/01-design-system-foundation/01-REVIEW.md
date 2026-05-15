---
phase: 01-design-system-foundation
reviewed: 2026-05-15T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/app/globals.css
  - src/app/layout.tsx
  - src/components/ui/CustomCursor.tsx
  - src/components/ui/CinemaIntro.tsx
  - src/components/ui/ClientProviders.tsx
  - src/hooks/useReveals.ts
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-15
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Six source files covering the design system foundation were reviewed: global CSS tokens, the root layout, the custom cursor component, the cinema intro component, the client providers wrapper, and the scroll reveal hook. No critical security vulnerabilities were found. Five warnings were identified — all related to correctness or potential runtime errors — and four informational items were noted for maintainability. The most significant issues are: a missing `window` guard in `useReveals.ts` that will crash on SSR, a `useEffect` dependency-array omission in `CinemaIntro.tsx` that can cause a stale callback, and a visual bug in `CustomCursor.tsx` where the dot position variables `dx`/`dy` are redundant copies of `mx`/`my` and a resize-listener is missing.

---

## Warnings

### WR-01: `useReveals` accesses `window` before SSR guard

**File:** `src/hooks/useReveals.ts:6`
**Issue:** `window.matchMedia(...)` is called at the top of the `useEffect` body with no SSR guard. In Next.js App Router, hooks can be invoked in a server component context if a consuming component lacks `'use client'`. If that happens, `window` is `undefined` and the call throws a `ReferenceError` at runtime. Even inside a `useEffect`, the real risk materialises if this hook is ever used outside a strict `'use client'` boundary.

More concretely: the hook does NOT have `'use client'` in its own file, so any server-side rendering path that somehow reaches this code (e.g., during hydration mismatch debugging, or a refactor that moves a consumer to RSC) will crash.

**Fix:** Add a guard at the top of the effect, or move the `matchMedia` check to a lazy initialiser:

```ts
useEffect(() => {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // ...
  }
  // ...
}, deps);
```

---

### WR-02: `CinemaIntro` — `onDone` omitted from `useEffect` dependency array

**File:** `src/components/ui/CinemaIntro.tsx:26`
**Issue:** The `useEffect` dep array is `[force]`, but the callback calls `onDone?.()`. If the parent re-renders and passes a new `onDone` reference before the 1700 ms timeout fires, the stale closure will call the old reference. In React's strict mode (dev), the effect also runs twice; the second run would call the stale `onDone` from the first mount.

**Fix:** Include `onDone` in the dependency array. Because a new function identity on every render would re-trigger the timeout, stabilise the prop at the call site with `useCallback`, or use a ref pattern:

```tsx
// Option A — simplest: add onDone to deps and stabilise at call site
useEffect(() => {
  // ...
}, [force, onDone]);

// Option B — ref pattern (avoids needing useCallback at call site)
const onDoneRef = useRef(onDone);
useEffect(() => { onDoneRef.current = onDone; });

useEffect(() => {
  const seen = localStorage.getItem('ba_intro_seen');
  if (seen === '1' && !force) {
    setGone(true);
    onDoneRef.current?.();
    return;
  }
  const t = setTimeout(() => {
    setGone(true);
    localStorage.setItem('ba_intro_seen', '1');
    onDoneRef.current?.();
  }, 1700);
  return () => clearTimeout(t);
}, [force]);
```

---

### WR-03: `CustomCursor` — `dx`/`dy` variables are always identical to `mx`/`my`

**File:** `src/components/ui/CustomCursor.tsx:12-18`
**Issue:** `dx` and `dy` are declared alongside `mx`/`my` and assigned in `onMove` as `dx = mx; dy = my`. They are never assigned differently, so `translate(${dx}px, ${dy}px)` for the dot is always exactly the same as using `mx`/`my` directly. The intent appears to be that the dot snaps instantly and the ring lerps — which is correct in spirit — but the redundant variables are confusing dead weight and a maintenance trap (a future developer may assume `dx`/`dy` serve a distinct purpose and introduce a bug by diverging them).

**Fix:** Remove `dx`/`dy` and use `mx`/`my` directly for the dot transform:

```ts
let mx = 0, my = 0, rx = 0, ry = 0;

const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };

// in tick:
if (dotRef.current) dotRef.current.style.transform = `translate(${mx}px, ${my}px)`;
```

---

### WR-04: `CustomCursor` — viewport resize not re-evaluated

**File:** `src/components/ui/CustomCursor.tsx:10`
**Issue:** The media query `(max-width: 900px)` is checked exactly once on mount. If the user resizes the viewport from desktop to mobile (or vice versa) after mount, the cursor DOM nodes remain visible/hidden based on the initial check. The CSS already hides them via `@media (max-width: 900px) { display: none }`, so the visual is partially handled, but the RAF loop and event listeners keep running on mobile after a resize from wide to narrow — wasting cycles on every animation frame.

**Fix:** Use `matchMedia` with an event listener so the effect re-runs on breakpoint change, or at minimum cancel the RAF and remove listeners when the media query fires:

```ts
const mql = window.matchMedia('(max-width: 900px)');
if (mql.matches) return;

const handleBreakpoint = (e: MediaQueryListEvent) => {
  if (e.matches) {
    window.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseover', onOver);
    cancelAnimationFrame(raf);
  }
};
mql.addEventListener('change', handleBreakpoint);

// in cleanup:
mql.removeEventListener('change', handleBreakpoint);
```

---

### WR-05: `layout.tsx` — `<ClientProviders />` rendered outside `<LanguageProvider>`

**File:** `src/app/layout.tsx:91-95`
**Issue:** `ClientProviders` (which renders `CinemaIntro` and `CustomCursor`) is placed *after* the closing `</LanguageProvider>` tag. As currently written neither component consumes the language context, so there is no immediate bug. However, this is an architectural trap: any future addition to `ClientProviders` that calls `useLanguage()` will throw `"useLanguage must be used inside LanguageProvider"` at runtime, and the cause will not be obvious from the component code alone.

```tsx
// Current (risky):
<LanguageProvider>
  {children}
</LanguageProvider>
<ClientProviders />   {/* outside the provider */}

// Fix — move ClientProviders inside LanguageProvider:
<LanguageProvider>
  {children}
  <ClientProviders />
</LanguageProvider>
```

---

## Info

### IN-01: `useReveals` — `deps` parameter typed as `unknown[]`

**File:** `src/hooks/useReveals.ts:3`
**Issue:** The `deps` parameter is typed as `unknown[]`, which suppresses the React exhaustive-deps lint rule and makes the hook signature opaque to callers. The intention is to let consumers pass their own deps, but `unknown[]` disables type safety on the dep values. A more idiomatic approach is `React.DependencyList` (which is `readonly unknown[]`), or documenting the intent explicitly.

**Fix:**
```ts
import type { DependencyList } from 'react';
export function useReveals(deps: DependencyList = []) {
```

---

### IN-02: `globals.css` — duplicate `:root` blocks

**File:** `src/app/globals.css:4` and `src/app/globals.css:20`
**Issue:** There are two separate `:root` blocks — one for color tokens (lines 4–17) and one for font CSS vars (lines 20–24). Both are valid and browsers merge them, but it is an unnecessary split that makes the token surface harder to scan.

**Fix:** Merge both `:root` declarations into a single block.

---

### IN-03: `CinemaIntro` — animation duration hardcoded in two places

**File:** `src/components/ui/CinemaIntro.tsx:20` and `src/app/globals.css:172`
**Issue:** The JS timeout is `1700 ms` but the CSS `progress` animation is `1.5s` (1500 ms). The user sees the progress bar complete 200 ms before the overlay begins its fade-out. This appears to be an intentional small hold, but it is undocumented. If the timeout is ever changed to match the animation, the person editing the JS value has no indication that the CSS value also needs updating.

**Fix:** Either document the intentional gap with a comment, or define the duration as a shared CSS custom property driven from JS via a style prop, so they stay in sync:

```tsx
// In CinemaIntro.tsx
const DURATION_MS = 1700;
const ANIM_MS = 1500;
// Gap: 200ms hold after bar fills before fade — intentional

<div className="intro-progress" style={{ '--progress-duration': `${ANIM_MS}ms` } as React.CSSProperties} />
```

---

### IN-04: `ClientProviders` — no loading fallback for dynamic imports

**File:** `src/components/ui/ClientProviders.tsx:5-6`
**Issue:** Both `dynamic()` calls omit a `loading` option. Next.js will render nothing until the JS chunk loads. For `CinemaIntro` this means the overlay flashes in after a delay rather than being present from the first paint, which defeats its purpose of masking the initial load. A minimal inline fallback or a skeleton avoids layout shift.

**Fix:**
```tsx
const CinemaIntro = dynamic(() => import('@/components/ui/CinemaIntro'), {
  ssr: false,
  loading: () => <div className="intro" aria-hidden="true" />,
});
```

---

_Reviewed: 2026-05-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
