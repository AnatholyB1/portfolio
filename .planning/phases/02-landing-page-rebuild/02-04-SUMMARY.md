---
phase: 02-landing-page-rebuild
plan: "04"
subsystem: interactive-sections
tags: [gsap, scrolltrigger, svg-animation, css-animation, contact-form, wave-2]
dependency_graph:
  requires:
    - 02-01 (translations.ts landing namespace — t.landing.phone, t.landing.partners, t.landing.contact)
    - 02-02 (gsap 3.15.0 installed)
  provides:
    - src/components/sections/PhoneAgent.tsx (scroll-pinned section with SVG particle flow)
    - src/components/sections/Partners.tsx (CSS ticker with duplicate array)
    - src/components/sections/ContactSection.tsx (4-field form with n8n webhook)
  affects:
    - future: src/app/page.tsx (imports all 3 components in Wave 4)
tech_stack:
  added: []
  patterns:
    - GSAP ScrollTrigger dynamic import inside useEffect (SSR-safe per D-02)
    - SVG native <animate> elements for particle motion (no GSAP MotionPath needed)
    - CSS @keyframes partnersTicker with duplicate-array seamless loop
    - NEXT_PUBLIC_FORM_URL pattern with fallback + console.warn
key_files:
  created:
    - src/components/sections/PhoneAgent.tsx
    - src/components/sections/Partners.tsx
    - src/components/sections/ContactSection.tsx
  modified: []
decisions:
  - "GSAP ScrollTrigger dynamically imported inside async IIFE in useEffect — never at module top level (SSR Pitfall 1 from RESEARCH.md, D-02)"
  - "trigger.kill() in useEffect cleanup enforces T-02-09 mitigation"
  - "SVG particle uses native <animate attributeName=cy> — no GSAP MotionPath needed"
  - "Partners.tsx is a new component (not a reskin of PartnersBanner.tsx) — separate i18n namespace t.landing.partners vs t.services.partners"
  - "FORM_URL const declared at module level from process.env — window guard on console.warn prevents SSR warning"
metrics:
  duration: "~3 min"
  completed: "2026-05-16"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 0
  files_created: 3
---

# Phase 2 Plan 4: Interactive Sections (PhoneAgent, Partners, ContactSection) Summary

Built three 'use client' section components: PhoneAgent with GSAP ScrollTrigger pin + SVG native animate particle flow, Partners with CSS partnersTicker keyframe and duplicate array seamless loop, and ContactSection with 4-field form (name, email, projectType select, message) POSTing to NEXT_PUBLIC_FORM_URL webhook.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build PhoneAgent.tsx with GSAP ScrollTrigger pin and SVG particle flow | d01a825 | src/components/sections/PhoneAgent.tsx |
| 2 | Build Partners.tsx and ContactSection.tsx | 0a69e36 | src/components/sections/Partners.tsx, src/components/sections/ContactSection.tsx |

## Verification Results

- `npx tsc --noEmit`: 5 pre-existing errors in `src/app/page.tsx` only (Wave 4 scope). Zero errors in any of the 3 new files.
- `grep -c "ScrollTrigger" PhoneAgent.tsx` → 4 (import, registerPlugin, create call, type annotation)
- `grep "pin: true" PhoneAgent.tsx` → confirmed present
- `grep "trigger?.kill" PhoneAgent.tsx` → confirmed present (T-02-09 mitigation)
- `grep 'attributeName="cy"' PhoneAgent.tsx` → confirmed present
- `grep -c 'repeatCount="indefinite"' PhoneAgent.tsx` → 2 (r animation + stroke-opacity animation)
- `grep "250vh" PhoneAgent.tsx` → 2 lines (end offset + minHeight)
- `grep "position: 'sticky'" PhoneAgent.tsx` → confirmed present
- `grep "partnersTicker" Partners.tsx` → confirmed in keyframe definition and animation property
- `grep "translateX(-50%)" Partners.tsx` → confirmed present
- `grep "p.items, ...p.items" Partners.tsx` → confirmed present
- `grep -c "projectType" ContactSection.tsx` → 4 (state, onChange, POST body, select field)
- `grep -c "NEXT_PUBLIC_FORM_URL" ContactSection.tsx` → 3 (const, console.warn, comment context)
- `grep "<select" ContactSection.tsx` → confirmed present

## Deviations from Plan

None — plan executed exactly as written. All three components match the plan's implementation blueprints verbatim.

## Known Stubs

None. All three components consume real i18n keys from `t.landing.*` (populated in plan 02-01). No hardcoded placeholder strings. The FORM_URL fallback to `https://example.com/api/contact` is an intentional operational safety net, not a stub — the console.warn guides the operator to set the env var.

## Threat Flags

No new threat surface beyond what the plan's threat model covers:
- T-02-07 (ContactSection form POST to n8n): accepted — NEXT_PUBLIC_ webhook URL is intentionally public
- T-02-08 (NEXT_PUBLIC_FORM_URL exposure): accepted — no secret at risk
- T-02-09 (ScrollTrigger not cleaned up): mitigated — trigger.kill() in useEffect return

## Self-Check: PASSED

- `src/components/sections/PhoneAgent.tsx` exists and confirmed above
- `src/components/sections/Partners.tsx` exists and confirmed above
- `src/components/sections/ContactSection.tsx` exists and confirmed above
- Commit d01a825 confirmed: `feat(02-04): build PhoneAgent.tsx with GSAP ScrollTrigger pin and SVG particle flow`
- Commit 0a69e36 confirmed: `feat(02-04): build Partners.tsx (CSS ticker) and ContactSection.tsx (4-field form)`
