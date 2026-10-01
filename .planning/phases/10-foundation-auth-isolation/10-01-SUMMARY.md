---
phase: 10-foundation-auth-isolation
plan: 01
subsystem: auth
tags: [supabase, ssr, server-only, vitest, env]
requires: []
provides:
  - env getters and assertSupabaseKeyMode (src/lib/supabase/env.ts)
  - createSupabaseServerClient, createSupabaseAdminClient, updateSession
  - PRIVATE_PREFIXES, PROTECTED_PREFIXES, isPrivatePath
affects: [10-02, 10-03, 10-06, 10-07, 10-09]
tech-stack:
  added: ["@supabase/ssr 0.12.7", "server-only 0.0.1", "@supabase/supabase-js 2.117.2"]
  patterns: ["server-only guard on service_role client", "vitest alias stub for server-only"]
key-files:
  created:
    - src/lib/supabase/env.ts
    - src/lib/supabase/env.test.ts
    - src/lib/supabase/server.ts
    - src/lib/supabase/admin.ts
    - src/lib/supabase/proxy.ts
    - src/lib/privateRoutes.ts
    - src/lib/privateRoutes.test.ts
    - src/test/server-only-stub.ts
  modified: [package.json, package-lock.json, vitest.config.ts, .env.example]
key-decisions:
  - "Env helpers typed as Record<string, string | undefined> (assignable from ProcessEnv) so tests type-check"
  - "server-only package legitimacy approved by project owner (Task 1 checkpoint)"
requirements-completed: [FOUND-01, FOUND-03, FOUND-05]
duration: n/a
completed: 2026-10-02
---

# Phase 10 Plan 01: Auth building blocks Summary

Supabase SSR/admin/proxy client modules with a key-mode assertion (rejects mixed or misplaced keys) and a single source of truth for private route prefixes.

## Tasks
- Task 1: server-only legitimacy gate, approved by user (no commit).
- Task 2: cbe0108 deps, npm scripts, vitest stub, env module + 11 tests.
- Task 3: d2a5241 server/admin/proxy clients, privateRoutes + 12 tests.

## Deviations from Plan
**[Rule 1 - Bug] Env param type.** `NodeJS.ProcessEnv` required NODE_ENV, so test env objects failed `tsc`. Changed the parameter type to `Record<string, string | undefined>` (ProcessEnv is assignable). Included in the Task 3 commit.

Also: the worktree was reset to the expected base (32c63c5) at startup; `npm install` bumped supabase-js to 2.117.2 (satisfies ^2.114.0).

## Issues
npm reported 13 audit vulnerabilities (pre-existing dependency tree); out of scope. Scripts targets (rls-canary, verify-email-dns, sv-add-admin, vitest.rls.config.ts) are created by later plans.

## Known Stubs
None.

## Verification
`npx tsc --noEmit` clean; `npm test`: 23 files, 355 tests pass. Legacy `src/lib/supabase.ts` untouched; no `src/lib/supabase/index.ts`; no `getSession(` in server code.

## Self-Check: PASSED
