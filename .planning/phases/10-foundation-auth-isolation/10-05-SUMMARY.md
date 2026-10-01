---
phase: 10-foundation-auth-isolation
plan: 05
subsystem: auth
tags: [supabase, proxy, dal, session, next16]
requires: [10-01, 10-02, 10-07, 10-08]
provides:
  - src/proxy.ts (Next 16 proxy, literal matcher)
  - safeNext, isSessionFresh, getVerifiedSession, probeSession, requireAdmin, requireClient, getRoleDestination
  - signOutAction, SignOutButton
affects: [10-10, 10-11]
key-files:
  created:
    - src/lib/auth/safeNext.ts
    - src/lib/auth/safeNext.test.ts
    - src/proxy.ts
    - src/proxy.test.ts
    - src/lib/server/auth/session-age.ts
    - src/lib/server/auth/dal.ts
    - src/lib/server/auth/dal.test.ts
    - src/lib/server/auth/signOut.ts
    - src/components/portal/SignOutButton.tsx
requirements-completed: [FOUND-01, FOUND-03]
completed: 2026-10-02
---

# Phase 10 Plan 05: Session handling and authorization Summary

Next 16 proxy (cookie refresh and anonymous redirect only), a DAL that derives roles from sv_admins/sv_client_members via RLS and enforces a 30-day session cap, safe `next` redirects, and sign-out.

## Tasks
- Task 1: 5ef654e safeNext + proxy + matcher test (12 tests).
- Task 2: DAL, session-age, signOut, SignOutButton (18 tests).

## Session-age path
**auth.sessions RPC path** was implemented (A2 = YES in 10-07: `session_id` present in getClaims and stable across refresh). No signed cookie fallback; plan 10-10 does not need to set `sv_session_start`.

## Notes for plan 10-10
- /connexion must use `probeSession()` (never redirects or signs out) to avoid loops.
- Email OTP length on the branch was 8 digits; do not hardcode 6.
- `requireClient` returns `no_access` for sessions with no role; render `NoAccess` with `SignOutButton` as `action`.

## Deviations from Plan
None. Plan executed as written (RED/GREEN tests were committed together with the implementation per task rather than as separate commits).

## Known Stubs
None.

## Verification
`npm test`: 37 files, 492 tests pass. `npx tsc --noEmit` clean. No `getSession(` or metadata role reads in dal.ts.

## Self-Check: PASSED
