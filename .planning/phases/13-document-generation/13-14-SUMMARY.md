---
phase: 13-document-generation
plan: 14
subsystem: client-portal
tags: [documents, portal, rls, signed-download]
requires: [13-10, 13-04, 13-03]
provides: [documentDownloadAction, DocumentsList, /espace-client/documents]
affects: [ClientNav, espace-client page]
key-files:
  created:
    - src/app/espace-client/documents/page.tsx
    - src/components/portal/project/DocumentsList.tsx
    - src/components/portal/project/documentsPage.test.ts
  modified:
    - src/app/espace-client/actions.ts
    - src/app/espace-client/actions.test.ts
    - src/app/espace-client/page.tsx
    - src/components/portal/project/ClientNav.tsx
    - src/components/portal/project/project.css
    - src/components/portal/project/portalPage.test.ts
decisions:
  - Projects with documents are grouped on one page (no ProjectSelector); h2 per project only when more than one.
metrics:
  tasks: 2
  completed: 2026-10-03
---

# Phase 13 Plan 14: Client portal Documents tab Summary

Client Documents tab at /espace-client/documents: RLS-only reads, derived statuses, replaced versions shown in retrait, and on-demand 120 s signed downloads via a server action.

## What was built
- `documentDownloadAction`: requireClient first, uuid check, `createDocumentDownloadUrl(ctx.supabase, id)`, generic French failure message. Four new test cases.
- `DocumentsList` client component: table with type, issue date, version, status badge (Check icon for Signé/Payé), replaced rows with "Remplacé par la version n du date", download button using `window.location.assign`; URL never rendered. No amount, hash or template version.
- Documents page (RSC): NoAccess guard, per-project `sortForDisplay(withStatuses(...))` using facts from `loadProjectBundle`, empty state card.
- `ClientNav` takes `current` ('projet' | 'documents'), labels from `PROJECT_COPY.documents.nav`, Paiements stays disabled.
- Tests: portalPage.test.ts updated deliberately (nav assertion, DocumentsList in no-price list); new documentsPage.test.ts source guards.

## Verification
`vitest run src/components/portal src/app`: 299 passed, 0 failed. `tsc --noEmit` clean.

## Deviations from Plan
None. One cosmetic note: page.tsx keeps `loadDocumentsForProjects(ctx.supabase, projectIds)` on one line so the source guard matches.

## Self-Check: PASSED
Commits 7e0e4b0 and a8aa875 exist; all created files present.
