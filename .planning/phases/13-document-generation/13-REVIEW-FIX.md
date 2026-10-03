---
phase: 13-document-generation
fixed_at: 2026-10-03T00:00:00Z
review_path: .planning/phases/13-document-generation/13-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 13: Code Review Fix Report

**Source review:** `.planning/phases/13-document-generation/13-REVIEW.md`
**Scope:** code-only findings (CR-01, WR-03 to WR-07). WR-01, WR-02, WR-08 and Info items were excluded by the caller because they need a production migration.

**Verification:** `tsc --noEmit` clean, eslint clean on touched files, full `vitest run` 1298 passed, 0 failed.

## Fixed Issues

### CR-01: Upload-before-RPC leaves orphan PDFs and makes retry fail permanently
**Commit:** 2a6259e
**Files:** `src/lib/server/documents/issue.ts`, `src/lib/server/documents/issue.test.ts`, `src/components/admin/projects/documents/PreviewIssuePanel.tsx`
**Fix:** The uploaded object is removed on a best-effort basis (service_role, exact path) when the RPC returns any non-success code or throws. It is kept for `sv_document_already_issued`, because the object belongs to the existing row. A failed cleanup never changes the result. `PreviewIssuePanel` regenerates `documentId` after any failed issue, whether the action returned `!ok` or threw. Tests cover cleanup on each RPC failure, cleanup on a thrown RPC, no cleanup on `already_issued`, success or upload failure, and a retry with the same id after cleanup.
**Not done (review suggestions beyond the scope):** the periodic orphan sweep, and the server-generated path. A crash between upload and RPC can still leave an object.
**Status:** fixed

### WR-03: Impossible calendar dates accepted
**Commit:** e30a2b0
**Files:** `src/lib/documents/schemas.ts`, `src/lib/documents/schemas.test.ts`
**Fix:** `isoDate` now round-trips through `Date` in UTC and rejects `2026-13-45`, `2026-02-30`, `2025-02-29` and similar. Leap days are accepted. Tests added.
**Not done:** making `formatDateLongFr` throw on an unknown month. The schema now blocks bad dates upstream.
**Status:** fixed

### WR-04: `z.coerce.number()` turns empty or null values into 0
**Commit:** 381e9bb
**Files:** `src/lib/documents/schemas.ts`, `src/lib/documents/schemas.test.ts`
**Fix:** `intIn` is now strict `z.number().int()`. The forms already send numbers. `""`, `null`, `true`, `"1e3"`, `"0x10"`, numeric strings and NaN are rejected. The `depositPercent` and `validityDays` defaults apply only when the field is `undefined`. Tests added.
**Status:** fixed

### WR-05: Client documents page shows "A signer" when the bundle fails to load
**Commit:** fe77c68
**Files:** `src/app/espace-client/documents/page.tsx`, `src/components/portal/project/DocumentsList.tsx`, `src/lib/projects/copy.ts`, `src/components/portal/project/documentsPage.test.ts`
**Fix:** When the bundle is null, the item status is `null` and the badge reads "Statut indisponible" (new copy `statusUnavailable`). `DocumentListItem.status` is now `DocumentStatus | null`. A source-guard test was added, following the existing test style for these components.
**Not done:** the per-project bundle load is not replaced by a single facts query, which is a performance point.
**Status:** fixed

### WR-06: Silent `[]` on document-list failure feeds the issuance decision
**Commit:** 9011413
**Files:** `src/lib/server/documents/read.ts`, `src/lib/server/documents/prepare.ts`, plus their tests
**Fix:** `loadProjectDocuments` throws a new `DocumentsLoadError` on a query error or exception. `prepareDocument` catches it, both for the list and for the prerequisite snapshot read, and returns `{ ok:false, code:'load_failed' }`. The action maps that code to the generic message and never decides on an empty list. Other errors are rethrown. Tests added.
**Note (behaviour change, requires human check):** `loadAdminDocumentsView`, used by the admin project page, now propagates the error. The page falls into the Next error boundary instead of rendering "A emettre" with an empty list. This is intended, but confirm that the UX is acceptable. `loadDocumentsForProjects`, the client list, still returns `[]` on error and was left as is.
**Status:** fixed: requires human verification

### WR-07: "Verify" shows a tamper verdict on a transport exception
**Commit:** b9f508e
**Files:** `src/components/admin/projects/documents/SnapshotPanel.tsx`, `src/lib/projects/copy.ts`, `src/components/admin/projects/documentsAdminUi.test.ts`
**Fix:** The `catch` branch now uses the new `verifyFailed` copy ("Vérification impossible pour le moment...") with `kind: 'error'`. A source-guard test was added.
**Status:** fixed

## Skipped / left documented (out of scope by instruction)

- WR-01: bucket privacy on conflict. Needs a production migration.
- WR-02: outbox dedupe key length inside the RPC. Needs a production migration.
- WR-08: TOCTOU between the guard and the RPC. Needs a production migration.
- IN-01 to IN-05: not addressed.

---

_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
