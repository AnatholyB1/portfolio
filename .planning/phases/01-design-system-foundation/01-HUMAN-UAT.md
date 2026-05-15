---
status: partial
phase: 01-design-system-foundation
source: [01-VERIFICATION.md]
started: 2026-05-15T22:00:00Z
updated: 2026-05-15T22:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Background color renders correctly
expected: All pages render with near-black background matching #0A0B0C (not pure black, not white/gray)
result: [pending]

### 2. Custom cursor — dot and ring movement
expected: Small white dot (8px) tracks instantly; white ring (40px) follows with slight lag; both invert color with mix-blend-mode:difference effect over light content
result: [pending]

### 3. Custom cursor — hover expansion
expected: On hover over any link or button, ring expands to ~56px and dot shrinks to ~3px, both transitions smooth
result: [pending]

### 4. Custom cursor — hidden at mobile width
expected: Cursor dot and ring are not visible when browser is resized to 900px or less
result: [pending]

### 5. Cinema intro — first visit
expected: After clearing localStorage, full-screen overlay appears with pulsing acid dot, 'BRICON·ANATHOLY.' label, and progress bar; overlay fades out after ~1.7 seconds; page content visible after dismissal
result: [pending]

### 6. Cinema intro — return visit
expected: Reloading without clearing localStorage skips the overlay entirely
result: [pending]

### 7. Scroll reveal — elements animate on scroll
expected: Elements with data-reveal attribute start invisible (opacity:0, shifted down 24px) and animate in when they enter the viewport (Phase 2 will be first consumer — verify once Phase 2 adds data-reveal attributes)
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
