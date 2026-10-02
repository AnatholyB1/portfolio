---
phase: 11-lead-attribution-pipeline-consent
plan: 17
status: complete
completed: 2026-10-02
requirements: [LEAD-02, LEAD-03, LEAD-04, LEAD-06, LEAD-08, LEAD-09]
---

# Plan 11-17 — Phase-11 schema applied to production

## Owner approvals (recorded verbatim)

Both given by the owner in the orchestrating session on 2026-10-02, via the question prompt:

- Prod apply: **"apply prod"** (exact commands: 3 × `supabase db query --linked -f <file>` then `supabase migration repair --status applied <version>`, read-only verification, advisor, then `supabase branches delete sv-rls-p11`; with the apply → deploy window accepted).
- Auto-mode defaults: **"Je confirme"** (ATTR_COOKIE_BEFORE_CONSENT = true, frozen source = last touch, 9-month window sliding from last contact, consent log 25 months, one lead per legacy prospect, cost per RDV, click ids not lowercased — documented D-09 deviation).

A delegated executor refused to run Tasks 2-3 on a relayed approval it could not witness; the orchestrator, which received the approval directly, ran them itself with the same command list.

## Preflight (Task 1, commit da3f385)

12 remote migrations, none of the three present; phase-11 objects absent; `public.prospects` = 1 row; cron job `purge-prospects-12mo`; GECKO_POLICY_COUNT = 24. sha256 re-checked immediately before apply, identical to PREFLIGHT:

- `20261003000000_sv_leads_core.sql` ad40a33b…07b4c9
- `20261003010000_sv_consent_funnel.sql` 1008b8e4…7fbada
- `20261003020000_sv_leads_backfill_purge.sql` 658e4c17…ff99dc

## Apply and verification (Task 3)

Applied in order, each followed by `migration repair --status applied`. Read-only verification afterwards:

| Check | Result |
|-------|--------|
| sv_leads, sv_lead_events, sv_consent_log, sv_funnel_v exist | all true |
| legacy leads vs prospects | 1 = 1 |
| `lead_created` events | 1 |
| consent versions `2026-10-v1` | 3 (fr, en, th) |
| cron jobs | `sv-purge-leads` only (`purge-prospects-12mo` gone) |
| GECKO_POLICY_COUNT | 24 (unchanged) |
| migration list | 20261003000000, 20261003010000, 20261003020000 applied remote |
| security advisor (prod) | 61 findings total, 0 related to sv_* objects (pre-existing gecko/sellerie/other-app items out of scope) |

`sv_private.purge_leads()` was not run; no test lead was inserted in prod.

## Cleanup

Branch `sv-rls-p11` deleted (no longer listed), local `.env.test.local` removed. The branch DB password appeared once in test output during 11-10; the branch no longer exists, so it is moot.

## Window until deploy

Until plan 11-18 deploys, the live (old) simulator keeps inserting into `public.prospects`; 11-18 re-runs the idempotent `sv_private.backfill_legacy_prospects()` right after the deploy.
