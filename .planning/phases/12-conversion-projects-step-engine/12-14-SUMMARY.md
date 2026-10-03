---
phase: 12-conversion-projects-step-engine
plan: 14
subsystem: admin-leads-ui
tags: [conversion, dialog, siret, admin]
requires: [12-03, 12-06, 12-07]
provides:
  - CompanyLookupFields shared SIRET lookup component
  - ConvertDialog on the lead sheet
  - siretExistsAction
affects: [src/components/admin/InviteForm.tsx, src/app/admin/leads/[id]/page.tsx]
tech-stack:
  added: []
  patterns: [native dialog + useActionState, shared lookup component with callbacks]
key-files:
  created:
    - src/components/admin/CompanyLookupFields.tsx
    - src/components/admin/leads/ConvertDialog.tsx
    - src/components/admin/leads/convertUi.test.ts
  modified:
    - src/components/admin/InviteForm.tsx
    - src/components/admin/leads/leads.css
    - src/app/admin/leads/actions.ts
    - src/app/admin/leads/[id]/page.tsx
key-decisions:
  - "CompanyLookupFields takes sourceFieldName (default company_source); ConvertDialog passes companySource as convertLeadAction expects"
  - "ConvertDialog stays mounted once converted (trigger hidden) so the success banner survives revalidation"
requirements-completed: [PORTAL-01]
duration: ~20min
completed: 2026-10-03
---

# Phase 12 Plan 14: Lead conversion UI Summary

One-click "Convertir en client" dialog on the lead sheet, reusing an SIRET lookup extracted from InviteForm into a shared CompanyLookupFields component.

## Commits
- 5911cc3 refactor: extract CompanyLookupFields, InviteForm refactored
- 6b81fd7 feat: ConvertDialog, siretExistsAction, lead page integration
- 9b9bd85 test: convertUi guard test

## Deviations from Plan

**1. [Rule 3 - Blocking] Extra props on CompanyLookupFields**
Added `siretError`, `sourceFieldName` and `onCompanyName` beyond the interface block. InviteForm needs the name prefill and the invalid-SIRET error; the dialog needs the `companySource` field name.

**2. Layout tweak in InviteForm**
The SIRET field now sits above the name/e-mail grid instead of in the same 2-column grid, since the lookup block is one component. Behaviour is unchanged.

**3. Added `.pt-dialog` CSS in leads.css** (no dialog style existed).

**4. Converted banner / badge split**
The page renders the "Client converti" badge and "Voir le projet" link from PROJECT_COPY. ConvertDialog is still mounted when converted so the post-success banner is not lost on revalidate.

## Known limitations
- The "existing SIRET" warning is cleared when a new lookup starts and set when one resolves; it is not cleared if the SIRET is edited to an incomplete value.
- Default offer is taken from the first string in the latest contact payload that matches an offer slug (none if absent).

## Verification
`tsc --noEmit` clean; `rtk vitest run src/components/admin src/app/admin` 102 passed. No browser check done.

STATE.md / ROADMAP.md updates were not performed in this run.

## Self-Check: PASSED
