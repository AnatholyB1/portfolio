---
phase: 11-lead-attribution-pipeline-consent
plan: 15
subsystem: admin
tags: [leads, admin-ui, journal, attribution, erasure, rls]

requires:
  - phase: 11-13
    provides: StatusPill, AdminNav, leads.css
  - phase: 11-09
    provides: correctSourceAction, eraseLeadAction, markReturnSeenAction, labels
provides:
  - /admin/leads/[id] detail page (RLS reads, uuid-validated, notFound otherwise)
  - LeadContacts, LeadJournal (read-only), AttributionCard, CorrectSourceForm, EraseLeadForm, MarkReturnSeen
affects: [11-18]

key-files:
  created:
    - src/app/admin/leads/[id]/page.tsx
    - src/components/admin/leads/LeadContacts.tsx
    - src/components/admin/leads/LeadJournal.tsx
    - src/components/admin/leads/AttributionCard.tsx
    - src/components/admin/leads/CorrectSourceForm.tsx
    - src/components/admin/leads/EraseLeadForm.tsx
    - src/components/admin/leads/MarkReturnSeen.tsx
    - src/components/admin/leads/leadDetail.test.ts
  modified:
    - src/components/admin/leads/leads.css

key-decisions:
  - "MarkReturnSeen submits the action once on mount inside startTransition, rendering nothing"
  - "Erased state is derived from lead.erased_at; correction and erase cards are hidden when erased"

requirements-completed: [LEAD-02, LEAD-03, LEAD-01, LEAD-04]

duration: 15min
completed: 2026-10-02
---

# Phase 11 Plan 15: Admin Lead Detail Summary

**Lead detail page showing frozen source, both attribution touches, all contacts with consent snapshot, a read-only journal, plus source correction and typed-confirmation erasure forms.**

## Tasks
1. Detail page, contacts, journal, attribution, return acknowledgement
2. Correction and erasure forms, source-guard test, CSS

Both tasks landed in one commit, 72bdec4, because the page imports the Task 2 forms and could not typecheck without them.

## Verification
- `tsc --noEmit` clean.
- vitest (privateShells, src/components/admin, src/app/admin, priceScope): 7 files, 83 tests pass.
- eslint on the touched paths is clean.
- `npm run build` succeeds.
- `npm run lint` over the whole repo still reports 10 errors in files this plan did not touch (`no-explicit-any`). None are mine; they were not fixed.
- No remote commands. No browser verification (no admin session); left to 11-18.

## Deviations from Plan
- One combined commit instead of two (see Tasks).

## Known Stubs
None.

## Self-Check: PASSED
