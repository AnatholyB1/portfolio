---
phase: 10-foundation-auth-isolation
plan: 04
subsystem: auth
tags: [supabase, resend, zod, throttle, otp, vitest]
requires:
  - phase: 10-01
    provides: supabase admin client, env getters
  - phase: 10-02
    provides: sv_login_allowed, sv_throttle_hit RPCs
provides:
  - loginEmailSchema, otpCodeSchema, LOGIN_COPY (client-safe)
  - buildLoginCodeEmail, LOGIN_EMAIL_FROM, LOGIN_EMAIL_REPLY_TO, escapeHtml
  - hashKey, hitThrottle (fail-closed)
  - requestLoginCode, issueLoginCode, checkVerifyThrottle, normalizeEmail, LOGIN_VERIFY_TYPES
affects: [10-10, 10-13]
key-files:
  created:
    - src/lib/auth/schemas.ts
    - src/lib/auth/schemas.test.ts
    - src/lib/server/mail/loginCodeEmail.ts
    - src/lib/server/mail/loginCodeEmail.test.ts
    - src/lib/server/auth/throttle.ts
    - src/lib/server/auth/login.ts
    - src/lib/server/auth/login.test.ts
key-decisions:
  - "Email schema uses z.string().trim().toLowerCase().max(254).pipe(z.email()) so normalisation runs before format validation"
  - "Throttle windows 900 s: login-email 5, login-ip 20, verify-email 10, verify-ip 30"
  - "LOGIN_VERIFY_TYPES = { code: 'email', link: 'email' } is provisional (A1), to be reconciled by 10-10 Task 1 with the 10-07 spike"
requirements-completed: [FOUND-01, FOUND-02]
duration: n/a
completed: 2026-10-02
---

# Phase 10 Plan 04: Login-code issuance pipeline Summary

Server-gated login code: `sv_login_allowed` check, then `auth.admin.generateLink`, then own French Resend mail; identical result for invited, unknown and disabled addresses, with fail-closed DB throttling.

## Tasks
- Task 1: 4634432 schemas + French login email (14 tests)
- Task 2: throttle + login pipeline (15 tests), commit hash in git log (`feat(10-04): add throttle and server-gated login-code issuance`)

## OTP expiry (for plan 10-13)
`SUPABASE_ACCESS_TOKEN` was not available, so `mailer_otp_exp` could not be read. Value is **unknown: owner to read in Dashboard, Auth, Providers, Email** and set `SV_OTP_EXPIRY_MINUTES` (seconds / 60). Until set, the email says "durée limitée". Auth config was never modified.

## Deviations from Plan
**[Rule 1 - Bug] Email schema form.** The planned `z.email().trim().toLowerCase()` would validate the format before trimming, rejecting `' Jean@Example.COM '`. Used a string pipe so trim/lowercase run first. Same contract and output.

Also: worktree reset to base b57dcc8 at start; main repo `node_modules` symlinked (not committed).

## Known Stubs
None.

## Verification
`npx tsc --noEmit` clean; `npm test`: 27 files, 389 tests pass. No `signInWithOtp(`/`auth.signUp(` in src; `sv_login_allowed` precedes `generateLink`; fallback link type comes from `LOGIN_VERIFY_TYPES.link`.

## Self-Check: PASSED
