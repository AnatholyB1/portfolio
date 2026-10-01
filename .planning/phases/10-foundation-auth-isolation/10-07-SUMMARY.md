---
phase: 10-foundation-auth-isolation
plan: 07
subsystem: testing
tags: [supabase, rls, vitest, branch, auth-spike]
requires: [10-01, 10-02]
provides:
  - RLS integration suite (4 files, 50 tests) green on a real Postgres branch
  - Mutation canary demonstrating RED on weakened policy / disabled RLS
  - Auth spike facts A1 / A2
affects: [10-05, 10-10]
key-files:
  created: [vitest.rls.config.ts, tests/rls/*, scripts/rls-canary.mjs]
  modified: [supabase/migrations/20261002000000_sv_foundation.sql]
requirements-completed: [FOUND-02, FOUND-03, FOUND-04]
completed: 2026-10-01
---

# Phase 10 Plan 07: RLS isolation proof on a Supabase branch Summary

RLS suite (A vs B, anon, Gecko user/admin, self-signup, role exclusivity, forged metadata) passes 50/50 on a throwaway branch, the canary proves the suite goes RED when a policy is weakened, and the auth spike resolved A1/A2.

## Task 3 evidence (branch run)

- Branch `sv-rls-p10` created from `ubxllsvanurkwkohzxau` (branch ref `ivgayskfqspspdtftfto`), owner-approved. Lifetime about 17 minutes (23:15 to 23:33 UTC, 2026-10-01). **Deleted** (`Deleted preview branch`; `branches list` shows only `main`). `.env.test.local` removed. Nothing was applied to production; only `branches create/get/list/delete` touched the prod ref.
- A9: the branch did NOT apply repo migrations for sv_*. Its migration history was copied from prod with different version ids, so `db push` refused. Branch-only fix: `migration repair` (reverted 9 remote ids, applied 4 local ids), then `db push` applied `20261002000000_sv_foundation.sql`.
- `npm run test:rls`: 4 files, 50 tests passed.

### Spike results

```
A1: code=email link=email
```
- `[spike] email_otp length=8` (NOT 6): OTP length is a project auth setting. Plan 10-10 must not hardcode 6 digits (accept 6-10, or read it from config). Prod length is unverified; the branch default is 8.
- `[spike] verifyOtp code type=email`, `[spike] verifyOtp token_hash type=email`
- `[spike] session_id present=true`
- `[spike] A2 session_id stable across refresh=yes`; `sv_session_age_ok` true with 30 days and false with 0.

### Canary

```
step                                       expected  actual    result
A. baseline suite                          GREEN     GREEN     PASS
B. policy weakened (using true)            RED       RED       PASS
C. RLS disabled on sv_client_members       RED       RED       PASS
D. restored suite                          GREEN     GREEN     PASS
```

### Security advisor (branch, `supabase db advisors --type security`)

No WARN/ERROR on any sv_* object. Only INFO `rls_enabled_no_policy` on `sv_tenants` and `sv_throttle`, which is intentional (deny-all, service_role only). Other findings are pre-existing Gecko/sellerie/prospects objects, out of scope. Advisor was run via the CLI against the branch DB URL because no MCP or access token was available.

## Deviations from Plan

1. **[Rule 1 - Bug] service_role had no privileges on sv_* tables.** Tables created by `postgres` get no default privileges for service_role on a fresh DB, so every service-role path (login, sv-add-admin, tests) failed with `permission denied`. Added explicit `grant select, insert, update, delete ... to service_role` to the foundation migration (commit d324417). Not applied to prod; it ships with the normal migration push.
2. **[Rule 3] Windows canary:** `spawnSync` with `shell:true` split the SQL args; quoted them. Fixed in `scripts/rls-canary.mjs`.
3. **[Rule 1] Spike assertion:** relaxed `email_otp` regex from 6 digits to 6-10 digits (finding above).
4. **Branch-only fixture:** `grant ... on gecko_admins to service_role` run on the branch only (data-less branch lacks the default grants the real Gecko tables rely on). Not a repo change. Prod Gecko grants were not inspected.
5. The security CLI printed a branch DB password in tool output (branch since deleted, keys dead).

## Known Stubs

None.

## Self-Check: PASSED

Commits: d324417 (fix), earlier 7dfc043 and 80f98ed. Branch deleted, `.env.test.local` removed, STATE.md and ROADMAP.md untouched.
