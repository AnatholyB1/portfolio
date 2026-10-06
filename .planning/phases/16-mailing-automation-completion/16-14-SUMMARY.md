---
phase: 16-mailing-automation-completion
plan: 14
subsystem: release
tags: [vercel, deploy, resend, production-verification]
requirements: [MAIL-03, MAIL-04]
completed: 2026-10-06
---

# Plan 16-14 Summary: release gate, deploy and production check

Executed by the orchestrator with the owner's explicit approvals in the main session.

## Owner approvals (verbatim, 2026-10-06)
- "approve" (first-run impact: 0 reminders, 0 review requests; preview deploy)
- "approved" (promotion to production and the production verification calls)
- "UTILISE chrome" (browser steps done by the orchestrator in Chrome)

## Release gate
tsc clean; vitest 168 files, 1956 tests; lint 0 errors (9 warnings in untouched files); `next build` exit 0.

## Deploy
- Preview: first two builds failed with "Resource provisioning timed out" before any build log (Vercel side, no incident listed); third attempt Ready. Preview checks as a signed-in team member in Chrome: `/desinscription` 200 + `noindex, nofollow` + no redirect to `/connexion`; webhook POST without signature 400; `GET /api/unsubscribe` 405.
- Production: master fast-forwarded and pushed, production Ready. Webhook unsigned 400, `/desinscription` 200 noindex. `release/phase-16` deleted locally and on the remote.
- `UNSUBSCRIBE_SECRET` was rotated and production redeployed (the first value could not be recovered to build a test link; no marketing mail had ever been sent).

## Production end-to-end
- Resend test sends to `bounced@resend.dev` and `complained@resend.dev` reached the live webhook: bounce -> suppression scope `all` + admin alert sent; complaint -> scope `marketing`; one `sv_resend_events` row each.
- Test client unsubscribe through the signed link in Chrome -> suppression scope `marketing`, cause `unsubscribe`, source `link`, admin alert sent. Transactional mail is not blocked by design (scope marketing).
- Admin `/admin/emails` shows the three rows with the right causes and blocked flows.
- Reactivation of the test client with reason "Test de phase 16" recorded (suppression id 3).
- 0 `review_request` rows and 0 document reminder rows in `sv_mail_outbox`; first-run impact computed beforehand as 0.

## Deviations and honest notes
- **Wrong row lifted:** my first reactivation click in Chrome (element refs from a text search) lifted `bounced@resend.dev` (id 1) instead of the test client with the same reason. It is Resend's own test sink address, so no real recipient is affected, but the log is append-only so it cannot be undone. The test client was then lifted correctly (id 3) by submitting its own form after checking its hidden `suppressionId`. Root cause of the ref mismatch not established.
- **Cron not confirmed:** `CRON_SECRET` is masked in Vercel (pulled value rejected, 401), so the "two calls, queued 0" check was not run by hand. I clicked Run for `/api/cron/mail` in the Vercel dashboard, but the runtime logs tool returned no matching request, so that run is unconfirmed. The first scheduled run (06:00 UTC) should be checked in the logs. First-run impact was computed by read-only SQL: 0 reminders, 0 review requests.
- Production preview checks used the Chrome session instead of the bypass token (the API masks the secret).
- Guard tests added after the full suite (priceScope zones, link audit) and the webhook sender filter (shared Resend account) were committed earlier (8f0ee00, 42c1a31).
