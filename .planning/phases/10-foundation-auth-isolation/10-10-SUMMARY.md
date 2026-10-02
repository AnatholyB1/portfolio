---
phase: 10-foundation-auth-isolation
plan: 10
subsystem: auth
tags: [login, otp, server-actions, supabase, next16]
requires: [10-04, 10-05, 10-07, 10-08]
provides:
  - OTP_LENGTH constant (8) in src/lib/auth/schemas.ts
  - requestCodeAction, verifyCodeAction, confirmLinkAction
  - /connexion page, LoginForm, OtpInput, /auth/confirm page, ConfirmForm
affects: [10-11, 10-13]
key-files:
  created:
    - src/app/connexion/actions.ts
    - src/app/connexion/actions.test.ts
    - src/app/connexion/page.tsx
    - src/app/auth/confirm/actions.ts
    - src/app/auth/confirm/page.tsx
    - src/components/portal/LoginForm.tsx
    - src/components/portal/OtpInput.tsx
    - src/components/portal/ConfirmForm.tsx
  modified:
    - src/lib/auth/schemas.ts
    - src/lib/server/auth/login.ts
    - src/lib/server/mail/inviteEmail.ts
    - src/app/portal.css
requirements-completed: [FOUND-01, FOUND-02]
completed: 2026-10-02
---

# Phase 10 Plan 10: Login experience Summary

Email-then-8-digit-code login on /connexion with a scanner-safe /auth/confirm fallback, server-gated issuance, and a single exported `OTP_LENGTH = 8` driving validation, UI cells and copy.

## Commits
- f3d7bb3 refactor: OTP_LENGTH centralization (schemas, login.ts guard, inviteEmail copy, portal.css grid via `--pt-otp-length`, tests)
- 2cd35fe feat: requestCodeAction, verifyCodeAction, confirmLinkAction + 17 tests
- 66b2ee9 feat: /connexion page, LoginForm, OtpInput, /auth/confirm page, ConfirmForm

## A1 reconciliation
A1 reconciled: no change (10-07 recorded `code=email link=email`, equal to `LOGIN_VERIFY_TYPES`).

## OTP_LENGTH
No `\d{6}` or "6 chiffres" remains in `src`. The code regex, the `email_otp` guard, OtpInput (maxLength, pattern, cells, auto-submit via `requestSubmit`), the step-2 helper copy and the CSS (`grid-template-columns: repeat(var(--pt-otp-length, 8), ...)`, cell font clamped so 8 cells fit 400px) all derive from it. inviteEmail now says "un code de connexion". loginCodeEmail did not mention the length. `tests/rls/auth.rls.test.ts` already accepted 6-10 digits; only a test title was reworded. Test fixtures moved to 8-digit codes; added tests that a 6-digit code is rejected.

## Notes
- /connexion uses `probeSession()` only (stale session shows the expired message, no redirect, no signOut). 10-05 reported the auth.sessions RPC path, so no `sv_session_start` cookie is set.
- verifyOtp types come only from `LOGIN_VERIFY_TYPES`; the URL/client `type` is ignored. A verified user without a role is signed out with the generic error.
- Resend uses `formAction` on the code form's button (60 s countdown); "Changer d'adresse e-mail" returns to step 1.
- The confirm page forwards an optional `next` query param, always passed through `safeNext` in the action.

## Deviations from Plan
None for plan logic. Verification caveats (pre-existing, out of scope):
- `npm run lint` reports 37 errors in unrelated files (`no-explicit-any` in clients tests, `set-state-in-effect` in the language context); eslint on all files touched by this plan is clean.
- `npm run build` compiles and type-checks, then fails at page-data collection on `/api/crm/stock` ("supabaseUrl is required"): the worktree has no `.env`. Not caused by this plan.
- `npx tsc --noEmit` clean; `npm test`: 38 files, 510 tests pass.

## Known Stubs
None.

## Self-Check: PASSED
