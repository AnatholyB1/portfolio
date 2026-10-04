---
phase: 14-electronic-signature
plan: 14
subsystem: admin-signature-server
tags: [signature, admin, audit, server-actions]
requires: [14-07, 14-08, 14-09, 14-10]
provides:
  - loadSignatureViews(rls, projectId)
  - exportSignatureTrailAction, verifySignatureChainAction, adminSealedDownloadAction, adminResumeFinalizationAction
  - SignatureView, ExportTrailResult, ChainCheckResult, ResumeResult types
key-files:
  created:
    - src/lib/server/signature/adminView.ts
    - src/lib/server/signature/adminView.test.ts
  modified:
    - src/components/admin/projects/documents/types.ts
    - src/app/admin/projets/actions.ts
    - src/app/admin/projets/documents.actions.test.ts
    - src/app/admin/projets/[id]/page.tsx
    - src/lib/server/documents/issue.ts
    - src/lib/server/documents/issue.test.ts
requirements: [SIGN-03, SIGN-04, SIGN-05]
metrics:
  completed: 2026-10-04
---

# Phase 14 Plan 14: Admin signature server layer Summary

Admin audit server layer: per-document signature view loader (events, signer, seal, reserves, refusals, pending finalization), four requireAdmin-guarded actions (self-verified JSON export, in-DB chain check, sealed download, resume finalization) and mapping of the DB freeze code `sv_document_signed` to the frozen-document message.

## Tasks

1. View types and loader: commit cdc951c
2. Admin actions and freeze code mapping: see git log (`feat(14-14): admin signature audit actions...`)

## Deviations from Plan

**1. [Rule 3 - Blocking] Wired new actions into admin project page**
- Extending `DocumentActions` broke type-checking in `src/app/admin/projets/[id]/page.tsx`; added the four actions to the `actions` prop there. The UI that consumes them is left to a later plan.

**2. Orphan cleanup** already ran for every non-`already_issued` RPC failure, so only the case mapping and a test were needed.

## Verification

`vitest run src/app/admin/projets src/lib/server/documents src/lib/server/signature`: 192 passed. `tsc --noEmit` clean. RLS suites not run (orchestrator owns the test branch).

## Known Stubs

None. The four new `DocumentActions` entries are wired but not yet rendered by UI components.

## Self-Check: PASSED
