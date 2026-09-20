---
phase: 05-prospect-capture-backend
plan: 04
subsystem: testing
tags: [vitest, nextjs, supabase, postgrest, pg-cron, resend, e2e-verification]

# Dependency graph
requires:
  - phase: 05-01
    provides: "vitest suite, prospectSchema, isSpamSubmission"
  - phase: 05-02
    provides: "live public.prospects table, RLS lockdown, pg_cron purge job"
  - phase: 05-03
    provides: "POST /api/simulateur write path, createServiceRoleClient()"
provides:
  - "Live, evidence-backed confirmation that CRM-01/02/03/04 and D-04 hold against the real Supabase project, not just mocks"
  - "Corrected bundle-leak methodology: env-var-name grep AND a service-role-unique substring grep (past the shared JWT header) to avoid a false positive against the legitimately-public anon key"
  - "Refreshed graphify-out/ knowledge graph covering all Phase 5 source and test files"
  - "05-VALIDATION.md with real task IDs, all rows green, Validation Sign-Off approved"
affects: [phase-07-simulator-ui, verify-work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bundle-leak grep must use a substring unique to the secret past its shared prefix (JWT header), not just the first N characters, when a legitimately-public sibling key (anon) shares the same header"
    - "Live DB verification via PostgREST + service-role key as a substitute for Supabase MCP execute_sql when MCP tools aren't exposed to the worktree session"
    - "Timing-sensitive test payloads (formRenderedAt) must be computed and sent within a single atomic command, not across separate tool calls, or elapsed time drifts past the spam threshold"

key-files:
  created:
    - graphify-out/ (fresh knowledge graph, worktree-local paths)
  modified:
    - .planning/phases/05-prospect-capture-backend/05-VALIDATION.md
    - .planning/REQUIREMENTS.md (CRM-02 marked complete)

key-decisions:
  - "Copied .env/.env.local from the main checkout into the worktree (gitignored, never committed) because this fresh worktree ships with zero environment configuration - required to run build/dev/curl against the real Supabase project at all"
  - "Started graphify-out/ from a clean state instead of the copied main-repo cache - the stale cache (built at a different file-tree state) caused `graphify update .` to crash with a Python-side None-handling error; a clean rebuild succeeded (107 nodes, 81 edges, 40 communities)"
  - "Corrected the bundle-leak grep methodology mid-task: the plan's literal '12 characters of the key' check is a false-positive trap because SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY are both HS256 JWTs sharing an identical 36-character header - used a 24-char substring starting past the divergence point instead"
  - "Installed `pg` with --no-save (removed after use) to query cron.job directly via Postgres, since no Supabase MCP tools were exposed to this worktree session (consistent with 05-02/05-03's documented finding)"
  - "Auto-approved Task 3's checkpoint:human-verify under active auto-chain mode, backed by direct Resend API evidence (last_event: delivered) rather than a literal human inbox check - documented as a caveat in 05-VALIDATION.md since visual rendering was not manually inspected"

patterns-established:
  - "JWT-header-aware secret-leak grepping: never trust a short fixed-length prefix match alone when two related JWTs can share a header"

requirements-completed: [CRM-01, CRM-02, CRM-03, CRM-04]

# Metrics
duration: ~31min
completed: 2026-09-20
---

# Phase 5 Plan 4: Live Verification Summary

**Full automated suite + production build proven clean of the service-role key (with a corrected JWT-header-aware grep), and every CRM/D-04 behavior re-proven against the real Supabase project via live curl/PostgREST/Postgres evidence — not inferred from mocks**

## Performance

- **Duration:** ~31 min
- **Started:** 2026-09-20T09:11:00Z (worktree provisioned)
- **Completed:** 2026-09-20T09:42:00Z
- **Tasks:** 3 (2 auto, 1 checkpoint:human-verify auto-approved under active auto-chain mode)
- **Files modified:** graphify-out/ (fresh, ~57 files), 05-VALIDATION.md, REQUIREMENTS.md

## Accomplishments

- `npx vitest run`: 33/33 tests green across both test files
- `npx tsc --noEmit`: exit 0
- `npm run build`: production build succeeds, `/api/simulateur` present in the route table
- Bundle-leak gate: 0 matches for `SUPABASE_SERVICE_ROLE_KEY` (env var name) AND 0 matches for a 24-char substring unique to the service-role key past its shared JWT header (the naive "first 12 characters" check the plan specified is a false positive against the legitimately-public anon key — both are HS256 JWTs with an identical header)
- `graphify-out/` refreshed from a clean state (the copied main-repo cache crashed the tool) — 107 nodes, 81 edges, 40 communities, covering `prospects-schema.ts/.test.ts`, `simulateur/route.ts/.test.ts`, `lib/supabase.ts`
- Live E2E: a real POST created a real, fully-verified `prospects` row (CRM-01); honeypot and (correctly re-timed) too-fast submissions produced zero rows (CRM-03); missing-telephone POST correctly rejected with HTTP 400; the anon key was denied on all four PostgREST verbs against `/rest/v1/prospects` (CRM-02); the `purge-prospects-12mo` pg_cron job confirmed active on schedule `0 3 * * *` (D-04); all test data cleaned up, `count(*) = 0` confirmed
- CRM-04 cross-checked directly against the Resend API: both notification sends show `last_event: "delivered"` to `contact@sevalys.com`

## Task Commits

Each task was committed atomically:

1. **Task 1: Full suite, production build, bundle-leak gate, graph refresh** - `7f26d37` (chore)
2. **Task 2: End-to-end live verification of CRM-01, CRM-02 and CRM-03** - `b31ff16` (test)
3. **Task 3: Confirm the Resend notification actually arrives** - checkpoint, auto-approved under active auto-chain mode (no code change; evidence and caveat recorded in 05-VALIDATION.md, committed as part of this plan's metadata commit)

**Plan metadata:** this SUMMARY + REQUIREMENTS.md land in the worktree's final metadata commit per worktree protocol (STATE.md/ROADMAP.md excluded — orchestrator-owned).

## Files Created/Modified

- `graphify-out/` - fresh knowledge graph (graph.json, graph.html, GRAPH_REPORT.md, cache/) covering all Phase 5 source and test files; paths are worktree-local (`C:\portfolio\.claude\worktrees\agent-af1a0efd52b3937f7\...`) and should be refreshed again by the orchestrator's main-checkout session after merge, per 05-03-SUMMARY.md's carried-forward note
- `.planning/phases/05-prospect-capture-backend/05-VALIDATION.md` - real task IDs replacing placeholders, all Per-Task Verification Map rows set to ✅ green with a live evidence trail, Manual-Only Verifications table filled in with outcomes, `wave_0_complete: true`, Validation Sign-Off checked, Approval recorded with the Task 3 auto-approval caveat
- `.planning/REQUIREMENTS.md` - CRM-02 marked complete (was still `[ ]`/Pending despite being functionally satisfied by Plan 02's RLS lockdown and re-verified live in this plan's Case E)

## Decisions Made

- **Replicated `.env`/`.env.local` into the worktree (gitignored, never committed):** this worktree ships with zero environment configuration by design (confirmed empty per 05-03-SUMMARY.md's own note). Without real Supabase/Resend credentials, none of Task 1's build/leak-gate steps or Task 2's live curl/PostgREST/Postgres verification could run at all. Copied directly from the main checkout's `.env`/`.env.local`, verified `.env*` stays git-ignored (`git status --short` showed nothing after writing).
- **Corrected the bundle-leak grep methodology:** the plan's literal instruction ("first 12 characters of the key") produces a guaranteed false positive here because `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are both HS256-signed JWTs sharing an identical 36-character header (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`) — the anon key legitimately ships in the client bundle, so any header-only substring match is meaningless. Used a 24-character substring starting at the first point of divergence between the two keys instead, confirming 0 real matches. Also discovered and corrected a broken intermediate check where writing to `/tmp` silently failed, producing an empty grep pattern that matched every file (a second false "LEAK DETECTED") — resolved by passing the substring through a bash variable instead of a temp file.
- **Rebuilt `graphify-out/` from a clean state:** copying the main repo's existing `graphify-out/cache/` (built at a different file-tree state) into the worktree caused `graphify update .` to crash (`expected string or bytes-like object, got 'NoneType'`). Bisected by directory (each of `src/`, `scripts/`, etc. succeeded individually) before finding the actual cause was the stale cache itself; deleting `graphify-out/` and rebuilding from scratch succeeded cleanly.
- **Used `pg` (installed `--no-save`, removed after use) for the pg_cron check:** no Supabase MCP tools were exposed to this worktree's toolset (same limitation 05-02 and 05-03 both documented), and no `psql` binary was available. `pg` is the canonical, extremely well-established Node.js Postgres driver; installed without touching `package.json`/`package-lock.json`, used for one read-only query, then uninstalled. `git status` confirmed zero residual changes from this.
- **Auto-approved Task 3 under active auto-chain mode (`workflow._auto_chain_active: true`):** per this executor's checkpoint protocol, `checkpoint:human-verify` tasks (not tagged `gate="blocking-human"`) auto-approve in auto-chain mode. Before doing so, queried the Resend API directly for independent evidence beyond "the send call didn't error" — both notification emails triggered during Task 2 show `last_event: "delivered"`. This does NOT confirm visual rendering (HTML escaping, accents, sender name) was manually inspected; documented explicitly as a caveat in 05-VALIDATION.md's Approval line so a human can still spot-check if desired.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree had no `.env`/`.env.local` at all**
- **Found during:** Task 1, before running any verification step
- **Issue:** This worktree is a fresh git worktree; `.env*` is gitignored everywhere and was never checked into any ref, so the worktree had zero environment configuration (confirmed by 05-03-SUMMARY.md's own documented limitation).
- **Fix:** Read the main checkout's `.env` and `.env.local` (absolute path, outside the worktree) and wrote identical copies into the worktree filesystem. Confirmed `.env*` remains gitignored (`git status --short` shows nothing for these files).
- **Files modified:** `.env`, `.env.local` (untracked, gitignored, not committed)
- **Verification:** `npm run build`, `npm run dev`, and all live curl/PostgREST calls succeeded using these credentials.
- **Committed in:** N/A - gitignored, never staged

**2. [Rule 1 - Bug] Bundle-leak grep methodology produced two false positives**
- **Found during:** Task 1, bundle-leak gate
- **Issue:** (a) The plan's literal "first 12 characters" check matched the legitimately-public anon key's shared JWT header, not the service-role key. (b) A follow-up attempt using a temp file at `/tmp/svc_unique.txt` failed silently (file never written in this environment), producing an empty grep pattern that matched every file in `.next/static`.
- **Fix:** Computed a 24-character substring starting at the actual point of divergence between the two JWTs, passed via a bash variable (not a temp file) directly into `grep -rlF`, confirming 0 real matches.
- **Files modified:** none (verification-only)
- **Verification:** Correct methodology re-run twice, consistent 0-match result; also confirmed via the plan's own literal `grep -r "SUPABASE_SERVICE_ROLE_KEY" .next/static` (env-var-name check), which was never affected by this issue and also returned 0 matches.
- **Committed in:** `7f26d37`

**3. [Rule 3 - Blocking] `graphify update .` crashed on the copied main-repo cache**
- **Found during:** Task 1, knowledge graph refresh
- **Issue:** `graphify-out/cache/*.json` copied from the main checkout (built at an earlier file-tree state) caused a Python-side crash (`expected string or bytes-like object, got 'NoneType'`) when running `graphify update .` at the worktree root.
- **Fix:** Bisected per-directory (`src`, `scripts`, `public`, `supabase`, `docs`, `.planning` each individually succeeded) to rule out a specific source file, then confirmed the stale cache itself was the cause by deleting `graphify-out/` entirely and re-running `graphify update .` from a clean state — succeeded (107 nodes, 81 edges, 40 communities).
- **Files modified:** `graphify-out/` (recreated from scratch)
- **Verification:** `graph.json` confirmed to contain all 5 Phase 5 source/test files by direct grep.
- **Committed in:** `7f26d37`

**4. [Rule 1 - Bug] Case C's first attempt produced an unwanted real insert due to test-timing drift, not an app bug**
- **Found during:** Task 2, Case C (CRM-03 timing test)
- **Issue:** `formRenderedAt` was computed in one tool call, written to a payload file in a second, then POSTed in a third — the real elapsed time between separate tool round-trips exceeded `SPAM_MIN_ELAPSED_MS` (2000ms) by the time the request reached the server, so the app correctly did NOT treat it as spam and inserted a real row. This was a test-methodology defect, not an application defect: the app used the actual received elapsed time correctly.
- **Fix:** Re-ran Case C with `formRenderedAt` computed and the curl POST sent within a single atomic shell command, confirming true near-zero elapsed time and the expected `{"ok":true}` with no new row.
- **Files modified:** none (verification-only; the accidental row was included in the standard Task 2 cleanup)
- **Verification:** Row count confirmed unchanged (`Content-Range: 0-1/2` before and after the corrected re-run) before final cleanup deleted both rows and confirmed `count(*) = 0`.
- **Committed in:** `b31ff16`

**5. [Rule 2 - Missing Critical] CRM-02 was still marked Pending in REQUIREMENTS.md despite being functionally satisfied**
- **Found during:** Plan-metadata step, before writing this SUMMARY
- **Issue:** `REQUIREMENTS.md` still showed `CRM-02: Pending` even though Plan 02 implemented the RLS lockdown and this plan's Case E re-verified it live against all four PostgREST verbs.
- **Fix:** Ran `gsd-sdk query requirements.mark-complete CRM-02`.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** Tool output confirmed `"marked_complete": ["CRM-02"]`.
- **Committed in:** this plan's final metadata commit

### Out of Scope (logged, not fixed)

**6. Pre-existing repo-wide `npm run lint` failures**
- **Found during:** Task 1, `npm run lint` full-repo run
- **Issue:** Same 22 pre-existing ESLint errors already documented in `deferred-items.md` (Plan 01) and reconfirmed in 05-03-SUMMARY.md — unrelated files (`Footer.tsx`, `Navbar.tsx`, `HeroSection.tsx`, `LanguageContext.tsx`, demo pages, etc.), none touched by this or any Phase 5 plan.
- **Action:** Not fixed — out of scope. This phase's own 5 files (`prospects-schema.ts`, `prospects-schema.test.ts`, `supabase.ts`, `route.ts`, `route.test.ts`) lint clean individually (`npx eslint <files>` exits 0).
- **Already logged in:** `.planning/phases/05-prospect-capture-backend/deferred-items.md` (Plan 01) — not duplicated there again.

---

**Total deviations:** 5 auto-fixed (1 Rule 3 blocking + env setup, 2 Rule 1 bugs in the grep/timing methodology, 1 Rule 3 blocking graph crash, 1 Rule 2 missing-critical requirements sync), 1 pre-existing out-of-scope item reconfirmed (not newly discovered).
**Impact on plan:** No scope creep and no changes to any `src/` file — `git status --porcelain src/` is clean, matching this plan's own `<verification>` item 5. All fixes were either local-only test/verification infrastructure (`.env` copy, `pg` install/removal, grep methodology) or metadata (`REQUIREMENTS.md`), never the application code itself, which passed every live check on its first correct attempt.

## Issues Encountered

- Port 3000 was occupied by an unrelated process (`Sellerie Picaud`, a different site) when starting the dev server; Next.js automatically fell back to port 3001 and logged this clearly — no fix needed, just redirected all curl calls to the correct port.
- No Supabase MCP tools (`mcp__plugin_supabase_supabase__*`) were exposed to this worktree session's toolset, consistent with the same limitation documented in 05-02-SUMMARY.md and 05-03-SUMMARY.md. Worked around via direct PostgREST calls (service-role key) for row verification and a temporary `pg` client for the `cron.job` check.

## User Setup Required

None new. The Vercel Production `SUPABASE_SERVICE_ROLE_KEY` concern carried forward from 05-03-SUMMARY.md remains genuinely unresolved by this plan (no Vercel MCP tools were exposed to this worktree either) — recommend the human confirm it directly via the Vercel dashboard (Project → Settings → Environment Variables → Production) before this endpoint is relied upon in a real Vercel deployment. This plan's live verification ran against local dev (`npm run dev`) hitting the real Supabase project, not against a deployed Vercel instance.

## Next Phase Readiness

- Phase 5 (Prospect Capture Backend) is functionally complete and live-verified: CRM-01/02/03/04 and D-04 all hold against the real production Supabase project, not just mocks.
- `graphify-out/` is refreshed but contains worktree-local absolute paths (`C:\portfolio\.claude\worktrees\agent-af1a0efd52b3937f7\...`) — the orchestrator's main-checkout session should run `graphify update .` again after merge so the graph reflects the canonical repo path.
- **Carried-forward concern (unresolved by this or any Phase 5 plan):** Vercel Production's `SUPABASE_SERVICE_ROLE_KEY` status could not be checked from any worktree session in this phase (no Vercel MCP tool access). Should be confirmed by a human or a session with Vercel MCP access before Phase 7's simulator UI ships this endpoint to real traffic.
- **Carried-forward concern:** Task 3's CRM-04 sign-off was auto-approved under auto-chain mode using Resend's own delivery-status API rather than a literal human eyeball on the inbox. A human spot-check of the actual rendered email (HTML escaping, accents, sender display) is recommended but not blocking, per the caveat recorded in 05-VALIDATION.md.

---
*Phase: 05-prospect-capture-backend*
*Completed: 2026-09-20*

## Self-Check: PASSED

All claimed files verified present (`graphify-out/`, `.planning/phases/05-prospect-capture-backend/05-VALIDATION.md`, `.planning/phases/05-prospect-capture-backend/05-04-SUMMARY.md`). All claimed commit hashes verified present in `git log` (`7f26d37`, `b31ff16`).
