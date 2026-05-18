# Phase 4: Rethemes + QA - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Retheme `/mentions-legales` and `/demo` to the Selenium Phase 02 design system. Audit i18n key coverage across landing, services, Navbar, and Footer. Run integration QA against all 8 requirements (QA-01 through QA-04, THEME-01, THEME-02, I18N-01, I18N-02). No new components, no new backend routes, no new functionality. `/demo/feuillette` is a hard constraint — do not touch.

</domain>

<decisions>
## Implementation Decisions

### Mentions Légales Retheme (THEME-01)
- **D-01:** **In-place edit** — swap legacy Tailwind classes and hardcoded hex values to CSS vars in the existing `src/app/mentions-legales/page.tsx`. Do NOT rewrite the file from scratch. Content (legal text) must be word-for-word identical before and after.
  - Replace: `bg-[#030311]` → `bg-[var(--bg)]`
  - Replace: `border-indigo-500/30` → `border-[var(--line)]`
  - Replace: `text-indigo-400` / `text-indigo-300` links → `text-[var(--acid)]` / hover `text-[var(--acid)]/80`
  - Replace: `text-white` headings → `text-[var(--ink)]`
  - Replace: `text-gray-400` body → `text-[var(--ink-dim)]`
  - Replace: `text-gray-300` label spans → `text-[var(--ink)]`
  - Replace: `text-gray-500` subtitle → `text-[var(--ink-faint)]`
  - Replace: `text-gray-600` timestamps/footer → `text-[var(--ink-faint)]`
  - Replace: `font-bold text-white mb-4 pb-2 border-b border-indigo-500/30` on Section h2 → Bricolage Grotesque heading style with `border-[var(--line)]`
  - The page header mono label (`text-indigo-400/70`) → `text-[var(--acid)]/70` in JetBrains Mono
  - h1 gradient (indigo→purple) → plain `text-[var(--ink)]` in Bricolage Grotesque (no gradient needed — Selenium Phase 02 uses flat typography)
- **D-02:** Update `metadata` to agency positioning (QA-03 overlap):
  - `title`: `'Mentions Légales | BRICON ANATHOLY'`
  - `description`: Agency-positioned legal page copy. Remove all freelance/developer signals.
  - "Qualité" field content: update from "Entrepreneur individuel — Développeur web & IA freelance" to "Agence web & IA — Selenium Phase 02" (or similar agency framing).

### /demo CRM Retheme (THEME-02)
- **D-03:** **CSS vars + fonts only** — Replace all legacy hardcoded bg/border/text colors with CSS vars. Preserve Supabase Realtime wiring, channel subscriptions, order/product state logic — zero functional changes.
  - Replace: `bg-[#0f172a]` → `bg-[var(--bg)]`
  - Replace: `bg-[#1e293b]` → `bg-[var(--bg-2)]`
  - Replace: `border-indigo-500/30` → `border-[var(--line)]`
  - Replace: `text-indigo-400` (phone number display) → `text-[var(--acid)]`
  - Replace: `border-indigo-500/30` (phone block) → `border-[var(--acid)]/20`
  - Replace: `bg-indigo-500/20` (phone block bg) → `bg-[var(--acid)]/10`
  - Replace: `text-white` headings/labels → `text-[var(--ink)]`
  - Replace: `text-gray-400/500/600/700` → `text-[var(--ink-dim)]` or `text-[var(--ink-faint)]` as appropriate
- **D-04:** **Semantic stock status colors stay as-is** — `text-red-400`, `text-amber-400`, `text-emerald-400` are functional UX indicators (out of stock / low / available). Do not replace with CSS vars. The "En ligne" badge (`bg-emerald-500/20`, `text-emerald-400`) also stays — it's a live status indicator.
- **D-05:** **Phone number uses `--acid`** — The large phone number display block switches from `text-indigo-400` to `text-[var(--acid)]`. This is the primary CTA element of the demo page and matches the new brand accent across landing and services CTAs.
- **D-06:** Stat numbers (`text-blue-400` orders count, `text-emerald-400` products count) → `text-[var(--acid)]` for orders count; products count stays `text-emerald-400` (semantic — represents availability).
- **D-07:** New order highlight animation (`bg-emerald-500/10 border-l-2 border-emerald-500`) → **stay as-is** — this is functional real-time feedback, not a brand color.

### i18n Audit (I18N-01 + I18N-02)
- **D-08:** **Code-diff key coverage** — grep all `t.` usages across landing (`src/app/page.tsx` + all `src/components/sections/` landing components) and services (`src/app/services/page.tsx` + all services section components). Cross-reference against `landing-i18n.jsx` and `services-i18n.jsx` key trees. Flag any hardcoded user-facing strings not routed through `useLanguage()`.
- **D-09:** **Scope: all pages including Navbar and Footer** — Audit extends to `Navbar.tsx`, `Footer.tsx`, and the language switcher UI. These are shared across all pages — missing keys here affect every route.
- **D-10:** Produce a brief **i18n coverage report** in the plan summary: list any hardcoded strings found, list any i18n keys in `*-i18n.jsx` that are referenced but not found in the LanguageContext type. Flag, don't silently pass.

