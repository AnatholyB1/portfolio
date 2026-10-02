---
phase: 10-foundation-auth-isolation
plan: 11
subsystem: ui
tags: [nextjs, server-actions, admin, rls, siret]
requires:
  - phase: 10-05
    provides: requireAdmin, requireClient, SignOutButton
  - phase: 10-08
    provides: shell components and portal.css
  - phase: 10-09
    provides: lookupSiret, inviteClient, INVITE_COPY
provides:
  - lookupSiretAction, inviteClientAction (requireAdmin-gated)
  - /espace-client shell page, /admin page
  - InviteForm, ClientsTable
affects: [10-12, 10-13]
key-files:
  created:
    - src/app/admin/actions.ts
    - src/app/admin/actions.test.ts
    - src/app/admin/page.tsx
    - src/app/espace-client/page.tsx
    - src/components/admin/InviteForm.tsx
    - src/components/admin/ClientsTable.tsx
key-decisions:
  - "Invite form fields are controlled so values survive React 19 auto form reset on error; success clears state manually"
  - "Actor id comes only from requireAdmin(); formData userId is ignored"
requirements-completed: [FOUND-02, FOUND-03, FOUND-05]
completed: 2026-10-02
---

# Phase 10 Plan 11: Client and admin shells Summary

Client shell (company header, disabled nav, empty state or no-access) and admin page (RLS-read invited clients table plus invite form with SIRET blur lookup, editable read-back and manual fallback), backed by requireAdmin-gated Server Actions.

## Tasks
- Task 1: b857149 admin actions + 15 tests
- Task 2: f573359 pages, InviteForm, ClientsTable

## Deviations from Plan
None in behavior. The login code length is not mentioned in any copy added here.

## Verification
- `npx vitest run src/app/admin/actions.test.ts`: 15 pass; full `npm test`: 38 files, 507 tests pass.
- `npx tsc --noEmit` clean. `eslint` on the new files clean.
- `npm run lint` (whole repo) reports 37 pre-existing errors in unrelated files (e.g. `invite.test.ts`, `siret.test.ts` `no-explicit-any`, LanguageContext); out of scope, not touched.
- `npm run build`: compile and TypeScript steps succeed; "Collecting page data" fails for `/api/crm/stock` with `supabaseUrl is required` because the worktree has no `.env` (pre-existing, unrelated to this plan). Not re-verified with env.
- No service_role import in the pages or components. Nothing applied to any remote database.

## Known Stubs
None.

## Self-Check: PASSED
