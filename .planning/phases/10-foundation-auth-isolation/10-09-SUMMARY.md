---
phase: 10-foundation-auth-isolation
plan: 09
subsystem: auth
tags: [invite, siret, supabase-admin, resend, vitest]
requires:
  - phase: 10-01
    provides: createSupabaseAdminClient, isLoginEnabled, getSiteUrl
  - phase: 10-02
    provides: sv_* tables, sv_find_auth_user, sv_role_conflict trigger
provides:
  - inviteSchema, CompanySnapshot, INVITE_COPY (client-safe)
  - lookupSiret (exact-match, minimised)
  - inviteClient (role exclusivity, shared-account guard, rollback)
  - buildInviteEmail
  - scripts/sv-add-admin.mjs admin recovery CLI
affects: [10-11, 10-12]
key-files:
  created:
    - src/lib/admin/inviteSchema.ts
    - src/lib/server/clients/siret.ts
    - src/lib/server/clients/invite.ts
    - src/lib/server/mail/inviteEmail.ts
    - scripts/sv-add-admin.mjs
    - scripts/sv-add-admin.d.mts
    - src/lib/svAddAdmin.test.ts
key-decisions:
  - "Lookups of admins/members use .limit(1) arrays (invited_email is not unique) rather than maybeSingle"
  - "Any lookup failure before createUser returns code 'error' and creates nothing"
requirements-completed: [FOUND-02, FOUND-03]
duration: n/a
completed: 2026-10-02
---

# Phase 10 Plan 09: Invitation domain and admin recovery Summary

Server-side invitation flow (SIRET lookup, passwordless user creation, client and member rows, French email) with pre-account-takeover protection, plus a dry-run-by-default `sv-add-admin` recovery script.

## Tasks
- Task 1: a72a51b invite schema and SIRET lookup (12 tests)
- Task 2: 65598c7 inviteClient and inviteEmail (15 tests)
- Task 3: e006c7e sv-add-admin script, d.mts, 13 tests

## Deviations from Plan
None in behavior. Added `inviteEmail.test.ts` (3 cases), not listed in the plan, to cover the escape/no-image/no-price behavior bullet.
Worktree reset to b57dcc8 at startup; node_modules symlinked from the main repo (gitignored, not committed).

## Safety
The recovery script was only executed with no arguments (usage, exit 1, no network). Nothing was applied to any remote database.

## Known Stubs
None.

## Verification
`npx tsc --noEmit` clean; `npm test`: 29 files, 401 tests pass. Acceptance greps confirmed: no `password` in invite.ts or the script (non-comment lines), `sv_find_auth_user` precedes `createUser`, script not imported by the app.

## Self-Check: PASSED
