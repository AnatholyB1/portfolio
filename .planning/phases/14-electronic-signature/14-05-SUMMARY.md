---
phase: 14-electronic-signature
plan: 05
subsystem: testing
tags: [supabase, rls, vitest, branch, signature]
requires: [14-04]
provides:
  - Supabase test branch sv-rls-p14 (ref pkhyfhvjahyfvfgzramr) carrying the phase-14 schema
  - RLS helpers issueSignableDocument, completeSignatory, testCodeHmac, dbQuery, signTestDocument, SIGNATURE_TEST_SECRET
  - PREVIEW_MODE decision for 14-13
affects: [14-11, 14-12, 14-13, 14-18]
key-files:
  modified: [tests/rls/helpers.ts]
requirements-completed: [SIGN-01, SIGN-03, SIGN-04]
completed: 2026-10-04
---

# Phase 14 Plan 05: Test branch, iframe spike and signature RLS helpers Summary

Branch `sv-rls-p14` carries the phase-10..14 schema, the iframe spike is settled with real headers, and the signature helpers are in. `npm run test:rls` is green (15 files, 153 tests) and `tsc --noEmit` is clean.

## Branch and migration

**Task 1 (read-only):** `supabase branches list` returned only `main` (FUNCTIONS_DEPLOYED). `.env.test.local` did not exist. NEW BRANCH NEEDED.

**Task 2 owner decision (verbatim):** **"Créer la branche sv-rls-p14 (Recommended)"** (option create), 2026-10-04. The branch bills hourly until deleted in 14-18.

**Task 3:**
- `supabase branches create sv-rls-p14` -> ref pkhyfhvjahyfvfgzramr, id 592328e2-b542-466a-982c-119fcab7b449, ACTIVE_HEALTHY.
- `.env.test.local` written (gitignored, `git check-ignore` prints it; contains no production ref; not committed). `SV_TEST_DB_URL` is the session pooler (port 5432). Credentials were redirected to a scratch file and never printed.
- The branch already had the phase-13 schema (sv_project_documents present, sv_signature_events absent).
- `db push` refused on remote-only history versions. Branch-only repair as in 13-07: reverted 9 remote-only versions, marked 20260920000000 and 20260921000000 applied, dry-run listed only 20261006000000, then the real push applied it. No repair was made for the phase-14 migration itself.
- Migration file sha256 (for 14-18): `200e082dfb3e3b60a1c362f54a52ffd612dee16a415ad498d4e9127091d69532`. Applied unchanged, no SQL fix.
- Verification on the branch:
  - to_regclass not null for sv_signature_events, sv_signature_codes, sv_acceptance_submissions, sv_acceptance_responses, sv_document_signatures, sv_document_seals (all six).
  - `has_table_privilege('service_role','public.sv_signature_events','insert')` = false.
  - sv_mail_outbox: exactly two check constraints (event_type and template) contain document_signed; both list document_signed, document_signed_admin, acceptance_refused.
  - Storage policies before and after the push are identical (5): Admins can delete gecko menu images, Admins can upload gecko menu images, Public can view gecko menu images, product_images_select_all, sellerie_preview_product_images_select_all.
- Branch-only fixture: `grant select, insert, update, delete on public.gecko_admins to service_role` (same as 13-07).
- `npm run test:rls` on the migrated branch: 15 files, 153 tests passed.
- Only `branches list/create/get` touched the production ref; no DDL or data change on production.

## Iframe spike (D-02)

Signed URL of a real issued test document (`createSignedUrl(path, 300)`, no download option), plain GET, status 200:

| Header | Value |
|--------|-------|
| content-type | application/pdf |
| content-disposition | (absent) |
| x-frame-options | (absent) |
| content-security-policy | (absent) |
| cache-control | (absent) |

Nothing forbids framing and the document is served inline. The signed URL itself was not recorded. Safari iOS behaviour stays a manual check in 14-18.

PREVIEW_MODE: signed_url

## Helpers (tests/rls/helpers.ts)

Added: `SIGNATURE_TEST_SECRET` (and `signatureTestSecret()`), `testCodeHmac`, `dbQuery` (refuses the production ref), `completeSignatory`, `issueSignableDocument`, `signTestDocument`. `issueTestDocument` gained an optional `snapshot` (default unchanged, `{ test: true }`). `sv_issue_document` has no fact prerequisite, so `issueSignableDocument` posts no facts. A throwaway test (deleted, not committed) proved the full flow on the branch: quote signed (ok true, already_signed false) and acceptance with 3 delivered answers signed. cleanup() unchanged (tracked ids only). Commit 9a50715.

## Deviations from Plan

**1. [Rule 3 - Blocking] Secret variable name** - `vitest.rls.config.ts` only loads `SV_TEST_`-prefixed variables, so `SV_SIGNATURE_CODE_SECRET` never reached the tests. The branch file uses `SV_TEST_SIGNATURE_CODE_SECRET`; the helper reads it and falls back to `SV_SIGNATURE_CODE_SECRET`. Config untouched. Plans 14-11 and 14-12 must use the helper, not `process.env` directly.

**2. [Operational] Masked secret key** - `branches get -o env` returns `SUPABASE_DEFAULT_KEY` masked (sb_secret_...), which gave "Invalid API key". The legacy `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` are used for `SV_TEST_SECRET_KEY` and `SV_TEST_PUBLISHABLE_KEY`.

**3. [Operational] Auth rate limit** - the first full run right after provisioning hit "Request rate limit reached" on sign-in; a rerun after a pause was green.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
Commit 9a50715 present; helpers.ts exports signTestDocument, testCodeHmac, dbQuery (count 3); `.env.test.local` ignored and untracked; spike test file removed.
