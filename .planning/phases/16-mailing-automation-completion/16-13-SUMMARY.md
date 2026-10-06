---
phase: 16-mailing-automation-completion
plan: 13
subsystem: infra
tags: [supabase, vercel, resend, production-apply]
requirements: [MAIL-03, MAIL-04]
completed: 2026-10-06
---

# Plan 16-13 Summary: production apply and provisioning

Executed by the orchestrator with the owner's explicit approvals in the main session (as in 12-20 / 13-16 / 14-18 / 15-19).

## Owner decisions (verbatim, 2026-10-06)
- "Create sv-rls-p16" (test branch, plan 16-05).
- "generate unsubscribe secret; use chrome for vercel aswell; approve prod apply"

## Done
- **Preflight (read-only):** all expectations met; migration sha256 `d8ddcd3b80218eabf3ec49060e5313223f0129950fa5dd62f30c801807fb93ca`, identical to the file applied and tested on `sv-rls-p16`.
- **Resend webhook created** through the Resend API with the project key: id `a06614a7-8fb2-403f-8d12-35bff87a9fa1`, endpoint `https://sevalys.com/api/resend/webhook`, events `email.bounced` and `email.complained`, status enabled. The Resend account is shared with three other domains, so a sender filter was added first (`isOwnSender`, commit 42c1a31): only `@sevalys.com` senders feed the suppression list.
- **Production schema applied** with `supabase db query --linked -f` then `migration repair --status applied 20261008000000`. Verified read-only: four new tables with RLS on; `service_role` insert on `sv_mail_suppressions`, `authenticated` select on `sv_resend_events` and `authenticated` execute on `sv_apply_resend_event` all false; both `sv_mail_outbox` checks contain `review_request` and `mail_suppression_admin`; Gecko policies 24 and storage policies 42 unchanged; test client fixture count 1; suppression rows 0. Security advisors flagged nothing on the new objects.
- **Vercel env (Production and Preview):** `RESEND_WEBHOOK_SECRET`, `UNSUBSCRIBE_SECRET` (48 chars, generated locally), `REVIEW_REQUESTS_ENABLED=false`. Values were piped from a gitignored local file, never printed.
- **Vercel bypass token:** confirmed present in Project, Settings, Deployment Protection (Chrome), added Oct 2.
- **Cleanup:** branch `sv-rls-p16` deleted (only `main` remains); `.env.test.local` and `.env.resend.local` deleted.

## Deviations
- Webhook and secrets were created by the orchestrator through the Resend API and the Vercel CLI instead of the dashboard (owner asked for CLI/MCP/Chrome).
- Added the sender-domain filter to the webhook (not in the plan) because the Resend account is shared.
- Full-suite run after wave 3 required three guard updates (price zones, link audit); committed in 8f0ee00.
