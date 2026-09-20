---
status: partial
phase: 06-service-pages-template-content
source: [06-VERIFICATION.md]
started: 2026-09-20T18:45:00Z
updated: 2026-09-20T21:10:00Z
---

## Current Test

[awaiting human testing on remaining content-quality items]

## Tests

### 1. Visit /services and each of the 9 /services/[slug] pages in a running dev server (npm run dev)
expected: 9 numbered cards, no price/badge; each page renders problème → fonctionnement → enjeux → preuve sociale → FAQ → double CTA in that order; Branding and Rebranding + Site Premium read as a deliberate, non-competing split and cross-link to each other; the direct-answer block under each H1 reads as a stand-alone, quotable paragraph; FAQ opens/closes and the answer stays in the DOM when collapsed; language switch (EN/TH) shows fully translated content with no French fallback; /services/nexistepas shows the styled 404
result: PARTIAL — verified directly via Chrome browser automation against the live dev server (port 3002) by Claude, not yet reviewed by a human for the qualitative items. Confirmed: 9-card index with no price/badge (✓); Branding/Rebranding cross-link present and boundary text reads as deliberate (✓); FAQ accordion opens/closes correctly, source-visible-when-closed (✓); EN language switch fully translated, no French fallback (✓, TH not spot-checked); `/services/nexistepas` **was broken** (generic Next.js 404 instead of styled page — root cause: Next.js 16 doesn't route a `notFound()` call from `layout.tsx` to that segment's own `not-found.tsx`, a known upstream bug) — **fixed** (`src/app/not-found.tsx` added, `dynamicParams=false` removed, commit `9fb95c6`), re-verified against a fresh production build. Section order and citability of the direct-answer prose still benefit from a human read for tone/quality — that judgment call remains open.
User feedback received separately: `/services` card grid is "trop simple, pas assez visuel" — should surface the problem each service solves + what it does about it, more visually, directly on the index cards (not just on the detail pages). This is real, valid design feedback but is a visual redesign task, not a UAT pass/fail item — tracked below as a gap for follow-up, not blocking phase completion of the shipped content/structure.

## Summary

total: 1
passed: 0
issues: 1
pending: 1
skipped: 0
blocked: 0

## Gaps

### 1. /services index cards are too plain — should surface "problem solved + how" per card, more visually
status: open
found: 2026-09-20 (user review of live dev server)
detail: The individual `/services/[slug]` pages already have a strong "Le problème qu'on résout" pattern (lettered A/B/C cards). The `/services` index cards currently show name/tagline/description/checkmark-feature-list only — no problem framing, no icons, minimal visual differentiation between the 9 cards. User wants the index cards to preview "quel problème + avec quoi" more visually, and asked for design inspiration research.
recommendation: This is a visual/content redesign of `src/app/services/page.tsx`'s card component, not a bug fix. Recommend running a proper design pass (e.g. `/gsd:ui-phase` or a dedicated redesign iteration) rather than an ad hoc change, since it touches the approved 06-UI-SPEC.md design contract. The individual pages' existing lettered-problem-card pattern is the strongest available reference to reuse/adapt for the index, before reaching for external inspiration.

