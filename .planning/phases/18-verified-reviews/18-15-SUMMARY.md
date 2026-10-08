# Phase 18 Plan 15: Production apply of the verified-reviews schema - Summary

Phase-18 schema (4 sv_review* tables, 6 public + 2 sv_private functions, widened sv_mail_outbox checks) applied to production (ref ubxllsvanurkwkohzxau) in one transaction on 2026-10-08, verified read-only; Gecko untouched.

Release gate and preflight evidence: see `18-15-PREFLIGHT.md` (Task 1, all green).

## Task 2: owner approval (verbatim, 2026-10-08)

> "Approve and apply now"

Approving the exact production command list in 18-15-PREFLIGHT.md (envelope sha256 6241647bb5cafeb5e7fa9dd2407435aa111f05fb1c87fcb0301d8693296f67d4, migration sha256 36e55b3605ddab9899c399c86e5c1cfed9ca8007dea008932084c65708b686e3). Scope: only the listed steps; cleanup script needs a new approval (not needed, apply succeeded).

## Task 3: apply and verification

| Step | Command | Result |
|---|---|---|
| 1 | `sha256sum` envelope | 6241647bb5cafeb5e7fa9dd2407435aa111f05fb1c87fcb0301d8693296f67d4 (match) |
| 2 | `supabase db query --linked -f <envelope>` | exit 0, rows [] (single transaction committed) |
| 3 | `supabase migration repair --status applied 20261010000000` | exit 0 (run only after step 2 exit 0) |
| 4 | `supabase migration list --linked` | 20261010000000 on both local and remote |
| 5 | read-only verification | see below |
| 6 | `supabase db advisors --linked --type security` | 61 pre-existing findings, 0 mention sv_review*/review_signed_at/review_link |
| 7 | envelope and cleanup.sql removed from scratchpad | done |

Step 5 results:
- relrowsecurity true on sv_review_links, sv_reviews, sv_review_moderation_log, sv_review_link_events
- has_table_privilege: service_role insert sv_reviews false; authenticated insert sv_reviews false; anon select sv_reviews false
- has_function_privilege: anon sv_submit_review false; authenticated sv_public_reviews false; service_role sv_public_reviews true; service_role sv_private.review_signed_at false
- Triggers: sv_reviews (no_truncate, no_upd_del), sv_review_moderation_log (no_truncate, no_upd_del), sv_review_link_events (no_truncate, no_upd_del), sv_review_links (guard, no_delete, no_truncate); all enabled. (Names are `*_no_upd_del` / `*_no_truncate`, not "deny_mutation".)
- sv_mail_outbox: exactly one event_type check and one template check (sv_mail_outbox_event_type_check, sv_mail_outbox_template_check), both containing review_hidden and review_published_admin
- Row counts of the 4 new tables: 0, 0, 0, 0
- GECKO_POLICY_COUNT = 24 (unchanged)
- Storage policies on storage.objects = 42 (unchanged count; list is the preflight set)
- Fixture sv_clients siret 90098846000011 count = 1

## Deviations from Plan

None. Minor note: the plan's "deny_mutation" trigger wording does not match actual trigger names; the equivalent triggers are present.

## Self-Check: PASSED
