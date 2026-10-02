---
phase: 12-conversion-projects-step-engine
plan: 05
subsystem: testing
tags: [supabase, rls, vitest, branch]
requires: [12-01]
provides:
  - Supabase test branch sv-rls-p12 (ref lktypaxkrrqzizwxpafo) carrying the phase-12 schema
  - RLS helpers makeProject, postFact, makeConvertibleLead, tolerant cleanup
affects: [12-11, 12-12, 12-20]
key-files:
  modified: [tests/rls/helpers.ts, tests/rls/leads.rls.test.ts]
requirements-completed: [PORTAL-04, PORTAL-05, MAIL-02]
completed: 2026-10-03
---

# Phase 12 Plan 05: Test branch and RLS helpers Summary

Branch `sv-rls-p12` carries the phase-10/11/12 schema, helpers for projects and facts are in place, and `npm run test:rls` is green (8 files, 84 tests).

## Task 1: branch check
`sv-rls-p11` (ywdfkwysihglnogazybs) no longer exists (deleted in 11-17). NEW BRANCH NEEDED. Only read-only listing was used.

## Task 2: owner decision (verbatim)
Owner answer: **"Créer sv-rls-p12 (Recommended)"** (create), 2026-10-03. The orchestrator created the branch through the Supabase MCP: id 0cf37282-10b9-4290-848d-bdba397592b5, ref lktypaxkrrqzizwxpafo, parent ubxllsvanurkwkohzxau, with_data=false. It bills hourly until deleted in 12-20.

## Task 3: provisioning, migration, helpers, baseline
- Branch status FUNCTIONS_DEPLOYED / ACTIVE_HEALTHY. Credentials via `supabase branches get sv-rls-p12 -o env`, written to gitignored `.env.test.local` (`git check-ignore` prints it; URL does not contain the prod ref; not committed, no secret printed).
- `SV_TEST_DB_URL` uses the session pooler (aws-1-eu-west-3.pooler.supabase.com:5432, user postgres.<branch ref>): the direct host `db.<ref>.supabase.co` is IPv6-only and did not resolve from this machine.
- Branch already had sv_clients and sv_leads (migrations to 20261003020000 applied by branching); sv_projects was absent.
- `db push` refused (remote-only history versions). Branch-only history repair: reverted 9 remote-only versions, marked 20260920000000 and 20260921000000 applied, then `db push` applied only 20261004000000_sv_projects_engine.sql.
- Verification: 8 of 8 phase-12 tables resolve via to_regclass (not null). Bucket `sv-project-files`: public=false, file_size_limit=26214400. `sv_lead_events_type_check` contains lead_converted. Storage policies (all bucket-scoped, none open to every bucket): sellerie_preview_product_images_select_all, Admins can delete gecko menu images, Admins can upload gecko menu images (insert, no qual), product_images_select_all, Public can view gecko menu images.
- Branch-only fixture: `grant select, insert, update, delete on public.gecko_admins to service_role`.
- Helpers: makeProject, postFact, makeConvertibleLead (sv_set_lead_status with null actor), cleanup tolerant of foreign key / sv_immutable_table errors, deleting by tracked id only. Commit 62724e3.
- `npm run test:rls`: 8 files passed, 84 tests passed. Only branch listing/get touched the prod ref; no DDL on prod.

## Deviations from Plan
**1. [Rule 1 - Bug] Truncate test brittle after phase 12** — `leads.rls.test.ts` expected the `sv_immutable_table` message when truncating the sv_leads set; now sv_leads is referenced by a phase-12 FK so Postgres rejects it first ("cannot truncate a table referenced in a foreign key constraint"). Truncate is still denied; assertion now accepts either message. Commit 62724e3.

**2. [Operational] Repair slip** — a first `db query -f` of the migration failed (multi-statement) and I mistakenly ran `migration repair --status applied 20261004000000` on the branch; it was immediately reverted and the migration applied properly via `db push`. Branch only.

## Known Stubs
None.

## Self-Check: PASSED
Commit 62724e3 present; helpers.ts exports makeProject and postFact; `.env.test.local` ignored and untracked.
