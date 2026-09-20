---
status: resolved
phase: 06-service-pages-template-content
source: [06-VERIFICATION.md]
started: 2026-09-20T18:45:00Z
updated: 2026-09-20T21:45:00Z
---

## Current Test

None — user reviewed the live site (including the 404 fix, index-card redesign, and fonctionnement icon grid) and approved. Phase 6 closed.

## Tests

### 1. Visit /services and each of the 9 /services/[slug] pages in a running dev server (npm run dev)
expected: 9 numbered cards, no price/badge; each page renders problème → fonctionnement → enjeux → preuve sociale → FAQ → double CTA in that order; Branding and Rebranding + Site Premium read as a deliberate, non-competing split and cross-link to each other; the direct-answer block under each H1 reads as a stand-alone, quotable paragraph; FAQ opens/closes and the answer stays in the DOM when collapsed; language switch (EN/TH) shows fully translated content with no French fallback; /services/nexistepas shows the styled 404
result: PASSED — approved by the user 2026-09-20 after live review, following three rounds of fixes/iteration during the UAT pass: (1) `/services/nexistepas` 404 bug found and fixed (`9fb95c6`, `9fb95c6`), (2) index cards redesigned to surface problem-solved chips (`cfb9277`), (3) "Comment ça marche" redesigned as a per-feature icon grid with lucide-react icons and reveal animation (`e498303`). All 9 pages, the index, FAQ, EN/TH translation, and the Branding/Rebranding boundary were confirmed working across this iteration.

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

### 1. /services index cards are too plain — should surface "problem solved + how" per card, more visually
status: fixed
resolution: Added up to 2 problem chips per card (letter badge + short problem title, reusing `copy.problems` and the existing `.pn` warm-badge visual language from the detail pages), replacing the plain description paragraph. No new content authored, no new design tokens. Commit `cfb9277`. Verified: 70/70 tests, tsc clean, production build still 9× static SSG. Screenshot-checked live on port 3002.
found: 2026-09-20 (user review of live dev server)
detail: The individual `/services/[slug]` pages already have a strong "Le problème qu'on résout" pattern (lettered A/B/C cards). The `/services` index cards currently show name/tagline/description/checkmark-feature-list only — no problem framing, no icons, minimal visual differentiation between the 9 cards. User wants the index cards to preview "quel problème + avec quoi" more visually, and asked for design inspiration research.
recommendation: This is a visual/content redesign of `src/app/services/page.tsx`'s card component, not a bug fix. Recommend running a proper design pass (e.g. `/gsd:ui-phase` or a dedicated redesign iteration) rather than an ad hoc change, since it touches the approved 06-UI-SPEC.md design contract. The individual pages' existing lettered-problem-card pattern is the strongest available reference to reuse/adapt for the index, before reaching for external inspiration.

