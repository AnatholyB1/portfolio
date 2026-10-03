---
phase: 12-conversion-projects-step-engine
plan: 06
subsystem: mail
tags: [outbox, cron, vercel, invitation]
requires: [12-04]
provides:
  - Invitation and resend routed through the mail outbox (client_invited, :resend:{n} suffix)
  - checkInviteeEmail export (role_conflict, already_member, existing_account, ok, error)
  - src/lib/admin/companyForm.ts (COMPANY_FIELDS, field, buildCompany)
  - GET /api/cron/mail guarded by CRON_SECRET, daily cron in vercel.json
affects: [12-07, 12-21]
key-files:
  created: [src/lib/admin/companyForm.ts, src/app/api/cron/mail/route.ts, src/app/api/cron/mail/route.test.ts, vercel.json]
  modified: [src/lib/server/clients/invite.ts, src/lib/server/clients/invite.test.ts, src/app/admin/actions.ts]
requirements-completed: [MAIL-01, MAIL-02, PORTAL-01]
completed: 2026-10-03
---

# Phase 12 Plan 06: Invitation via outbox and daily mail cron Summary

The client invitation and its resend now go through `enqueueAndSend` and its journal, the invitee checks are exported once as `checkInviteeEmail`, and a daily Bearer-protected cron flushes due mail.

## Tasks
1. Invite service: Resend call removed, `enqueueAndSend({event:'client_invited'})` with key `client_invited:{id}:{email}`. Resend counts existing `sv_mail_outbox` keys with that prefix and passes it as resendN. A failed send keeps the rows (mailSent false). `buildLoginUrl` re-exported from mail/urls. Commit 1dad623.
2. `buildCompany`, `field`, `COMPANY_FIELDS` moved to `companyForm.ts`; actions.ts imports them. Commit 025e4da.
3. Cron route: timingSafeEqual on equal-length buffers, 401 on missing/wrong/unset secret before any DB call, `processDueMail(25)`; `vercel.json` with one `0 6 * * *` entry. `/api/cron/mail` is not in the private prefixes. Commit 1ad79a3.

## Verification
vitest on clients, admin actions, cron: 54 passed. `tsc` clean.

## Deviations from Plan
None. `field` is also exported from companyForm so actions.ts does not duplicate it.

## Notes
CRON_SECRET must be set in Vercel and the Bearer header behavior confirmed in preview (12-21). STATE.md advance/metric commands not run by this executor beyond the docs commit.

## Self-Check: PASSED
