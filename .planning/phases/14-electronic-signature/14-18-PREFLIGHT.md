# 14-18 Task 1: read-only production preflight

Date: 2026-10-04. Target: production ref `ubxllsvanurkwkohzxau` (from `supabase/.temp/project-ref`). Only `migration list --linked`, one SELECT script via `db query --linked`, and `vercel env ls` (names only) were run. Nothing was modified. No credential was printed.

## Migration

- File: `supabase/migrations/20261006000000_sv_signature.sql`
- sha256 now: `200e082dfb3e3b60a1c362f54a52ffd612dee16a415ad498d4e9127091d69532`
- Branch-proven sha256 (14-05 SUMMARY, applied unchanged on `sv-rls-p14`): `200e082dfb3e3b60a1c362f54a52ffd612dee16a415ad498d4e9127091d69532`
- Result: IDENTICAL. Only the 14-04 commits (`0c1a76d`, `334e2de`) touch the file, both before 14-05, so no re-push is needed.

## Remote migration list

Remote applied through `20261005000000` (phase 13 applied). `20261006000000` is local only (remote empty), as expected. Pre-existing mismatches on `20260920000000` and `20260921000000` (local only) and several remote-only April to September versions are not ours (same as 12-20 and 13-16).

## Preflight results

| Check | Result |
|-------|--------|
| to_regclass of sv_signature_events, sv_signature_codes, sv_acceptance_submissions, sv_acceptance_responses, sv_document_signatures, sv_document_seals | all six null |
| functions matching sv_%signature%, sv_%acceptance%, sv_%seal% | 0 |
| sv_mail_outbox_event_type_check | client_invited, step_changed, onboarding_completed, document_issued (no document_signed) |
| sv_mail_outbox_template_check | invite, step_changed, onboarding_completed, document_issued (no document_signed) |
| GECKO_POLICY_COUNT (pg_policies tablename like gecko_%) | 24 (same as 12-20 and 13-16) |
| storage.objects policies | 42 total, none references `sv-documents`; list captured, all filter by bucket_id of gecko, ziko, album, portfolio, product buckets |
| permanent fixture sv_clients siret 90098846000011 | present (1) |
| sv_project_documents rows (affected by the new signed guard) | 4 |
| Vercel CLI | installed (59.24.0), project `anatholyb1s-projects/portfolio` linked |
| SV_SIGNATURE_CODE_SECRET in `vercel env ls` | absent (0 matches) |

The migration creates no storage.objects policy and no bucket.

## Red flags

None blocking. Test branch `sv-rls-p14` still exists and bills hourly; deleted in Task 3. The 4 existing sv_project_documents rows are covered by the guard as proven on the branch (14-11, 14-12 green).

Legal note for approval: consent texts and evidence clause are provisional v1, risk accepted 2026-10-03 per STATE.

## Exact Task 3 command list (run nothing outside it, in order)

1. `sha256sum supabase/migrations/20261006000000_sv_signature.sql` must equal `200e082dfb3e3b60a1c362f54a52ffd612dee16a415ad498d4e9127091d69532`
2. `supabase db query --linked -f supabase/migrations/20261006000000_sv_signature.sql`
3. `supabase migration repair --status applied 20261006000000`
4. Read-only verification via `supabase db query --linked`:
   - six tables exist with `relrowsecurity` true
   - `select has_table_privilege('service_role','public.sv_signature_events','insert')` is false
   - exactly one event_type check and one template check on sv_mail_outbox, each containing document_signed, document_signed_admin and acceptance_refused
   - `select has_function_privilege('authenticated','public.sv_verify_signature_code(uuid, uuid, text, text)','execute')` is false (service_role true)
   - GECKO_POLICY_COUNT = 24; storage.objects policy count = 42 and list unchanged
   - `supabase migration list --linked` shows 20261006000000 on both sides
5. `supabase db advisors --linked --type security`: 0 WARN/ERROR on phase-14 objects
6. Secret (value generated locally, never printed, piped without echo), production and preview:
   - `node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))" | vercel env add SV_SIGNATURE_CODE_SECRET production`
   - same for `preview` with a fresh generation (preview may need an explicit git branch argument, or use the Vercel dashboard / Vercel MCP tool if the CLI refuses)
   - verify with `vercel env ls` (names only)
7. `supabase branches delete sv-rls-p14 --project-ref ubxllsvanurkwkohzxau --yes`, then `supabase branches list --project-ref ubxllsvanurkwkohzxau` shows only main
8. Remove local `.env.test.local`
