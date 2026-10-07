---
phase: 17-admin-forecast-dashboard
plan: 08
subsystem: pilotage-ui
tags: [server-components, svg, formatters, admin-nav, vitest]
requires: ["17-07"]
provides:
  - "format.ts: formatSignedEuros (U+2212), formatShareBp, formatDateFr, formatMonthFr"
  - "treasuryChart.ts + TreasuryChart.tsx: accessible inline SVG cash curve with equivalent table"
  - "PilotageKpis.tsx: 7 tiles whose figures link through pilotageHref"
  - "pilotage.css and the Pilotage AdminNav entry"
affects: [17-09, 17-12]
tech-stack:
  added: []
  patterns: ["pure geometry module separate from the SVG component", "display wrapper over money.ts instead of modifying it"]
key-files:
  created:
    - src/components/admin/pilotage/format.ts
    - src/components/admin/pilotage/format.test.ts
    - src/components/admin/pilotage/treasuryChart.ts
    - src/components/admin/pilotage/treasuryChart.test.ts
    - src/components/admin/pilotage/TreasuryChart.tsx
    - src/components/admin/pilotage/PilotageKpis.tsx
    - src/components/admin/pilotage/pilotage.css
  modified:
    - src/components/admin/AdminNav.tsx
key-decisions:
  - "Tile links use next/link with hrefs computed by pilotageHref; non-drill tiles append the tile anchor (#marge-projets)"
  - "Outflow bars are drawn below the zero line, inflow bars above, on one shared scale"
requirements-completed: []
duration: 20min
completed: 2026-10-07
---

# Phase 17 Plan 08: Tiles, cash curve and navigation Summary

Display formatters, a server SVG cash curve with a visible equivalent table, the seven drill-down tiles, the pilotage stylesheet and the Pilotage nav entry.

## Tasks

| Task | Commit |
|------|--------|
| 1 RED tests | 9b6f366 |
| 1 GREEN formatters and chart | 6a3bf9b |
| 2 tiles, css, nav | b3a2672 |

Vitest (pilotage components, linkAudit, priceScope): 24 pass. tsc clean.

## Deviations from Plan

- The tile link text is rendered inside the same anchor as the amount (the plan allowed this) and the anchor uses next/link rather than a bare a element.
- The no-balance warning wraps the message in a paragraph, and the balanceLink slot sits next to it as specified.

## Known Stubs

None. The `#marge-projets` anchor target is rendered by the project table of 17-09 and assembled in 17-12.

## Self-Check: PASSED
