---
phase: 14-electronic-signature
plan: 18
subsystem: database
tags: [supabase, production, migration, vercel]
requirements-completed: [SIGN-01, SIGN-03, SIGN-04]
completed: 2026-10-04
---

# Plan 14-18 Summary: Production apply

## Owner approval (Task 2)

Asked in the main session on 2026-10-04 and answered directly by the owner, verbatim:
"Approuvé : appliquer la liste telle quelle (Recommended)".
The executor correctly declined to act on an approval relayed as text, so the orchestrator ran the approved list (12-20 / 13-16 precedent).

## Task 3 results (production ref ubxllsvanurkwkohzxau)

| Step | Result |
|---|---|
| sha256 of `20261006000000_sv_signature.sql` | `200e082dfb3e3b60a1c362f54a52ffd612dee16a415ad498d4e9127091d69532` = hash proven on branch in 14-05 |
| `supabase db query --linked -f <migration>` | exit 0 |
| `supabase migration repair --status applied 20261006000000` | history repaired |
| RLS enabled | all six tables true |
| `service_role` INSERT on `sv_signature_events` | false |
| `sv_mail_outbox` checks | 2 checks, each containing document_signed, document_signed_admin, acceptance_refused |
| `authenticated` EXECUTE on `sv_verify_signature_code` | false |
| Gecko policies | 24 (unchanged) |
| `storage.objects` policies | 42 (unchanged) |
| `supabase migration list --linked` | 20261006000000 on both sides |
| Security advisors | 61 findings, 0 on phase-14 objects (all pre-existing, other schemas) |
| `SV_SIGNATURE_CODE_SECRET` | added for Production and Preview (generated locally, piped, never printed) |
| Branch `sv-rls-p14` | deleted; `branches list` shows only main |
| `.env.test.local` | removed |

No data was written to production. The permanent test fixture was not touched.

## Open risks

- Consent texts and the evidence clause are provisional v1 (legal review pending; risk accepted 2026-10-03).
- `mailoutbox.rls.test.ts` is sensitive to many pending outbox rows on a shared branch (seen on sv-rls-p14); harden in a later phase.
- The code that uses the new schema is on master but not yet deployed; plan 14-19 deploys it.
