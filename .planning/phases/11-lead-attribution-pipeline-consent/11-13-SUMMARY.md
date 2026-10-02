---
phase: 11-lead-attribution-pipeline-consent
plan: 13
subsystem: admin
tags: [leads, admin-ui, status-pill, filters, rls]

requires:
  - phase: 11-09
    provides: setStatusAction, markLostAction, labels and closed lists
provides:
  - /admin/leads page (RLS read of sv_leads_admin_v, filters, 25 per page)
  - AdminNav (Clients / Leads / Entonnoir) wired on /admin
  - StatusPill (reusable by 11-15), LostPanel, LeadFilters, LeadsTable, leads.css
affects: [11-15, 11-16, 11-18]

key-files:
  created:
    - src/components/admin/AdminNav.tsx
    - src/components/admin/leads/StatusPill.tsx
    - src/components/admin/leads/LostPanel.tsx
    - src/components/admin/leads/LeadFilters.tsx
    - src/components/admin/leads/LeadsTable.tsx
    - src/components/admin/leads/leads.css
    - src/components/admin/leads/leadsUi.test.ts
    - src/app/admin/leads/page.tsx
  modified:
    - src/app/admin/page.tsx

key-decisions:
  - "StatusPill derives menu-open from the action state identity, so a result closes the menu without setState in an effect"
  - "Lost panel is positioned absolutely under the pill on desktop and static in the card on mobile"

requirements-completed: [LEAD-07]

duration: 15min
completed: 2026-10-02
---

# Phase 11 Plan 13: Admin Leads List Summary

**Filterable /admin/leads table read through the RLS client, with one-gesture status pill, closed-list lost panel, return badges and a shared admin nav.**

## Tasks
1. AdminNav, StatusPill, LostPanel, leads.css - 4129407
2. /admin/leads page, LeadsTable, LeadFilters, source-guard test - 289b9b5

## Verification
vitest (src/components/admin, src/app/admin, privateShells, priceScope): 6 files, 78 tests pass. `tsc --noEmit`, eslint on touched paths and `npm run build` clean. No remote commands.

## Deviations from Plan
None for logic. The empty-state copy lives in page.tsx rather than the table (the guard test checks the page). Visual and phone-width browser verification not performed (no logged-in session); left to plan 11-18.

## Known Stubs
None.

## Self-Check: PASSED
