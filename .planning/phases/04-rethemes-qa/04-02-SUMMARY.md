---
phase: 04-rethemes-qa
plan: "02"
subsystem: demo-page
tags: [retheme, css-vars, design-system, crm-demo, supabase-realtime]
dependency_graph:
  requires: []
  provides: [demo-page-rethemed]
  affects: [src/app/demo/page.tsx]
tech_stack:
  added: []
  patterns: [css-custom-properties, tailwind-arbitrary-values]
key_files:
  created: []
  modified:
    - src/app/demo/page.tsx
decisions:
  - "Replaced text-white on outer div wrapper with text-[var(--ink)] alongside bg-[var(--bg)] — not in the substitution table but required for consistent foreground default"
metrics:
  duration: "~10m"
  completed: "2026-05-18T08:14:18Z"
  tasks_completed: 1
  tasks_total: 1
---

# Phase 04 Plan 02: Demo CRM Retheme Summary

**One-liner:** Applied Selenium design system CSS vars to /demo CRM page — acid-tinted phone CTA, var-based panels and typography, all Supabase Realtime wiring preserved byte-for-byte.

## What Was Done

Task 1 applied 24 in-place class substitutions to `src/app/demo/page.tsx`, migrating all legacy hex and Tailwind palette colors to CSS custom properties from the Phase 02 design system:

- **Page background:** `bg-[#0f172a]` → `bg-[var(--bg)]`
- **Phone CTA block:** `bg-[#1e293b] border-indigo-500/30` → `bg-[var(--acid)]/10 border-[var(--acid)]/20` (acid-tinted panel per D-03/D-05)
- **Phone number text:** `text-indigo-400` → `text-[var(--acid)]`
- **Orders count:** `text-blue-400` → `text-[var(--acid)]`
- **All stat cards and panels:** `bg-[#1e293b] border-gray-800` → `bg-[var(--bg-2)] border-[var(--line)]` (4 instances)
- **All dividers:** `divide-gray-800/60` → `divide-[var(--line)]/60` (2 instances)
- **Primary text:** `text-white` → `text-[var(--ink)]` (customer name, order total, product name)
- **Secondary text:** `text-gray-400` → `text-[var(--ink-dim)]` (phone label, order items, section headers)
- **Tertiary/label text:** `text-gray-500`/`text-gray-600`/`text-gray-700` → `text-[var(--ink-faint)]` (stat labels, timestamps, footer, product category)

**Preserved untouched:**
- Lines 1–95: all Supabase Realtime wiring (interfaces, state, useEffect, channel subscriptions, fetchOrders, fetchProducts, stockColor, stockEmoji)
- Semantic stock colors: `text-red-400`, `text-amber-400`, `text-emerald-400`
- En ligne live badge: `bg-emerald-500/20 border-emerald-500/30 text-emerald-400 bg-emerald-400`
- New-order flash animation: `bg-emerald-500/10 border-l-2 border-emerald-500`
- Products count: `text-emerald-400` (distinct from orders count which now uses acid)

## Verification Results

| Check | Result |
|-------|--------|
| Legacy classes remaining | 0 matches |
| CSS var count | 24 (≥15 required) |
| `bg-[var(--bg)]` present | Yes |
| `bg-[var(--acid)]/10` present | Yes |
| `border-[var(--acid)]/20` present | Yes |
| `text-[var(--acid)]` count | 2 (phone number + orders count) |
| `bg-[var(--bg-2)]` count | 4 (stat cards + both panels) |
| Semantic colors preserved | Yes (red/amber/emerald all present) |
| Live badge classes preserved | Yes |
| Supabase channels preserved | Yes (.channel('demo-orders'), .channel('demo-products')) |
| fetchOrders / fetchProducts | Byte-identical |

## Deviations from Plan

**1. [Rule 2 - Missing critical] Added `text-[var(--ink)]` to outer div**
- **Found during:** Task 1
- **Issue:** The plan's substitution table listed `bg-[#0f172a]` on the outer div but the original also had `text-white` directly on that same div, providing the default foreground color for the whole page. Without replacing it, the page would have legacy `text-white` fallback on the container.
- **Fix:** Replaced `text-white` on the outer div wrapper with `text-[var(--ink)]` alongside `bg-[var(--bg)]`.
- **Files modified:** `src/app/demo/page.tsx` (line 107)
- **Commit:** ac11a58

No other deviations — plan executed exactly as specified for all other substitutions.

## Known Stubs

None. All CSS vars reference real values defined in `src/app/globals.css` `:root`. No placeholder data wired.

## Threat Flags

No new security-relevant surface introduced. This plan is purely presentational (class substitution only). Supabase RLS and channel subscriptions remain unchanged (T-04-02-01 mitigated, T-04-02-02 accepted per plan).

## Self-Check: PASSED

- `src/app/demo/page.tsx` exists: YES
- Commit `ac11a58` exists: YES
- Zero legacy classes remaining: YES
- 24 CSS var usages: YES (≥15 required)
- Semantic colors preserved: YES
- Supabase channels intact: YES
