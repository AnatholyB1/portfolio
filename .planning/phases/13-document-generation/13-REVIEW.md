---
phase: 13-document-generation
reviewed: 2026-10-03T00:00:00Z
depth: standard
files_reviewed: 38
files_reviewed_list:
  - next.config.ts
  - scripts/gen-pdf-fonts.mjs
  - supabase/migrations/20261005000000_sv_documents.sql
  - src/app/admin/projets/[id]/page.tsx
  - src/app/admin/projets/actions.ts
  - src/app/espace-client/actions.ts
  - src/app/espace-client/documents/page.tsx
  - src/app/espace-client/page.tsx
  - src/components/admin/projects/documents/DocumentsPanel.tsx
  - src/components/admin/projects/documents/PreviewIssuePanel.tsx
  - src/components/admin/projects/documents/QuoteForm.tsx
  - src/components/admin/projects/documents/SpecForm.tsx
  - src/components/admin/projects/documents/ContractForm.tsx
  - src/components/admin/projects/documents/AcceptanceForm.tsx
  - src/components/admin/projects/documents/InvoicePreviewForm.tsx
  - src/components/admin/projects/documents/IssuedDocumentsList.tsx
  - src/components/admin/projects/documents/SnapshotPanel.tsx
  - src/components/admin/projects/documents/types.ts
  - src/components/portal/project/ClientNav.tsx
  - src/components/portal/project/DocumentsList.tsx
  - src/lib/documents/dates.ts
  - src/lib/documents/money.ts
  - src/lib/documents/schemas.ts
  - src/lib/documents/snapshot.ts
  - src/lib/documents/steps.ts
  - src/lib/documents/status.ts
  - src/lib/documents/types.ts
  - src/lib/documents/seller.ts
  - src/lib/documents/legalMentions.ts
  - src/lib/documents/registry.ts
  - src/lib/documents/pdf/primitives.tsx
  - src/lib/documents/pdf/setup.ts
  - src/lib/documents/pdf/templates/quote/v1/QuoteV1.tsx
  - src/lib/documents/pdf/templates/contract/v1/ContractV1.tsx
  - src/lib/server/documents/issue.ts
  - src/lib/server/documents/download.ts
  - src/lib/server/documents/prepare.ts
  - src/lib/server/documents/read.ts
  - src/lib/server/documents/render.ts
  - src/lib/server/documents/adminView.ts
  - src/lib/server/mail/documentIssuedEmail.ts
  - src/lib/server/mail/outbox.ts
  - src/lib/server/mail/rules.ts
  - src/lib/server/mail/urls.ts
  - tests/rls/helpers.ts
findings:
  critical: 1
  warning: 8
  info: 5
  total: 14
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-10-03
**Depth:** standard
**Files Reviewed:** 38 (templates other than quote/contract, addressFormat, text, fixtures skimmed only)
**Status:** issues_found

## Summary

The authorization layer is sound. Every admin action calls `requireAdmin()` first, and every client action calls `requireClient()` first. IDs are validated with a UUID regex. Downloads are authorized by an RLS read of the row, and the storage path is resolved only through service_role. `storage_path` is excluded from the authenticated column grant. The snapshot table is admin-only. The hash is computed on the exact uploaded buffer. In the migration, the project row lock serializes head and revision checks, and the append-only triggers cover UPDATE, DELETE and TRUNCATE.

The main defect is the upload-then-RPC ordering in `issue.ts`. It leaves orphan PDFs and makes the same-`documentId` retry fail permanently. Other defects:
- The RPC can abort an issuance because of an outbox constraint, which contradicts D-04.
- The bucket creation is not idempotent about privacy.
- Date and coercion validation is loose for content that ends up in immutable legal PDFs.

## Critical Issues

### CR-01: Upload-before-RPC leaves orphan PDFs and makes retry fail permanently

**File:** `src/lib/server/documents/issue.ts:62-108` (and `src/components/admin/projects/documents/PreviewIssuePanel.tsx:125-141`)
**Issue:** The PDF is uploaded with `upsert:false` before `sv_issue_document` runs. If the RPC then fails, the object stays in the bucket with no DB row. Failure causes include `revision_mismatch`, `replaces_mismatch`, a transient network error, a constraint violation, and the outbox failure described in WR-02. Nothing removes the object.

- **Permanent retry failure.** `PreviewIssuePanel` keeps the same `documentId` after a failed issue. It only regenerates the id on success. On retry, `upload` fails because the path `projectId/documentId.pdf` exists, and no row exists. The code returns `upload_failed`, so the admin sees "issue failed" on every attempt until they reload the page.
- **Unreferenced PDFs.** Each failure leaves an unreferenced PDF in the bucket. It contains client PII and prices, and no cleanup exists. These files are neither listed nor verifiable.
- **Cross-project case.** When `documentId` already exists in another project, the upload succeeds on a new path and the RPC returns `sv_document_already_issued`. The function reports `already_issued` and leaves an orphan.

