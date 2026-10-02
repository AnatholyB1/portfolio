---
phase: 12-conversion-projects-step-engine
plan: 04
subsystem: mail
tags: [tdd, resend, outbox, idempotency, vitest]
requires: []
provides:
  - "rpc.ts: callRpc service_role wrapper returning sv_* codes without PII"
  - "mail/urls.ts: buildLoginUrl, buildPortalUrl, buildAdminProjectUrl"
  - "mail/rules.ts: MAIL_EVENTS, MAIL_RULES (Record<MailEvent, Rule>), ADMIN_NOTIFY_EMAIL, dedupeKey"
  - "mail/stepChangedEmail.ts, mail/onboardingCompletedEmail.ts templates"
  - "mail/outbox.ts: enqueueMail, sendOutboxRow, enqueueAndSend, processDueMail, buildMail"
affects: [12-05, 12-06, step-engine, daily-cron]
key-files:
  created:
    - src/lib/server/rpc.ts
    - src/lib/server/mail/urls.ts
    - src/lib/server/mail/rules.ts
    - src/lib/server/mail/rules.test.ts
    - src/lib/server/mail/stepChangedEmail.ts
    - src/lib/server/mail/onboardingCompletedEmail.ts
    - src/lib/server/mail/projectEmails.test.ts
    - src/lib/server/mail/outbox.ts
    - src/lib/server/mail/outbox.test.ts
  modified:
    - src/lib/server/mail/inviteEmail.ts
key-decisions:
  - "Claim is a single PostgREST update filtered on id, status in (pending, failed), send_after <= now and the attempts value just read; attempts+1 cannot be atomic in PostgREST so the attempts equality acts as optimistic lock"
  - "enqueueAndSend returns failed when no row id is available, duplicate only when the dedupe row already existed"
requirements-completed: [MAIL-01, MAIL-02]
duration: 15min
completed: 2026-10-03
---

# Phase 12 Plan 04: Mail Engine Summary

Code-defined mail rules (3 events, delay 0) and an idempotent sv_mail_outbox pipeline (insert ON CONFLICT DO NOTHING, atomic claim, Resend idempotencyKey, daily batch) with two new price-free templates.

## Tasks

1. rpc.ts, urls.ts, rules.ts, escapeHtml export, rules tests - c448529
2. step_changed and onboarding_completed templates + tests - 5fb320a
3. outbox.ts (enqueue, claim, deliver, batch) + tests - ad907f9

`npx vitest run src/lib/server/mail`: 43 tests pass. tsc reports no errors in the new files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] enqueueAndSend reported 'duplicate' on database error**
- **Found during:** Task 3 test run
- **Issue:** enqueue error returned `{id: null, inserted: false}`, mapped to 'duplicate'
- **Fix:** check `!id` (failed) before `!inserted` (duplicate)
- **Files modified:** src/lib/server/mail/outbox.ts
- **Commit:** ad907f9

## Known Stubs

None.

## Threat Flags

None. T-12-14..17 mitigations implemented (dedupe + claim + idempotencyKey, escapeHtml, code-only logs, no-throw enqueueAndSend).

## Notes

invite.ts left untouched (12-06 owns the buildLoginUrl re-export). Pre-existing uncommitted src/proxy.ts and 12-PATTERNS.md left alone.

## Self-Check: PASSED
