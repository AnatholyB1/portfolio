---
phase: 13-document-generation
plan: 16
subsystem: database
tags: [supabase, migration, production, storage, rls]
requires: [13-07, 13-09]
provides: ["phase-13 schema live in production (sv_project_documents, sv_document_snapshots, sv_issue_document, sv-documents bucket)"]
affects: [13-19, 13-20]
key-files:
  created: []
  modified: []
duration: n/a
completed: 2026-10-03
---

# Phase 13 Plan 16: Production schema apply Summary

The phase-13 migration `20261005000000_sv_documents.sql` is applied to the shared production database. The test branch `sv-rls-p13` is deleted.

## Owner approval

Task 2 (checkpoint:human-verify) was answered by the owner in the main session on 2026-10-03. Verbatim answer: "apply prod (Recommandé)". The orchestrator ran the approved command list itself (12-20 precedent), after Task 1's read-only preflight (see `13-16-PREFLIGHT.md`).

## Commands run (in order, once)

| # | Command | Result |
|---|---------|--------|
| 1 | `sha256sum supabase/migrations/20261005000000_sv_documents.sql` | `b5552c433ef8b8af9e8d3d5e6730e0f954488a045408691c08748f9c4815f7bd`, equal to the hash proven on the branch in 13-07 |
| 2 | `supabase db query --linked -f supabase/migrations/20261005000000_sv_documents.sql` | exit 0, no rows |
| 3 | `supabase migration repair --status applied 20261005000000` | "Migration history repaired" |
| 4 | verification queries (below) | all as expected |
| 5 | `supabase db advisors --linked --type security` | no lint on `sv_project_documents`, `sv_document_snapshots` or `sv_issue_document` (the parsed lint list was empty) |
| 6 | `supabase branches delete sv-rls-p13 --project-ref ubxllsvanurkwkohzxau --yes` | `branches list` now shows only `main` |
| 7 | remove `.env.test.local` | file gone |

## Verification results (production)

- `sv_project_documents` and `sv_document_snapshots`: both exist, `relrowsecurity` = true.
- Bucket `sv-documents`: `public` = false, `file_size_limit` = 10485760, `allowed_mime_types` = {application/pdf}.
- `sv_mail_outbox_event_type_check` and `sv_mail_outbox_template_check`: both present, both contain `document_issued`.
- `sv_issue_document`: exists; `authenticated` execute = false, `service_role` execute = true.
- GECKO_POLICY_COUNT = 24 (unchanged from preflight and 12-20).
- `storage.objects` policy count = 42 (unchanged). The migration creates no storage policy.
- `supabase migration list --linked`: `20261005000000` present locally and remotely.
- No data written to production by this plan. The permanent fixture client "Test E2E Sèvalys" was not touched.

## Deviations

None from the approved list. Note: the first attempt to filter advisors wrote to `/tmp`, which does not exist on this Windows shell; the check was rerun writing to the session scratchpad.

## Follow-ups

- The test branch credentials exposed in the 13-07 transcript are now void (branch deleted).
- Plans 13-19 and 13-20 can rely on the production schema.
