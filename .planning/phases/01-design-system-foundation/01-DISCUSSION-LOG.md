# Phase 1: Design System Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-15
**Phase:** 01-design-system-foundation
**Areas discussed:** Font loading strategy, Cinema intro content, Cursor hover states, CSS token set scope

---

## Font Loading Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| next/font/google | Fonts served locally by Next.js — zero FOUIT, no external CDN | ✓ |
| CSS @import in globals.css | One-line import from Google CDN — simpler but FOUIT risk | |

**User's choice:** `next/font/google` for all three fonts.

| Option | Description | Selected |
|--------|-------------|----------|
| Variable — full range | One file covers 300–800 + opsz axis. No weight decision needed. | ✓ |
| Static subset: 400/500/700 | Saves ~40KB, less flexibility | |

**User's choice:** Bricolage Grotesque as variable font (full range + opsz). Manrope 300–700, JetBrains Mono 300–500 remain as explicit weight arrays.

---

## Cinema Intro Content

| Option | Description | Selected |
|--------|-------------|----------|
| SELENIUM. | Agency brand name from mockup identity section | |
| BRICON·ANATHOLY. | Legal entity name, matches domain | ✓ |
| No label — just acid dot | Pure minimal, no text | |

**User's choice:** Label text = "BRICON·ANATHOLY."

| Option | Description | Selected |
|--------|-------------|----------|
| No skip — auto-dismiss only | 1700ms then gone. Matches mockup exactly. | ✓ |
| Click or keypress to skip | Any click or Escape/Space dismisses early | |

**User's choice:** No skip — auto-dismiss at 1700ms.

---

## Cursor Hover States

| Option | Description | Selected |
|--------|-------------|----------|
| Ring expands + dot shrinks | Ring grows ~40→56px, dot shrinks ~8→3px on hover | ✓ |
| Dot scales up + acid fill | Dot grows to 20px and fills acid color | |
| mix-blend-mode everywhere | No separate hover state — contrast effect handles it | |

**User's choice:** Ring expands + dot shrinks.

| Option | Description | Selected |
|--------|-------------|----------|
| Both dot and ring | Full inversion effect on both elements | ✓ |
| Dot only | Ring stays transparent/bordered | |

**User's choice:** `mix-blend-mode: difference` on both dot and ring.

---

## CSS Token Set Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All 9 tokens now | 5 core + 4 extended from mockup, established immediately | ✓ |
| 5 core tokens only | Strictly DS-01, extended added later | |

**User's choice:** All 9 tokens established in Phase 1.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep Tailwind + wire CSS vars into it | Extend tailwind.config.js with CSS var aliases | ✓ |
| Pure CSS vars (no Tailwind tokens) | Write Phase 2/3 with CSS var() directly | |

**User's choice:** Keep Tailwind, extend config with CSS var color tokens.

---

## Deferred Ideas

None.
