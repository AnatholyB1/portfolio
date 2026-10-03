---
phase: 12-conversion-projects-step-engine
plan: 20
subsystem: database
tags: [supabase, migration, production, rls, storage]
requires: [12-05, 12-11, 12-12]
provides: [phase-12 schema live in production]
key-files:
  created: []
  modified: []
duration: n/a
completed: 2026-10-03
---

# Phase 12 Plan 20: Production apply of the phase-12 schema

Migration `20261004000000_sv_projects_engine.sql` applied once to the shared production database (ref `ubxllsvanurkwkohzxau`). Test branch deleted. No repo file changed.

## Owner approval (verbatim)

Gate question (asked in this session through an interactive question): "Appliquer la migration de la phase 12 (20261004000000_sv_projects_engine.sql) sur la base de production partagée avec Gecko, puis supprimer la branche de test sv-rls-p12 ?" Owner answer: **"apply prod"**.

The executor agent spawned for Task 3 refused to proceed because the approval reached it only as text in the orchestrator's prompt. The orchestrator therefore ran the approved command list itself in the main session, which holds the owner's actual answer. Nothing outside the approved list was run.

## What ran (in order)

1. `sha256sum` of the migration = `bbb981b33b2fb6e649867d543542b120da8b6417088c5b586a9e1d7ba39fc4ab` (matches the preflight value).
2. `supabase db query --linked -f supabase/migrations/20261004000000_sv_projects_engine.sql` — exit 0, once.
3. `supabase migration repair --status applied 20261004000000` — "Migration history repaired".
4. Read-only verification (below).
5. `supabase db advisors --linked --type security`.
6. `supabase branches delete sv-rls-p12 --project-ref ubxllsvanurkwkohzxau --yes`, then `branches list` shows only `main`.
7. Local `.env.test.local` removed.

## Verification results

- 8 new tables exist, all with RLS enabled: `sv_projects`, `sv_project_facts`, `sv_project_fact_notes`, `sv_client_onboarding`, `sv_project_files`, `sv_project_links`, `sv_project_consents`, `sv_mail_outbox`.
- Bucket `sv-project-files`: `public=false`, `file_size_limit=26214400`.
- `sv_lead_events_type_check` contains `lead_converted`.
- 5 security-definer functions exist: `sv_claim_due_mail`, `sv_client_last_sign_in`, `sv_convert_lead`, `sv_create_project`, `sv_post_project_fact`.
- GECKO_POLICY_COUNT = 24 (unchanged). Storage policies not filtered by `bucket_id` = 0.
- `migration list --linked`: `20261004000000` present locally and remotely.
- Security advisors: 61 WARN, none on an `sv_*` object (all on pre-existing objects); 0 ERROR.
- Permanent fixture "Test E2E Sèvalys" untouched; no test data written to production.

## Notes

- The preflight draft (12-20-PREFLIGHT.md) lacked an earlier-recorded migration hash to compare with; the file has a single commit (5e0f749) and was unmodified.
- The test branch billed hourly until deleted at this step.
- Pre-existing uncommitted `src/proxy.ts` and `12-PATTERNS.md` were left alone.

## Next

12-21 (CRON_SECRET, consent-text ruling, preview and deploy) and 12-22 (production end-to-end check) remain owner-gated.
