---
phase: 04-rethemes-qa
reviewed: 2026-05-18T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/app/mentions-legales/page.tsx
  - src/app/demo/page.tsx
  - src/lib/translations.ts
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-05-18
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found (1 warning, 2 info — no critical issues)

## Summary

Phase 4 was a CSS var retheme (class-to-var substitution) and i18n dead key audit. No new logic was introduced. All three files were read in full and cross-referenced against `src/app/globals.css` (the canonical token source) and the 19 component files that consume translation keys.

**CSS variables** — every `var(--*)` reference in both `mentions-legales/page.tsx` and `demo/page.tsx` resolves correctly against the design token definitions in `globals.css`. Tokens used: `--bg`, `--bg-2`, `--acid`, `--ink`, `--ink-dim`, `--ink-faint`, `--line`. All are defined in `:root`. No broken references found.

**Mentions Légales content** — all 8 legal sections are present and intact: Éditeur, Hébergement, Propriété intellectuelle, RGPD, Cookies, Liens hypertextes, Limitation de responsabilité, Droit applicable. No accidental removal detected.

**Demo page Supabase wiring** — real-time channel subscriptions for `orders` (INSERT) and `products` (UPDATE), fetch functions, and channel cleanup in the `useEffect` return are all intact and unmodified from their pre-phase state.

**Translation keys** — the `Translations` interface, all three locale objects (`fr`, `en`, `th`), and the exported `translations` record are complete. All keys consumed by the 19 identified component files (`nav`, `services.*`, `landing.*`) are present in all three locales. No over-removal detected.

One warning was found in `demo/page.tsx` relating to unhandled Supabase fetch errors (pre-existing, surfaced by the review). Two info items cover a missing `<Footer />` and a `src/context/translations.ts` path discrepancy.

---

## Warnings

### WR-01: Supabase fetch errors silently discarded in demo/page.tsx

**File:** `src/app/demo/page.tsx:80-94`
**Issue:** Both `fetchOrders` and `fetchProducts` destructure only `{ data }` from the Supabase response, discarding the `error` field. If the query fails (network error, RLS rejection, missing env vars), `data` is `null`, the state is not updated, and the failure is completely invisible — no console warning, no UI error state, no retry signal. This is especially relevant for the demo page, which is a public-facing showcase where a silent blank state would appear broken to visitors.
**Fix:**
```typescript
async function fetchOrders() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[demo] fetchOrders error:', error.message)
    return
  }
  if (data) setOrders(data)
}

async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('category')
  if (error) {
    console.error('[demo] fetchProducts error:', error.message)
    return
  }
  if (data) setProducts(data)
}
```

---

## Info

### IN-01: mentions-legales/page.tsx has no Footer component

**File:** `src/app/mentions-legales/page.tsx:173`
**Issue:** The page renders `<Navbar />` and `<Footer />` — the Footer import is present and used. This is fine. However, the page does not render a `<Footer />` — wait, re-reading line 173: `<Footer />` is present. This item is withdrawn — Footer is correctly included.

### IN-02: Config path mismatch for translations file

**File:** `src/lib/translations.ts` (requested as `src/context/translations.ts`)
**Issue:** The review was requested against `src/context/translations.ts`, but that path does not exist. The file lives at `src/lib/translations.ts`. This is a documentation/config discrepancy — the path used in the phase plan and any tooling that references `src/context/translations.ts` will silently miss this file. The actual file and its content are correct; only the recorded path is wrong.
**Fix:** Update the phase plan, any import aliases, and future review configs to reference `src/lib/translations.ts`.

### IN-03: NEXT_PUBLIC_TWILIO_NUMBER fallback exposes placeholder in production

**File:** `src/app/demo/page.tsx:102`
**Issue:** `process.env.NEXT_PUBLIC_TWILIO_NUMBER ?? '+33 X XX XX XX XX'` — if the env var is absent in a production deployment, the placeholder number is rendered to visitors as a large, prominently styled phone number. This is a cosmetic/UX issue rather than a security issue (the value is hardcoded, not secret), but it could mislead visitors on the live demo page.
**Fix:** Add an explicit guard or render a "coming soon" state when the env var is absent:
```typescript
const twilioNumber = process.env.NEXT_PUBLIC_TWILIO_NUMBER
// ...
{twilioNumber ? (
  <p className="text-4xl font-bold text-[var(--acid)] tracking-wider mb-2">
    {twilioNumber}
  </p>
) : (
  <p className="text-[var(--ink-faint)] text-sm italic">Numéro disponible prochainement</p>
)}
```

---

_Reviewed: 2026-05-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