**Fix:** After any non-success RPC result, except a verified `already_issued` for the same project, remove the object on a best-effort basis. The retry then works.
```ts
if (!rpc.ok) {
  if (rpc.code !== 'sv_document_already_issued') {
    await admin.storage.from(SV_DOCUMENTS_BUCKET).remove([path]).catch(() => undefined);
  }
  ...
}
```
Also treat an existing object with no row as an orphan on the `up.error` branch: remove it and re-upload once. Alternatively, derive the storage path from a server-generated uuid rather than the client-supplied `documentId`. In the UI, regenerate `documentId` after any failed issue. Add a periodic orphan sweep, because a crash between upload and RPC can still leave objects.

## Warnings

### WR-01: Bucket is not forced private if it already exists

**File:** `supabase/migrations/20261005000000_sv_documents.sql:130-132`
**Issue:** `insert ... on conflict (id) do nothing` leaves a pre-existing `sv-documents` bucket untouched. This matters if the bucket was ever created manually or on the branch as public, or with a different MIME or size limit. The migration header says bucket privacy is guaranteed. That guarantee does not hold on a re-run or on a pre-created bucket.
**Fix:**
```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sv-documents','sv-documents',false,10485760,array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
```

### WR-02: Outbox insert inside the RPC can abort the whole issuance (contradicts D-04)

**File:** `supabase/migrations/20261005000000_sv_documents.sql:212-231`
**Issue:** The dedupe key is `'document_issued:' || p_id || ':' || v_email`. That is 15 + 36 + 1 + up to 254 characters, which can exceed the `char_length(dedupe_key) <= 256` check on `sv_mail_outbox`. The key is not clamped here, unlike `dedupeKey.documentIssued` in `rules.ts`. A CHECK violation raises an exception that rolls back the document and snapshot. D-04 says mail problems must never cancel an issuance. Together with CR-01, this also strands the uploaded PDF. Separately, `dedupeKey.documentIssued` is dead code, and the SQL builds the key independently, so the two implementations can drift.
**Fix:** Clamp the key in SQL with `left(..., 256)`. Alternatively, hash the email part: `md5(v_email)`. Optionally wrap the per-member insert in a `begin ... exception when others then null; end` sub-block. Remove or reuse `dedupeKey.documentIssued`.

### WR-03: Date inputs accept impossible dates that are printed in immutable legal PDFs

**File:** `src/lib/documents/schemas.ts:12` and `src/lib/documents/dates.ts:31-34`
**Issue:** `isoDate` only checks `^\d{4}-\d{2}-\d{2}$`. `2026-13-45` passes for `startDate`, `deliveryDate` and `serviceDate`. `formatDateLongFr` then prints `"45 undefined 2026"` (`MONTHS[12]` is undefined) into a contract, PV or invoice. Because the document is write-once, the only fix is a replacement revision.
**Fix:** Validate with a real calendar check, for example:
```ts
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
});
```
Make `formatDateLongFr` throw on an unknown month.

### WR-04: `z.coerce.number()` silently turns empty or null values into 0

**File:** `src/lib/documents/schemas.ts:15,32-33`
**Issue:** `intIn` uses `z.coerce.number()`. The server actions accept `unknown`, so an admin or tampered call with `unitPriceCents: ""` or `null` becomes 0, which is a free line. `depositPercent: null` or `""` becomes 0 instead of the 30 default, because `.default` only applies to `undefined`. Values like `true`, `"1e3"` or `"0x10"` also coerce. These are money fields, so strict parsing is preferable. The client form guards this, but the server comment states it trusts nothing.
**Fix:** Use `z.number().int().min().max()` for amounts and percentages, since the client already sends numbers. If coercion is needed, use `z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)])`.

### WR-05: Client documents page shows signed documents as "À signer" when the bundle fails to load

**File:** `src/app/espace-client/documents/page.tsx:42-44`
**Issue:** `facts = bundle?.facts ?? []`. If `loadProjectBundle` fails or returns null, every contract or quote is shown as `to_sign` and nothing is flagged. The displayed legal status is wrong, with no error. The per-project bundle load is also repeated for each project with documents. The bundle carries far more than the facts that are needed.
**Fix:** When `bundle` is null, omit the status badge or show a neutral "statut indisponible". Alternatively, load only the facts for all projects in one query.

### WR-06: Silent `[]` on document-list failure feeds the issuance decision

