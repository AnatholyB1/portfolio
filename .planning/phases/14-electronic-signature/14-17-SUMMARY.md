---
phase: 14-electronic-signature
plan: 17
subsystem: admin-signature-ui
tags: [signature, admin, ui, audit]
requires: [14-10, 14-14]
provides:
  - SignaturePanel (signature block, audit export, integrity check, trail journal)
  - Admin document card wired to signature views (status line, frozen Remplacer, PV refusal notice, manual-fact notice)
key-files:
  created:
    - src/components/admin/projects/documents/SignaturePanel.tsx
  modified:
    - src/components/admin/projects/documents/IssuedDocumentsList.tsx
    - src/components/admin/projects/documents/DocumentsPanel.tsx
    - src/components/admin/projects/PostFactForm.tsx
    - src/components/admin/projects/projects.css
    - src/app/admin/projets/[id]/page.tsx
    - src/components/admin/projects/documentsAdminUi.test.ts
    - src/components/admin/projects/projectSheetUi.test.ts
requirements: [SIGN-03, SIGN-04, SIGN-05]
metrics:
  completed: 2026-10-04
---

# Phase 14 Plan 17: Admin signature card Summary

Admin document card now shows "Signé par … · IP …", a Signature block with copyable hashes, JSON audit-trail export (Blob download), in-DB integrity check (non-green result, aria-live), original/sealed downloads, resume finalization, and the trail journal; Remplacer is frozen once signed and manual-fact buttons carry the e-signature notice.

## Tasks

1. SignaturePanel and CSS: 1f547da
2. Card wiring (list, panel, fact form, page): 544a7e9
3. Static UI tests: see git log (`test(14-17)`)

## Decisions

- Signature views are passed to client components as a plain `Record` (a `Map` does not cross the server/client boundary).
- Signed-fact set derived on the page from documents having a signature, mapped through `SIGNING_FACT`; PostFactForm shows the notice when the selected fact is in that set (buttons stay usable, D-16).
- Frozen Remplacer: disabled when the head revision has a signature; refused-but-unsigned PV stays enabled with the refusal notice.

## Deviations from Plan

None. All Surface D sentences come from `PROJECT_COPY.signature.admin` (14-10); only the document `reference` prop is a derived label (`{docType}-v{revision}`) since the list view has no reference field, and it is used only as a data attribute.

## Verification

`tsc --noEmit` clean. `vitest run src/components/admin` 50 passed. Full `vitest run`: 1520 passed, 3 failed, all in `src/proxy.test.ts` (static contract on `src/proxy.ts`). These are unrelated to this plan (proxy.ts untouched; it has uncommitted edits in the main checkout) and are logged as out of scope. RLS suites not run.

## Known Stubs

None.

## Self-Check: PASSED
