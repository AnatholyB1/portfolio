---
phase: 14-electronic-signature
plan: 15
subsystem: client-portal
tags: [signature, portal, documents, sealed-download]
requires: [14-07, 14-08, 14-10]
provides:
  - sealedDocumentDownloadAction
  - Documents tab signing entry and sealed download
  - Awaiting-signature notice on the project page
affects: [src/app/espace-client, src/components/portal/project]
key-files:
  modified:
    - src/app/espace-client/actions.ts
    - src/app/espace-client/actions.test.ts
    - src/components/portal/project/DocumentsList.tsx
    - src/app/espace-client/documents/page.tsx
    - src/app/espace-client/page.tsx
    - src/components/portal/project/documentsPage.test.ts
    - src/components/portal/project/portalPage.test.ts
decisions:
  - "Sealed download is used only when status is signed AND a signature row exists; a manually-posted signed fact (no e-signature) falls back to the original download."
requirements: [SIGN-01, SIGN-04]
completed: 2026-10-04
---

# Phase 14 Plan 15: Portal Documents tab signing surface Summary

The Documents tab now leads to signing ("Lire et signer" link to /espace-client/documents/{id}/signer) and serves the hash-verified sealed PDF once signed; the project page shows an awaiting-signature notice.

## Tasks

1. Sealed download action (commit 1f1d642): `sealedDocumentDownloadAction` does requireClient, UUID check, then `createSealedDownloadUrl` with actor `{kind:'client', id, ip: requestIp(headers)}`. All failures (no_access, bad id, not_found, hash_mismatch, error) return the single `signature.success.downloadFailed` message with no URL. 4 new tests (RED confirmed before implementation).
2. Documents tab and project page (commit 18d537d): `DocumentListItem.signedAt`, `getSealedDownloadUrl` prop, `Lire et signer` ghost Link (PenLine) for to_sign quote/contract/acceptance rows, "Signé le {date}" with ShieldCheck, signed download label "Télécharger le document signé". The documents page reads sv_document_signatures through the RLS client. The project page computes `awaitingSignature` from head documents via `withStatuses` with the bundle facts and renders the notice plus "Aller aux documents" link. Static tests updated deliberately.

## Verification

`rtk vitest run src/components/portal src/app/espace-client`: 60 passed. `rtk tsc --noEmit`: clean. RLS suites not run (orchestrator owns them).

## Deviations from Plan

None material. Copy lives under `PROJECT_COPY.signature.documentsTab` (and `signature.success.downloadFailed` for the error), as already defined by 14-10. The notice is placed inside the current-step card (under WhoWaits) to keep the section order guarded by portalPage.test.ts.

## Known Stubs

None.

## Self-Check: PASSED
