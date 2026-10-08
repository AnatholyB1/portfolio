# 18-15 Task 1: release gate, read-only production preflight, apply package (2026-10-08)

No command in this task modified production (only `migration list --linked` and SELECT-only `db query --linked`). Task 2 (owner approval) and Task 3 (apply) NOT run.

## Release gate (master, clean tree) - ALL GREEN
| Check | Result |
|---|---|
| `rtk npm test` | 204 files, 2355 tests passed |
| `tsc --noEmit` | exit 0 |
| `eslint` (npm run lint) | exit 0, 0 errors, 11 pre-existing warnings (unused vars/directives) |
| `next build` | exit 0 |

## Read-only production preflight (ref ubxllsvanurkwkohzxau)
- `migration list --linked`: 20261009000000 on both sides; 20261010000000 local only (to apply). Pre-existing, unrelated: 20260920000000 and 20260921000000 local-only, several remote-only older versions (this is why `db push` is not used; `db query -f` + `migration repair` is, as in 16-13/17-13).
- to_regclass sv_review_links, sv_reviews, sv_review_moderation_log, sv_review_link_events: all null (PASS).
- phase-18 functions (6 public + 2 sv_private) present: 0 (PASS).
- sv_mail_outbox event_type check: 17 values, includes mail_suppression_admin, no review_published_admin / review_hidden (as expected). template check: same 17 (invite for client_invited). Constraint names: sv_mail_outbox_event_type_check, sv_mail_outbox_template_check (both match the migration's content loop; each matched exactly once).
- Rows violating the NEW event_type list: 0. Rows violating the NEW template list: 0 (PASS, T-18-61).
- GECKO_POLICY_COUNT = 24.
- Storage policies (42, schema storage, table objects): gecko menu images (3), auth delete/upload album-backgrounds/album-covers/album-photos/portfolio-photos (8), public read album-backgrounds/covers/photos + portfolio-photos (4), product_images_select_all, sellerie_preview_product_images_select_all, ziko_* (ai_imports 3, avatar 4, coach_exercises 3, coach_kyc 3, coach_logos 2, coach_videos 3, exports_read, profile_photos 3, scan_photos 3). Post-apply list must be identical (42, same names).
- Fixture `sv_clients` siret 90098846000011: count 1 (PASS).

## Hash comparison
- Local `supabase/migrations/20261010000000_sv_reviews.sql` sha256 = `36e55b3605ddab9899c399c86e5c1cfed9ca8007dea008932084c65708b686e3`
- 18-05 SUMMARY recorded (as pushed to branch): `36e55b3605ddab9899c399c86e5c1cfed9ca8007dea008932084c65708b686e3` -> IDENTICAL (PASS). 18-14 (35/35 on branch) therefore covers this exact file.
- File is 28754 bytes, CRLF line endings.
- Transaction-safety grep (concurrently|vacuum|alter system|begin/commit/rollback outside comments): 0 (PASS).

## Envelope
- Built in the session scratchpad (not in repo): `begin;\n` + file byte for byte + `commit;\n`; 28769 bytes.
- Path: `C:/Users/Anatholy/AppData/Local/Temp/claude/C--portfolio/e0c454c5-6b0d-4972-a2eb-6da6131aebe4/scratchpad/sv_reviews_tx.sql`
- Envelope sha256 = `6241647bb5cafeb5e7fa9dd2407435aa111f05fb1c87fcb0301d8693296f67d4`
- cmp proof: `tail -n +2 "$ENV" | head -n -1 | cmp - supabase/migrations/20261010000000_sv_reviews.sql` -> exit 0; also `tail -c +8 "$ENV" | head -c 28754 | cmp - <file>` -> exit 0. (The plan's `sed '1d;$d'` form is not byte-safe on this Windows msys sed: it strips the CR of CRLF and reports a false diff at char 53; head/tail is used instead. Envelope differs from the file only by the first line `begin;` and last line `commit;`.)

## Cleanup script (prepared, NOT run; only after a new explicit owner approval, only if residue exists after a failed apply)
Stored at scratchpad `cleanup.sql`. Text:
```sql
begin;
drop function if exists public.sv_ensure_review_link(uuid, uuid, text);
drop function if exists public.sv_review_link_state(text);
drop function if exists public.sv_submit_review(text, integer, text, text, text, text, text, boolean, text);
drop function if exists public.sv_public_reviews(integer, integer);
drop function if exists public.sv_moderate_review(uuid, text, text, text, uuid);
drop function if exists public.sv_reissue_review_link(uuid, uuid, text, uuid, text);
drop table if exists public.sv_review_link_events;
drop table if exists public.sv_review_moderation_log;
drop table if exists public.sv_reviews;
drop table if exists public.sv_review_links;
drop function if exists sv_private.review_signed_at(uuid);
drop function if exists sv_private.review_link_guard();
do $$
declare v_name text;
begin
  for v_name in
    select c.conname from pg_constraint c
    where c.conrelid = 'public.sv_mail_outbox'::regclass and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%mail_suppression_admin%'
  loop
    execute format('alter table public.sv_mail_outbox drop constraint %I', v_name);
  end loop;
  alter table public.sv_mail_outbox add constraint sv_mail_outbox_event_type_check check (event_type in ('client_invited', 'step_changed', 'onboarding_completed', 'document_issued', 'document_signed', 'document_signed_admin', 'acceptance_refused', 'payment_requested', 'payment_received', 'payment_reminder', 'payment_reminder_admin', 'payment_anomaly_admin', 'credit_note_issued', 'document_reminder', 'document_reminder_admin', 'review_request', 'mail_suppression_admin'));
  alter table public.sv_mail_outbox add constraint sv_mail_outbox_template_check check (template in ('invite', 'step_changed', 'onboarding_completed', 'document_issued', 'document_signed', 'document_signed_admin', 'acceptance_refused', 'payment_requested', 'payment_received', 'payment_reminder', 'payment_reminder_admin', 'payment_anomaly_admin', 'credit_note_issued', 'document_reminder', 'document_reminder_admin', 'review_request', 'mail_suppression_admin'));
end;
$$;
commit;
```
(Dropping the four tables removes their triggers; the deny_mutation triggers fire on update/delete/truncate only, not drop. Outbox restored to the current 17-value production lists, taken from the preflight definitions.)

## Exact Task 3 command list (to be approved in Task 2)
```
ENV_SQL="C:/Users/Anatholy/AppData/Local/Temp/claude/C--portfolio/e0c454c5-6b0d-4972-a2eb-6da6131aebe4/scratchpad/sv_reviews_tx.sql"
1. sha256sum "$ENV_SQL"                                  # must equal 6241647b...f67d4
2. rtk supabase db query --linked -f "$ENV_SQL"           # single transaction; the ONLY DDL
3. ONLY if step 2 exit 0: rtk supabase migration repair --status applied 20261010000000
4. rtk supabase migration list --linked                   # 20261010000000 on both sides
5. Read-only verification (db query --linked): relrowsecurity true on the 4 tables; has_table_privilege false for service_role insert and authenticated insert on public.sv_reviews, anon select on public.sv_reviews; has_function_privilege false for anon on sv_submit_review(text, integer, text, text, text, text, text, boolean, text), authenticated on sv_public_reviews(integer, integer), service_role on sv_private.review_signed_at(uuid); true for service_role on sv_public_reviews(integer, integer); deny_mutation triggers on sv_reviews, sv_review_moderation_log, sv_review_link_events; exactly one event_type check and one template check on sv_mail_outbox each containing review_hidden and review_published_admin; row counts of the 4 tables = 0; GECKO_POLICY_COUNT = 24; storage policies = the 42 above; fixture count = 1
6. rtk supabase db advisors --linked --type security      # no WARN/ERROR on phase-18 objects
7. rm the envelope and cleanup files from the scratchpad
```
Failure procedure: if step 2 fails, NO repair; read-only: four to_regclass null, pg_proc count of the 6 public names 0, outbox constraints unchanged; record; if residue, present cleanup.sql and wait for a new verbatim approval.

## Awaiting
Task 2 owner approval of the list above (blocking checkpoint). Nothing applied.
