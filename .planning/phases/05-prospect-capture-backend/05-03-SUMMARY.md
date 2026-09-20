---
phase: 05-prospect-capture-backend
plan: 03
subsystem: backend
tags: [nextjs, supabase, service-role, resend, spam-guard, vitest]

# Dependency graph
requires: ["05-01", "05-02"]
provides:
  - "createServiceRoleClient() in src/lib/supabase.ts - server-only, bypasses RLS"
  - "POST /api/simulateur - the live write path public.prospects Phase 7's simulator will call"
  - "src/app/api/simulateur/route.test.ts - 13 passing unit tests covering CRM-03/CRM-04"
affects: [05-04, phase-07-simulator-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service-role Supabase client factory, additive to the existing anon-key createServerClient(), never imported by client components"
    - "Silent-reject spam guard runs before validation/insert/notification, returning a response byte-identical to success"
    - "Explicit field-mapped insert (never a raw/parsed-object spread) as the mass-assignment mitigation"
    - "vi.fn<(args) => ReturnType>() generic-typed mocks for @/lib/supabase and resend, driving the handler with a plain Request (no next/server mocking)"

key-files:
  created:
    - src/app/api/simulateur/route.ts
    - src/app/api/simulateur/route.test.ts
  modified:
    - src/lib/supabase.ts

key-decisions:
  - "Vercel Production status of SUPABASE_SERVICE_ROLE_KEY could not be determined in this session - no Vercel MCP tools were exposed to this worktree executor. Documented as a Production blocker below per the plan's documented contingency, not silently assumed present."
  - "Added a 13th test ('happy path' full-success assertion) beyond the 12 explicitly enumerated in the plan's <behavior> block, to clear the plan's 'at least 13 passing tests' acceptance threshold without diluting the explicit spam/notification/insert-shape/validation cases."
  - "Resend mock implemented as a real class (not vi.fn().mockImplementation(() => ...)) because the route calls `new Resend(...)` - an arrow-function mock implementation cannot be invoked with `new`."
  - "Build verification (npm run build) required a temporary, uncommitted .env.local with dummy values - this worktree ships with no .env at all (gitignored, not part of any git checkout). Deleted immediately after verifying the build succeeded and .next/static contained zero occurrences of the service-role key. This is a local-only verification step, not a persisted change."

patterns-established:
  - "Server-only credential factories live in src/lib/supabase.ts alongside the anon-key clients, documented in French comments matching the file's existing convention"

requirements-completed: [CRM-01, CRM-03, CRM-04]

# Metrics
duration: ~35min
completed: 2026-09-20
---

# Phase 5 Plan 3: Prospect Capture Write Path Summary

**`POST /api/simulateur` writes explicitly-mapped, honeypot/timing-guarded prospect rows via a new service-role Supabase client and fires one escaped Resend notification, proven by 13 network-free unit tests**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-20
- **Tasks:** 3 (all `type="auto"`, Task 3 `tdd="true"`)
- **Files modified:** 3 (1 modified, 2 created)

## Accomplishments

- `src/lib/supabase.ts` gained `createServiceRoleClient()` — reads the correctly-unprefixed `SUPABASE_SERVICE_ROLE_KEY`, passes `{ auth: { persistSession: false } }`, and is documented as server-only/RLS-bypassing. The existing `createServerClient()`'s misleading "service_role" comment was corrected to accurately describe it as anon-key-based, with zero behavior change.
- `src/app/api/simulateur/route.ts` implements the full CRM-01/03/04 write path in the exact required order: parse → silent spam-reject → zod validate → hash IP → explicit-field insert → single Resend notification → `{ ok: true }`.
- `src/app/api/simulateur/route.test.ts` proves the spam guard, the notification trigger, HTML escaping against a `<script>` payload, the explicit insert key set, IP hashing, and validation failures — all with `@/lib/supabase` and `resend` mocked, zero real network calls.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add createServiceRoleClient and confirm the key exists in production** — `c889a84` (feat)
2. **Task 2: Implement POST /api/simulateur** — `0fe6fdc` (feat)
3. **Task 3: Unit-test the spam guard and the notification trigger** — `8628603` (test)

**Plan metadata:** this SUMMARY + REQUIREMENTS.md land in the worktree's final metadata commit per worktree protocol (STATE.md/ROADMAP.md excluded — orchestrator-owned).

## Files Created/Modified

- `src/lib/supabase.ts` — added `createServiceRoleClient()`; corrected `createServerClient()`'s misleading comment (comment-only change, body/signature untouched)
- `src/app/api/simulateur/route.ts` — new POST-only Route Handler: honeypot/timing silent-reject, `prospectSchema.safeParse`, sha256 IP hashing, explicit-field `insert()` into `public.prospects` via the service-role client, one escaped Resend notification, fixed non-leaking error responses
- `src/app/api/simulateur/route.test.ts` — 13 tests: 3 spam-guard, 4 notification (incl. XSS escaping and insert-failure suppression), 3 insert-shape (key set, IP hash present/absent), 1 happy-path, 3 validation (missing telephone, consent false, malformed body)

## Vercel Production Status of SUPABASE_SERVICE_ROLE_KEY

**Could not determine.** No Vercel MCP tools (`mcp__plugin_vercel_vercel__*`) were exposed to this worktree executor's toolset in this session, so the Production environment variable list could not be queried. Per 05-RESEARCH.md's Open Question 1 and this plan's Task 1 contingency, this is recorded here rather than assumed:

### Production blocker

If `SUPABASE_SERVICE_ROLE_KEY` is not set in the Vercel Production environment (only confirmed locally in `.env` per 05-RESEARCH.md's "New Finding" section, 221 characters, populated), `POST /api/simulateur` will return HTTP 500 on every request in production once deployed, because `createServiceRoleClient()` reads `process.env.SUPABASE_SERVICE_ROLE_KEY!` with a non-null assertion. **This must be verified against the live Vercel project (dashboard → Project → Settings → Environment Variables → Production, or Vercel MCP tooling from a session that has it available) before this endpoint is relied upon in production.**

## Decisions Made

- **13th test added beyond the plan's literal 12-case behavior list:** the plan's `<behavior>` block enumerates exactly 12 test cases (3 spam + 3 notification + 6 remaining) but its `<acceptance_criteria>` requires "at least 13 passing tests." Added one additional happy-path assertion (`valid payload returns 200 with { ok: true } after insert and notification succeed`) rather than artificially splitting an existing case, keeping every explicitly-specified assertion intact and distinct.
- **Resend mock as a class, not `vi.fn().mockImplementation()`:** the route calls `new Resend(process.env.RESEND_API_KEY)`. An arrow-function mock implementation throws `TypeError: ... is not a constructor` when invoked with `new` — discovered on first test run, fixed by mocking `Resend` as a real `class` whose `emails.send` delegates to the shared spy.
- **Generic-typed `vi.fn<...>()` mocks instead of inline async-arrow implementations with unused parameters:** avoids `@typescript-eslint/no-unused-vars` warnings on placeholder parameter names while still giving `insertMock`/`sendMock` precise call-argument types for `mock.calls[n][0]` access in assertions.
- **Temporary `.env.local` for build verification only, deleted immediately after:** this worktree has no `.env` at all (gitignored everywhere, never checked into any git ref). `npm run build` needs *some* value for `NEXT_PUBLIC_SUPABASE_URL` (module-level `createClient()` calls throw `supabaseUrl is required` otherwise) even though those values are never read at request time by the new route in a way that matters for this check. Dummy values were written, `npm run build` was run to confirm `/api/simulateur` compiles and appears in the route table, `.next/static` was grepped for the dummy service-role key (zero matches, confirming Pitfall 4 is closed), then both `.env.local` and `.next/` were deleted before committing anything.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Resend mock could not be constructed with `new`**
- **Found during:** Task 3, first `vitest run` of the new test file
- **Issue:** `vi.mock('resend', () => ({ Resend: vi.fn().mockImplementation(() => ({...})) }))` produced `TypeError: () => ({...}) is not a constructor` because the route legitimately calls `new Resend(...)`, and an arrow function passed to `mockImplementation` cannot serve as a constructor target.
- **Fix:** Replaced the mock factory with `Resend: class { emails = { send: sendMock } }` — a real class, safely constructible with `new`, delegating to the same shared `sendMock` spy so call-count/argument assertions are unaffected.
- **Files modified:** `src/app/api/simulateur/route.test.ts`
- **Verification:** `npx vitest run src/app/api/simulateur/route.test.ts` — all tests progressed past the constructor call; full suite green after this fix.
- **Committed in:** `8628603` (the fix was made before the first commit of this file — no separate commit needed)

**2. [Rule 1 - Bug] TypeScript errors from untyped `vi.fn()` mock implementations**
- **Found during:** Task 3, `npx tsc --noEmit` verification step
- **Issue:** `insertMock`/`sendMock` declared via `vi.fn(async () => ({...}))` inferred overly narrow call-argument types, causing 9 `tsc` errors on `mock.calls[0][0]` casts and on `mockResolvedValueOnce({ error: { message: 'boom' } })` (narrowed to `null`-only).
- **Fix:** Declared both mocks with explicit generic signatures (`vi.fn<(row: Record<string, unknown>) => Promise<{ error: {...} | null }>>()` and the equivalent for `sendMock`), and added typed `lastInsertedRow()`/`lastSendCall()` helpers instead of inline `as` casts at each call site.
- **Files modified:** `src/app/api/simulateur/route.test.ts`
- **Verification:** `npx tsc --noEmit` exits 0.
- **Committed in:** `8628603`

### Out of Scope (logged, not fixed)

**3. Pre-existing repo-wide `npm run lint` failures**
- **Found during:** Plan-level `<verification>` item 3 (`npm run lint` full-repo run)
- **Issue:** Same 22 pre-existing ESLint errors documented in `05-01-SUMMARY.md` and `deferred-items.md` (unrelated components: `Footer.tsx`, `Navbar.tsx`, `HeroSection.tsx`, `LanguageContext.tsx`, `CinemaIntro.tsx`, etc.) still cause `npm run lint` to exit 1 at the whole-repo level. None of these files were touched by this plan.
- **Action:** Not fixed — out of scope per the Scope Boundary rule. This plan's own three files (`src/lib/supabase.ts`, `src/app/api/simulateur/route.ts`, `src/app/api/simulateur/route.test.ts`) lint with zero errors/warnings when linted individually (`npx eslint <file>` for each, confirmed).
- **Already logged in:** `.planning/phases/05-prospect-capture-backend/deferred-items.md` (Plan 01) — not duplicated here.

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bugs, both in the new test file, both fixed before the file's only commit), 1 pre-existing out-of-scope item reconfirmed (not newly discovered).
**Impact on plan:** No scope creep. `src/app/api/simulateur/route.ts` itself required zero fixes once the test-mock plumbing was corrected — all 13 tests passed against the Task 2 implementation as originally written, meaning Task 2's careful order-of-operations (spam check before validation before Supabase before Resend) and explicit field mapping were correct on first test.

## Issues Encountered

None beyond the two auto-fixed test-file issues above. `npm run build` required a temporary local `.env.local` (never committed, deleted after use) because this specific worktree ships with zero environment configuration — this is an execution-environment characteristic, not a code defect, and is documented under Decisions Made.

## Graphify Note

`CLAUDE.md`'s project-level rule to run `graphify update .` after code changes could not be honored in this worktree: neither `CLAUDE.md` nor `graphify-out/` exist here (both are untracked/gitignored in the main checkout per the `git status` snapshot shared with this session, so a fresh worktree created from a merged commit does not carry them). This is a structural limitation of worktree isolation for gitignored tooling, not a plan omission — the orchestrator's main-checkout session should run `graphify update .` after this worktree is merged, if the graphify convention is to be kept current.

## User Setup Required

**SUPABASE_SERVICE_ROLE_KEY in Vercel Production** — must be verified/set before this endpoint is used in production. See "Vercel Production Status" section above. No other external service configuration required (Resend, local Supabase creds already confirmed present per 05-RESEARCH.md and 05-02-SUMMARY.md).

## Next Phase Readiness

- `POST /api/simulateur` is fully buildable and curl-testable today: `curl -X POST localhost:3000/api/simulateur -H 'Content-Type: application/json' -d '{...valid payload...}'` against a local dev server with real `.env.local` credentials.
- Phase 7's simulator UI can build against this endpoint's stable contract (`prospectSchema`/`ProspectSubmission` from Plan 01) without any further backend changes anticipated.
- Plan 04 (this phase's remaining wave) can proceed — it depends on this plan's completion.
- **Concern carried forward:** the Vercel Production `SUPABASE_SERVICE_ROLE_KEY` check remains unresolved; Plan 04 or the phase-level verifier should attempt it with a session that has Vercel MCP tools available, or the human should confirm it manually via the Vercel dashboard before Phase 7 ships this endpoint to real users.

---
*Phase: 05-prospect-capture-backend*
*Completed: 2026-09-20*

## Self-Check: PASSED

All created/modified files verified present (`src/lib/supabase.ts`, `src/app/api/simulateur/route.ts`, `src/app/api/simulateur/route.test.ts`, `.planning/phases/05-prospect-capture-backend/05-03-SUMMARY.md`). All claimed commit hashes verified present in `git log` (`c889a84`, `0fe6fdc`, `8628603`).
