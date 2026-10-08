---
phase: 19-ads-preparation
plan: 06
subsystem: testing
tags: [supabase, rls, branch, migration, uuidv5]
requires:
  - phase: 19-03
    provides: migration 20261011000000_sv_ads_conversions.sql
provides:
  - Supabase branch sv-rls-p19 (ref iiralsshmqfhdbglucvq) carrying the phase-19 schema
  - .env.test.local (gitignored) for 19-07
affects: [19-07, 19-11, 19-12]
decisions:
  - "Branch sv-rls-p19 created per owner decision; must be deleted in 19-12"
metrics:
  completed: 2026-10-08
---

# Phase 19 Plan 06: Phase-19 test branch Summary

Created Supabase branch `sv-rls-p19` (ref `iiralsshmqfhdbglucvq`, id 1cc8ac1b-bad5-4b4f-9997-2144ff2b91f9, parent ubxllsvanurkwkohzxau), pushed the phase-19 migration to the branch only. No fallback needed; migration SQL unchanged.

## Task 1: Branch check
Main tree (`C:/portfolio`, `.git` is a directory, not a worktree). `branches list` showed only `main`. `.env.test.local` did not exist. Decision: NEW BRANCH NEEDED.

## Task 2: Owner decision
Answered by the owner on 2026-10-08, verbatim: "Create branch sv-rls-p19 (Recommended)". Relayed by the orchestrator in the executor prompt.

## Task 3: Provision, probe, push
- Branch reached ACTIVE_HEALTHY. `.env.test.local` written by node redirect (gitignored, `git check-ignore` prints it, 0 occurrences of the production ref, SV_TEST_DB_URL is the session pooler port 5432, both signature secrets identical random hex).
- Branch had the phase-18 schema (`to_regclass('public.sv_reviews')` = sv_reviews, max version 20261010000000).
- Probe (a): `extensions.uuid_generate_v5('87713031-3054-582f-9073-0aa58d13d20e', '00000000-0000-4000-8000-000000000001:lead_submitted')` = `c2906e05-76be-58a0-b812-a56ec50f0a76` (golden vector matches).
- Probe (b): uuid-ossp in schema extensions, pgcrypto in schema extensions. Fallback NOT used.
- `db push` refused on remote-only history; branch-only repair: reverted 9 remote-only versions, marked 20260920000000 and 20260921000000 applied; dry-run listed only 20261011000000; real push applied it unchanged.
- Migration sha256 as pushed (19-11 compares it): `825bd45ec1ac3e831355feaf1e2357c99b033147ddfd5560595498bf83d82127`
- Post-push evidence on the branch: sv_conversion_events exists; source_nonconformity and source_raw present on sv_leads (2) and sv_leads_admin_v (2); service_role insert on sv_conversion_events false; authenticated insert false; anon select false; trigger sv_lead_events_emit_conversions on sv_lead_events enabled ('O'); `sv_private.conversion_event_id('00000000-0000-4000-8000-000000000001','lead_submitted')` = c2906e05-76be-58a0-b812-a56ec50f0a76.
- Branch-only fixture grant: `grant select, insert, update, delete on public.gecko_admins to service_role`.
- `npm run test:rls` (existing suites): first run green, 22 files, 319 tests passed (no mailoutbox flake this time).
- Production untouched: only `branches list/create/get` named ref ubxllsvanurkwkohzxau; all repair, push and queries used the branch DB URL.

## Deviations from Plan

**1. [Operational] Branch DB password displayed in transcript.** A diagnostic `branches get` printed the throwaway branch's POSTGRES_URL (password) in the executor transcript. It is a disposable branch credential, deleted in 19-12; nothing was written to a committed file. Rotation is unnecessary given deletion.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED
`.env.test.local` ignored and contains no production ref; migration unchanged in repo; RLS suite green.
