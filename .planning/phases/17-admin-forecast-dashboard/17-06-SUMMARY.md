---
phase: 17-admin-forecast-dashboard
plan: 06
subsystem: testing
tags: [supabase, rls, branch, migration, helpers]
requires:
  - phase: 17-01
    provides: migration 20261009000000_sv_pilotage.sql
provides:
  - Supabase branch sv-rls-p17 (ref gvbkypvtualyazyjhawo) carrying the phase-17 schema
  - RLS helpers for the five pilotage RPCs, convertTestLead, correctTestLeadSource
affects: [17-10, 17-13, 17-14]
key-files:
  modified: [tests/rls/helpers.ts]
decisions:
  - "Branch sv-rls-p17 created per owner approval; must be deleted in 17-14 (own approval)"
metrics:
  completed: 2026-10-07
---

# Phase 17 Plan 06: Phase-17 test branch and RLS helpers Summary

Created Supabase branch `sv-rls-p17` (project ref `gvbkypvtualyazyjhawo`, id deca69b6-bc26-4bc3-9802-cb6207570632, parent ubxllsvanurkwkohzxau), pushed the phase-17 migration to the branch only, and added seven RLS helpers.

## Task 1: Branch check
`branches list` showed only `main` (FUNCTIONS_DEPLOYED). Decision: NEW BRANCH NEEDED. `.env.test.local` did not exist.

## Task 2: Owner decision (verbatim, 2026-10-07)
Question: "Autorisez-vous la création de la branche Supabase dédiée « sv-rls-p17 » (projet partagé avec Gecko, branche de test éphémère, supprimée en fin de phase) et l'application de la migration 20261009000000_sv_pilotage.sql sur cette branche uniquement ?"
Answer: "Oui, créer sv-rls-p17 (Recommended)"
Scope: creating sv-rls-p17 and applying the phase-17 migration to that branch only. No production write/DDL; branch deletion left to 17-14 with its own approval.

## Task 3: Provision, push, helpers
- `supabase branches create sv-rls-p17` reached FUNCTIONS_DEPLOYED. `.env.test.local` written by redirect (gitignored, `git check-ignore` prints it, 0 occurrences of the production ref, not committed). `SV_TEST_DB_URL` is the session pooler (port 5432).
- Branch already carried the phase-15/16 schema (to_regclass not null for sv_mail_suppressions, sv_resend_events, sv_stripe_events).
- `db push` initially refused on 9 remote-only history versions. Branch-only repair as in 16-05: reverted those 9, marked 20260920000000 and 20260921000000 applied; dry-run then listed only 20261009000000; real push applied it unchanged (no SQL fix).
- Branch verification: to_regclass not null for sv_recurring_costs, sv_project_costs, sv_cash_balances. `has_table_privilege('service_role','public.sv_project_costs','insert')` = false; `has_table_privilege('authenticated','public.sv_cash_balances','insert')` = false; `has_function_privilege('authenticated','public.sv_add_project_cost(uuid, date, text, text, bigint, bigint, uuid)','execute')` = false. relrowsecurity true for all three tables.
- Branch-proven migration sha256: `3ea9b124286be9c7a21be22aedbd77df724d7e4ed43fcf46d3c89c582e03b877`.
- Branch-only fixture grant: `grant select, insert, update, delete on public.gecko_admins to service_role`.
- Helpers added to tests/rls/helpers.ts (commit a709e1c); grep count 7; `tsc --noEmit` clean.
- Production untouched: only `branches list/create/get` touched ref ubxllsvanurkwkohzxau. db push, repair and queries used the branch DB URL (ref gvbkypvtualyazyjhawo).

## Deviations from Plan

**1. [Unresolved, pre-existing] `npm run test:rls` did not exit 0** - one failure: `mailoutbox.rls.test.ts > sv_claim_due_mail > claims a due pending row once and skips future send_after rows` (expected undefined to be truthy at line 72). This is the same sv_mail_outbox claim failure recorded in 16-05 (deviation 3) and 15-08; it involves no phase-17 object. Not fixed here.

**2. [Operational] Branch credentials via `branches get -o env`** - file written to the scratchpad, converted into `.env.test.local`, then deleted; nothing printed.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
Commit a709e1c and helpers exist; .env.test.local ignored and uncommitted.
