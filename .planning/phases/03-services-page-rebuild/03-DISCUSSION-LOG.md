# Phase 3: Services Page Rebuild - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 03-services-page-rebuild
**Areas discussed:** Methodology rail, PhoneAgent section, CSS polish plan, Mockup fidelity

---

## Methodology Rail (SVC-08)

| Option | Description | Selected |
|--------|-------------|----------|
| IntersectionObserver | Each step gets an observer; .active class on viewport entry. Simple, consistent with Phase 1 useReveals. | |
| GSAP ScrollTrigger | Sticky sidebar rail — left column pinned, right content scrolls, active step highlighted. GSAP already installed. | ✓ |
| CSS scroll-driven | animation-timeline: scroll(). No JS, narrow browser support. | |

**Sub-question: How pinned/dramatic?**

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky sidebar rail | Left column = step list pinned, right column scrolls. Active step highlights as right content enters view. | ✓ |
| Full-pin like landing PhoneAgent | Entire section pins the viewport, user scrolls through all 6 steps before page continues. | |
| Scroll-scrub progress bar | Horizontal/vertical progress bar fills; steps light up sequentially. | |

**User's choice:** GSAP ScrollTrigger — sticky sidebar rail (left pinned, right scrolls, active step highlighted)
**Notes:** Not a full-pin/immersive lock like the landing PhoneAgent — table-of-contents tracking pattern.

---

## PhoneAgent Section (SVC-05)

| Option | Description | Selected |
|--------|-------------|----------|
| New PhoneAgentExplainer.tsx | Separate simpler component — static 4-step numbered grid. Landing PhoneAgent.tsx stays pure. | ✓ |
| Reuse PhoneAgent with variant prop | Add mode='explainer' prop to existing PhoneAgent.tsx. Fewer files, mixed behaviors. | |

**User's choice:** New `PhoneAgentExplainer.tsx`
**Notes:** Clean separation — landing scroll-driven component untouched.

---

## CSS Polish Plan

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — dedicated CSS plan | One plan for services-specific CSS in globals.css + human checkpoint. Same as Phase 2 02-06. | ✓ |
| No — inline with components | Each component plan handles its own CSS. No separate plan. | |

**User's choice:** Dedicated CSS plan
**Notes:** Last plan in Phase 3, mirrors 02-06 structure including human checkpoint.

---

## Mockup Fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Strict mockup fidelity | Follow services-app.jsx exactly — section order, card counts, content all from mockup. | ✓ |
| Mostly strict, with adjustments | Follow mockup but with specific called-out deviations. | |

**User's choice:** Strict mockup fidelity
**Notes:** services-i18n.jsx is the i18n source of truth.

---

## Claude's Discretion

- GSAP ScrollTrigger scrub factor and snap settings for Methodology rail
- Exact step highlight animation details (transition speed, weight)
- Grid layout specifics and responsive breakpoints — follow mockup
- Whether Methodology GSAP logic is inline or in a dedicated hook

## Deferred Ideas

None.
