---
phase: 13-document-generation
plan: 07
subsystem: testing
tags: [supabase, rls, vitest, branch, documents]
requires: [13-02]
provides:
  - Supabase test branch sv-rls-p13 (ref soygoebzenroyoszjaky) carrying the phase-13 schema
  - RLS helper issueTestDocument and DOCUMENTS_BUCKET
affects: [13-09, 13-16]
key-files:
  modified: [tests/rls/helpers.ts]
requirements-completed: [DOC-02, DOC-03]
completed: 2026-10-03
---

# Phase 13 Plan 07: Test branch and document RLS helpers Summary

Branch `sv-rls-p13` carries the phase-10/11/12/13 schema, `issueTestDocument` is in the helpers, and `npm run test:rls` is green (14 files, 130 tests).

## Task 1: branch check (read-only)
`supabase branches list` returned only `main` (FUNCTIONS_DEPLOYED). `.env.test.local` did not exist. NEW BRANCH NEEDED.

## Task 2: owner decision (verbatim)
Owner answer: **"Créer sv-rls-p13 (Recommandé)"** (option create), 2026-10-03. Bills hourly until deleted in 13-16.

## Task 3: provisioning, migration, helpers, baseline
- `supabase branches create sv-rls-p13` -> ref soygoebzenroyoszjaky, id 57ecbdcc-250b-43dc-8c74-1a6fc325440e, status FUNCTIONS_DEPLOYED / ACTIVE_HEALTHY.
- `.env.test.local` written (gitignored: `git check-ignore` prints it; URL does not contain the prod ref; not committed). `SV_TEST_DB_URL` uses the session pooler (aws-1-eu-west-3.pooler.supabase.com:5432).
- Branch already had phase-12 schema (sv_projects, sv_mail_outbox present; sv_project_documents absent).
- `db push` refused on remote-only history versions. Branch-only repair, same as 12-05: reverted 9 remote-only versions, marked 20260920000000 and 20260921000000 applied, dry-run listed only 20261005000000, then real `db push` applied it. Repair was done before the push only for unrelated pre-existing versions, never for the phase-13 migration.
- Migration file sha256 (for 13-16): `b5552c433ef8b8af9e8d3d5e6730e0f954488a045408691c08748f9c4815f7bd` (supabase/migrations/20261005000000_sv_documents.sql). Applied unchanged (no SQL fix needed).
- Verification: to_regclass sv_project_documents and sv_document_snapshots both not null. Bucket `sv-documents`: public=false, file_size_limit=10485760, allowed_mime_types={application/pdf}. sv_mail_outbox has exactly one event_type check and one template check, both containing document_issued. Storage policies unchanged (5, all bucket-scoped, same as phase 12): Admins can delete gecko menu images, Admins can upload gecko menu images, Public can view gecko menu images, product_images_select_all, sellerie_preview_product_images_select_all.
- Branch-only fixture: `grant select, insert, update, delete on public.gecko_admins to service_role`.
- Helpers: `DOCUMENTS_BUCKET`, `issueTestDocument(projectId, opts)` (real storage upload with upsert false + sv_issue_document RPC). cleanup() unchanged (tolerant, tracked ids only). Commit dc8c995.
- `npm run test:rls`: 14 files, 130 tests passed (phase 10/11/12 suites green with the migration applied). `tsc --noEmit` clean.
- Only `branches list/create/get` touched the production ref; no DDL or data change on prod.

## Deviations from Plan
**1. [Operational] Credential exposure in tool output** — a `branches get -o json` poll printed the throwaway branch connection strings (including its DB password) into the executor transcript. The branch is throwaway and deleted in 13-16; nothing was written to a committed file. Consider rotating or simply deleting the branch at 13-16.

**2. [Operational] Branch created via CLI** — `supabase branches create` was used directly (phase 12 used the MCP); equivalent result.

## Known Stubs
None.

## Self-Check: PASSED
Commit dc8c995 present; helpers.ts exports issueTestDocument (count 1); `.env.test.local` ignored and untracked.
