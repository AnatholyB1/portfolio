---
phase: 05-prospect-capture-backend
plan: 02
subsystem: database
tags: [supabase, postgres, rls, pg_cron, migration]

requires: []
provides:
  - "public.prospects table in the live Supabase project (ubxllsvanurkwkohzxau), separate from products/orders demo schema"
  - "RLS enabled on prospects with zero anon/authenticated grants (Pattern 1 — structural bypass closure)"
  - "12-month automatic retention purge via pg_cron job purge-prospects-12mo"
affects: [05-03, 05-04]

tech-stack:
  added: []
  patterns:
    - "First tracked SQL migration in this repo (supabase/migrations/*.sql), applied via Supabase MCP apply_migration rather than supabase db push (repo not linked)"

key-files:
  created:
    - "supabase/migrations/20260920000000_create_prospects_table.sql"
  modified: []

key-decisions:
  - "Applied via Supabase MCP apply_migration (single call, full DDL) rather than splitting into two calls — the combined DDL succeeded in one call, no split needed."
  - "Zero RLS policies created on purpose (Pattern 1, not Pattern 1-alt) — anon/authenticated have no grants at all, so there is no public write path to close; the only writer is the service-role client in Plan 03."

patterns-established:
  - "Pattern 1: RLS enabled + zero grants for anon/authenticated + zero policies, for any table that must only be written server-side via service-role"

requirements-completed: [CRM-01, CRM-02]

duration: 20min
completed: 2026-09-20
---

# Phase 5: Prospect Capture Backend — Plan 02 Summary

**`public.prospects` table live in production Supabase with RLS lockdown (zero anon/authenticated grants) and a 12-month `pg_cron` retention purge, verified by direct query — not inferred from the migration file**

## Performance

- **Duration:** ~20 min (including a human-verify checkpoint wait for DDL approval)
- **Started:** 2026-09-20T08:19:36Z
- **Completed:** 2026-09-20T08:39:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- Wrote the repo's first tracked database migration (`supabase/migrations/20260920000000_create_prospects_table.sql`)
- Applied it to the live (only) Supabase project after explicit human approval of the full SQL, target project ref, and pre-apply `list_tables` confirmation that no `prospects` table already existed
- Verified all six automated assertions plus the consent-constraint negative test directly against the live database

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the prospects migration file** - `1f5843f` (feat)
2. **Task 2: Approve applying irreversible DDL to the live production Supabase project** - checkpoint, no code change (human approval recorded below)
3. **Task 3: Apply the migration to the live project and verify the lockdown** - `(this commit)` (feat: migration applied + verified)

**Plan metadata:** committed alongside Task 3

## Files Created/Modified
- `supabase/migrations/20260920000000_create_prospects_table.sql` - `prospects` table DDL, RLS enable, anon/authenticated revoke, pg_cron extension + 12-month purge job

## Decisions Made

- **Human approval was obtained through the main session's `AskUserQuestion`, not relayed as a bare claim.** The subagent that ran Tasks 1–2 correctly refused to accept a relayed "approved" message from the coordinator as valid consent for Task 3, per its own operating rules against treating agent messages as user approval, and per this plan's explicit "no auto-approval under any circumstance" instruction on the DDL-apply gate. That refusal was the CORRECT behavior, not an error — it is the exact failure mode (T-05-10, repudiation) this plan's checkpoint design exists to prevent.
- Because the executor subagent's worktree session had no Supabase MCP tool access (flagged explicitly in its checkpoint output), the coordinator — which does have Supabase MCP tools in its own session — applied the migration and ran all Task 3 verification steps directly, using the human's own `AskUserQuestion` "Approuvé" response as the actual approval record, then wrote this SUMMARY.md to close out the plan with real, independently-obtained verification evidence rather than asking the subagent to trust an unverifiable claim.
- `apply_migration` accepted the full combined DDL (table + RLS + revoke + pg_cron extension + cron.schedule) in a single call — no split into two calls was needed (RESEARCH.md's Open Question 2 contingency for a plan-tier `pg_cron` restriction did not materialize; `pg_cron` was available and the job scheduled successfully on the first attempt).

### Live verification results (Supabase MCP `execute_sql` against project `ubxllsvanurkwkohzxau`)

| Assertion | Expected | Actual |
|---|---|---|
| Column count for `public.prospects` | 9 | 9 |
| `pg_class.relrowsecurity` for `public.prospects` | `true` | `true` |
| `pg_policies` rows for `tablename='prospects'` | 0 | 0 |
| `role_table_grants` rows for `prospects`, grantee `anon`/`authenticated` | 0 | 0 |
| `cron.job` rows for `jobname='purge-prospects-12mo'`, `schedule='0 3 * * *'` | 1 | 1, `active=true` |
| `select count(*) from public.prospects` | 0 | 0 |
| Insert with `consentement_rgpd=false` | rejected, `consentement_requis` violation | Rejected exactly as expected: `ERROR 23514: new row for relation "prospects" violates check constraint "consentement_requis"` — no row persisted (confirmed by the row-count re-check immediately after) |
| `list_tables` shows `products`/`orders` unchanged | present, untouched | Present, `rls_enabled: true`, `rows: 0`, unchanged. Note: this project has no `stock` table (pre-existing fact, unrelated to this migration — the `products`/`orders`/`stock` framing in PROJECT.md/CONTEXT.md appears to describe the intended CRM schema, but only `products` and `orders` actually exist in this Supabase project; this migration did not create, modify, or reference any `stock` table) |
| Supabase security-advisor scan (type: security) | captured | One `INFO`-level finding specific to `prospects`: `rls_enabled_no_policy` — "Table `public.prospects` has RLS enabled, but no policies exist." **This is expected and intentional** (Pattern 1: zero grants means zero policies are needed; the service-role client in Plan 03 bypasses RLS entirely, and there is no anon/authenticated access path for a policy to gate). Three other `WARN`-level findings were returned (`function_search_path_mutable`, `anon_security_definer_function_executable` / `authenticated_security_definer_function_executable` on `public.swap_shift_employees`, and `auth_leaked_password_protection`) — all pre-existing, unrelated to this migration, and concern an unrelated `rh_*` (HR/shift-scheduling) function set that already existed in this shared Supabase project before this phase started. Not remediated here — out of scope for Phase 5. |

## Deviations from Plan

None functionally — all Task 3 acceptance criteria were met exactly as specified. One process deviation, documented above: the coordinator (not the Task 1/2 executor subagent) performed Task 3's apply + verification directly, because the executor subagent lacked Supabase MCP tool access in its worktree session and correctly declined to mark the plan complete on an unverifiable relayed claim. The verification evidence in this SUMMARY is first-hand (run directly against the live database by the coordinator), not paraphrased from the subagent.

## Issues Encountered

None — migration applied cleanly on the first attempt, all six automated assertions and the negative consent-constraint test passed without needing retries or the `pg_cron`-restricted fallback path.

## User Setup Required

None - no external service configuration required. The `SUPABASE_SERVICE_ROLE_KEY` needed by Plan 03's write path already exists in `.env` (confirmed present by 05-RESEARCH.md); whether it is also set in Vercel Production remains RESEARCH.md's Open Question 1, to be resolved by Plan 03 Task 1.

## Next Phase Readiness

- `public.prospects` exists, is locked down, and is ready for Plan 03's service-role write path.
- Plan 03 (wave 2) can now proceed — it depends on both this plan and Plan 01.

---
*Phase: 05-prospect-capture-backend*
*Completed: 2026-09-20*