### QA Requirements
- **D-11:** **Written checklist, human verify** — Agent produces a `04-QA-CHECKLIST.md` with specific testable items per requirement. User verifies manually. No automated test scripts.
  - QA-01 (900px): checklist item per page (landing, services, mentions-légales, demo) — viewport, no horizontal scroll, nav collapses correctly
  - QA-02 (prefers-reduced-motion): checklist items for cinema intro (should skip animation), scroll-reveal (should appear immediately), GSAP sections (PhoneAgent, Methodology) — code check confirms `prefers-reduced-motion` is handled
  - QA-03 (SEO metadata): checklist items — verify `<title>` and `<meta description>` on all pages contain no freelance/hire-developer keywords
  - QA-04 (feuillette): `git diff` check — `src/app/demo/feuillette/` must show no changes since Phase 0 baseline. Pass = zero diff.
- **D-12:** QA-04 feuillette verification: `git diff <phase-0-baseline-commit> HEAD -- src/app/demo/feuillette/` — if output is empty, QA-04 passes. Document result in VERIFICATION.md.

### Carried Forward from Prior Phases
- **D-13:** CSS vars only — never hardcode hex. `var(--bg)`, `var(--acid)`, `var(--ink)`, `var(--warm)`, `var(--line)`, `var(--bg-2)`, `var(--ink-dim)`, `var(--ink-faint)`.
- **D-14:** Navbar and Footer — Phase 2 output. Import directly in both rethemed pages. Do not rebuild.
- **D-15:** `/demo/feuillette` — HARD CONSTRAINT. Zero changes to `src/app/demo/feuillette/`. This is enforced via QA-04 git diff check.

### Claude's Discretion
- Exact Tailwind class equivalents for any edge-case color usage not covered above (e.g. dividers, hover states not explicitly listed).
- Whether to consolidate the `Section` component in `mentions-legales/page.tsx` to use Bricolage Grotesque via font var or rely on the global font cascade from `layout.tsx`.
- Order of plans (rethemes first, then i18n audit, then QA — or combined).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Files to retheme
- `src/app/mentions-legales/page.tsx` — In-place edit target. Legal content must be preserved word-for-word.
- `src/app/demo/page.tsx` — CRM dashboard retheme target. Supabase Realtime wiring must be preserved unchanged.

### Design system (established in Phase 1)
- `src/app/globals.css` — All CSS vars live here. This is the canonical source for `--bg`, `--acid`, `--ink`, `--warm`, `--line`, `--bg-2`, `--ink-dim`, `--ink-faint`.

### i18n sources
- `C:/Users/Anatholy/Downloads/portfolio/landing-i18n.jsx` — All landing page translation keys (fr/en/th). Cross-reference against Phase 2 component usages.
- `C:/Users/Anatholy/Downloads/portfolio/services-i18n.jsx` — All services page translation keys (fr/en/th). Cross-reference against Phase 3 component usages.
- `src/context/LanguageContext.tsx` — i18n hook type definitions. Used to detect missing key registrations.

### Reusable Phase 2 components (import directly)
- `src/components/layout/Navbar.tsx` — Rebuilt in Phase 2. Import into both rethemed pages.
- `src/components/layout/Footer.tsx` — Rebuilt in Phase 2. Import into mentions-légales. (Demo currently has no Footer — don't add one.)

### Requirements
- `.planning/REQUIREMENTS.md` — THEME-01, THEME-02, I18N-01, I18N-02, QA-01 through QA-04 are the acceptance criteria for this phase.

### Hard constraint
- `src/app/demo/feuillette/page.tsx` — DO NOT TOUCH. QA-04 verification uses `git diff` on this path.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Navbar.tsx` / `Footer.tsx` — Phase 2 output. Already uses CSS vars and Selenium Phase 02 design. Import directly into mentions-légales retheme.
- `src/context/LanguageContext.tsx` — Provides `useLanguage()` for i18n audit. Demo page currently has no i18n — that's intentional (demo is French-only content).

### Established Patterns
- CSS vars: `bg-[var(--bg)]` via Tailwind or direct `var(--acid)` in style/CSS. Never hardcode hex.
- Font inheritance: Bricolage Grotesque and Manrope cascade from `layout.tsx` `<body>` class — mentions-légales just needs legacy `font-bold` + heading class updates; no explicit font import needed per component.

### Integration Points
- `src/app/mentions-legales/page.tsx` — In-place edit. Section component stays; only Tailwind class values change.
- `src/app/demo/page.tsx` — In-place edit. All Supabase hooks, channels, state, and fetch functions stay unchanged.
- No new files created for the retheme work.

</code_context>

<specifics>
## Specific Ideas

- The mentions-légales h1 currently uses `bg-linear-to-r from-indigo-400 to-purple-400` gradient text. Selenium Phase 02 uses flat typography — replace with plain `text-[var(--ink)]` in Bricolage Grotesque, no gradient.
- The demo phone number block (`bg-[#1e293b] border border-indigo-500/30`) becomes `bg-[var(--bg-2)] border border-[var(--acid)]/20 bg-[var(--acid)]/10` to give it an acid-tinted call-to-action feel consistent with the new brand.
- QA-04: The baseline commit to diff against is the very first commit of the milestone (pre-Phase 1). Use `git log --oneline` to find it, then diff `src/app/demo/feuillette/` from there to HEAD.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 4 scope.

</deferred>

---

*Phase: 04-rethemes-qa*
*Context gathered: 2026-05-18*
