# Phase 4: Rethemes + QA - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 04-rethemes-qa
**Areas discussed:** Mentions légales retheme, /demo retheme scope, i18n audit approach, QA definition

---

## Mentions Légales Retheme

| Option | Description | Selected |
|--------|-------------|----------|
| In-place edit | Swap legacy classes/colors to CSS vars in the existing file. Same Section component, same structure. Safest — content stays untouched, minimal diff. | ✓ |
| Full page rewrite | Rewrite the entire file fresh in Selenium Phase 02 style. Cleaner code, but higher risk of accidentally changing legal content. | |
| Wrapper approach | Keep page.tsx identical, add a global CSS override for mentions-legales. Hacky but zero content risk. | |

**User's choice:** In-place edit
**Notes:** Content (legal text) must be preserved word-for-word. Only colors, fonts, and metadata change.

---

## Mentions Légales Metadata

| Option | Description | Selected |
|--------|-------------|----------|
| Agency positioning | title: 'Mentions Légales \| BRICON ANATHOLY' — description: agency/legal copy, no freelance keywords. Matches QA-03. | ✓ |
| Minimal — just fix freelance words | Keep structure but remove 'freelance', 'Full Stack', 'développeur'. Lighter change. | |
| You decide | Claude picks appropriate agency-positioned metadata. | |

**User's choice:** Agency positioning

---

## /demo Retheme Scope

| Option | Description | Selected |
|--------|-------------|----------|
| CSS vars + fonts only | Replace bg/border/text indigo/navy colors with CSS vars. Keep semantic stock status colors (red/amber/green). | ✓ |
| Full design system alignment | Replace everything including stock colors with design system vars. | |
| Minimal — just remove old bg/border | Only remove the most jarring backgrounds. Don't touch text colors. | |

**User's choice:** CSS vars + fonts only
**Notes:** Semantic stock colors (red/amber/green) are functional UX indicators — they stay. Supabase wiring untouched.

---

## /demo Phone Number Display

| Option | Description | Selected |
|--------|-------------|----------|
| Use --acid | Phone number displays in acid green (#C4F542) — the new brand accent. Consistent with all other primary CTAs. | ✓ |
| Keep neutral white | Phone number in var(--ink) — prominent but not colored. | |
| You decide | Claude picks whatever reads best. | |

**User's choice:** --acid (acid green)

---

## i18n Audit Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Code-diff key coverage | Grep all useLanguage() / t.* usages, cross-reference against *-i18n.jsx key lists. Flag missing or hardcoded strings. | ✓ |
| Runtime locale-switch test | Manual test: switch fr → en → th on both pages, verify no untranslated keys in console. | |
| Both | Code diff then runtime check. | |

**User's choice:** Code-diff key coverage

---

## i18n Audit Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All pages including Navbar/Footer | Audit extends to language switcher, Nav labels, Footer labels — shared across all pages. | ✓ |
| Landing and services content only | Scope limited to I18N-01 and I18N-02 section keys. | |
| You decide | Claude scopes based on what was built in Phase 2/3. | |

**User's choice:** All pages including Navbar/Footer

---

## QA Definition

| Option | Description | Selected |
|--------|-------------|----------|
| Written checklist, human verify | Agent produces 04-QA-CHECKLIST.md. User verifies manually. No automated tests. | ✓ |
| Automated checks where possible | Write Playwright/CSS check scripts for viewport and reduced-motion. | |
| Code review only | Agent reads files and flags code that would fail. No manual testing. | |

**User's choice:** Written checklist, human verify

---

## QA-04 Feuillette Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Git diff check | git diff on src/app/demo/feuillette/ across milestone. Empty output = pass. | ✓ |
| Manual screenshot comparison | Before/after screenshot visual compare. | |
| Code read + assertion | Agent reads feuillette/page.tsx and confirms it matches Phase 0 baseline. | |

**User's choice:** Git diff check

---

## Claude's Discretion

- Exact Tailwind class equivalents for edge-case color usage not explicitly listed
- Whether to consolidate Section component font handling or rely on global cascade
- Order of plans within Phase 4

## Deferred Ideas

None — discussion stayed within Phase 4 scope.