**File:** `src/lib/server/documents/read.ts:46-49`, used by `src/lib/server/documents/prepare.ts:28`
**Issue:** `loadProjectDocuments` returns `[]` on a query error. In `prepareDocument`, an empty list yields `revision 1`, `replaces null` and no `signed_no_replace` guard. The database RPC catches the mismatch, so this is not a data-integrity break. The admin gets a misleading "concurrent modification" message. It also hides the failed read from the admin UI, which renders "A émettre" with an empty list.
**Fix:** Return `null` on error, or throw. Make `prepareDocument` return an `error` code and map it to a generic message.

### WR-07: "Verify" shows a tamper verdict on a transport exception

**File:** `src/components/admin/projects/documents/SnapshotPanel.tsx:116-118`
**Issue:** The `catch` branch sets `COPY.verifyKo`. That is the same copy as a hash mismatch, so a transient network or server error reads as "document altered". This is a false integrity alarm on an integrity tool.
**Fix:** Use a separate "vérification impossible" message with `kind: 'error'` in the catch branch.

### WR-08: TOCTOU between step and signature guard and the RPC

**File:** `src/lib/server/documents/prepare.ts` and `supabase/migrations/20261005000000_sv_documents.sql:168-199`
**Issue:** The `wrong_step` and `signed_no_replace` rules (D-05, D-14) are enforced only in application code, before the PDF render. The RPC locks the project row but never checks the facts. A `quote_accepted` or `contract_signed` fact posted between `prepareDocument` and the RPC lets a signed document be replaced. The window is the render and upload time, which is seconds. The "no replacing signed documents" guarantee is therefore not enforced where the other write-once guarantees are.
**Fix:** Add `p_doc_type`-based guard checks inside `sv_issue_document`, after the lock. For example, reject a replacement if a non-revoked signing fact exists for that type, or at minimum if the project step no longer equals the document's step guard.

## Info

### IN-01: `issued_by` (admin user id) is readable by clients

**File:** `supabase/migrations/20261005000000_sv_documents.sql:43` and `src/lib/server/documents/read.ts:20`
**Issue:** The authenticated column grant and `DOCUMENT_COLS` include `issued_by`. Clients can read the admin's auth uuid for their project. The UI does not use it.
**Fix:** Remove `issued_by` from the authenticated grant and use a separate column list for admin reads.

### IN-02: Unreachable `signed_no_replace` branch and duplicated copies of seller identity

**File:** `src/lib/documents/steps.ts:75-79`
**Issue:** For quote and contract, the signing fact moves the project past the step guard. `wrong_step` therefore always fires first, and `signed_no_replace` is only reachable for acceptance if its step logic allows it. The branch is mostly dead code, and the user sees "wrong step" instead of the explicit "signed, cannot replace" message.
**Fix:** Evaluate the signing guard before the step guard.

### IN-03: Seller bank details and SIRET are committed in source

**File:** `src/lib/documents/seller.ts:23-31`
**Issue:** The IBAN and BIC are hardcoded in a module that is also bundled for client components, because it has no `server-only` and is imported by `legalMentions` and forms. These values are printed on invoices, so they are not secret. They do ship in the client bundle and cannot be rotated without a deploy.
**Fix:** Acceptable for v1, but note it. If the identity changes, bump to `SELLER_V2` and keep `v1` for the snapshots already issued.

### IN-04: `Manrope` latin subset may drop glyphs from client names

**File:** `scripts/gen-pdf-fonts.mjs:12-13` and `src/lib/documents/pdf/setup.ts`
**Issue:** A latin-only subset renders tofu or missing glyphs for latin-extended characters in client or project names, for example Polish, Turkish or Vietnamese letters. Input from `stripControlChars` is not restricted to the subset, and no pre-render check exists. The document would be issued with wrong glyphs and without an error.
**Fix:** Add a render-time glyph check, or reject unsupported characters in the schema `text()` helper. Alternatively, include the latin-ext subset.

### IN-05: Minor quality items

**File:** `src/lib/documents/pdf/primitives.tsx:363`, `src/lib/server/mail/outbox.ts`, `tests/rls/helpers.ts:213`
**Issue:**
- `SignatureBox` keys children by label text, so equal labels collide.
- `DOCUMENTS_BUCKET` in the test helper duplicates `SV_DOCUMENTS_BUCKET`.
- `sendOutboxRow` reads and then claims `attempts` in two steps. This is safe, but the `lte('send_after', now)` filter with app clock skew can return `not_claimed`. The cron recovers it.

**Fix:** Use index keys, import the constant, and add a comment on the clock-skew behavior.

---

_Reviewed: 2026-10-03_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
