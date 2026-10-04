---
phase: 15-stripe-payments-invoicing
plan: 08
subsystem: testing
tags: [supabase, rls, vitest, branch, invoices, stripe]
requires: [15-03, 15-04]
provides:
  - Supabase test branch sv-rls-p15 (ref jljhirpwrfjcyqyidylx) carrying the phase-10..15 schema
  - RLS helpers setClientTest, reachContractSigned, reachAcceptanceSigned, invoiceHeader, issueTestInvoice, issueTestCreditNote, recordTestSession, applyTestEvent
affects: [15-11, 15-12, 15-19]
key-files:
  modified: [tests/rls/helpers.ts]
requirements-completed: [PAY-02, PAY-04]
completed: 2026-10-05
---

# Phase 15 Plan 08: Test branch and invoice/payment RLS helpers Summary

Branch `sv-rls-p15` carries both phase-15 migrations (applied unchanged) and the helpers for the 15-11 and 15-12 suites are in. `tsc --noEmit` is clean. The full `npm run test:rls` is NOT reliably exit 0, see Deviations item 3.

## Branch and migrations

**Task 1 (read-only):** `supabase branches list` returned only `main` (FUNCTIONS_DEPLOYED). `.env.test.local` did not exist. NEW BRANCH NEEDED.

**Task 2 owner decision (verbatim):** **"Créer la branche sv-rls-p15 (Recommended)"** (option create), recorded 2026-10-05. The branch bills hourly until deleted in 15-19.

**Task 3:**
- `supabase branches create sv-rls-p15` -> ref jljhirpwrfjcyqyidylx, id 4b630e6a-fc36-4e2e-b696-7647506df560.
- `.env.test.local` written by a node script (gitignored: `git check-ignore` prints it; contains no production ref; not committed). `SV_TEST_DB_URL` is the session pooler (port 5432). The secret signature variable is `SV_TEST_SIGNATURE_CODE_SECRET` (32 random bytes hex), as learned in 14-05.
- The branch already carried the phase-14 schema (sv_document_seals present, sv_invoices absent).
- `db push` refused on remote-only history versions. Branch-only repair as in 14-05: reverted the 9 remote-only versions, marked 20260920000000 and 20260921000000 applied, dry-run then listed only the two phase-15 migrations, real push applied both. No repair was made for the phase-15 migrations themselves.
- Migration sha256 (for 15-19), both applied unchanged, no SQL fix:
  - 20261007000000_sv_invoices.sql `3a7ec85af732e954bc16540350439d809d8b3c47b20d7f95ab36d842a62ae26e`
  - 20261007010000_sv_payments.sql `fd24b6f6f044648ca30f5d8523e24aabe1fe3b9ef5fea1080f644ccef53dcc21`
- Verification on the branch:
  - to_regclass not null: sv_invoice_counters, sv_invoices, sv_invoice_lines, sv_invoice_deductions, sv_invoice_pdfs, sv_stripe_customers, sv_checkout_sessions, sv_stripe_events, sv_invoice_payment_events (all nine true).
  - `has_table_privilege('service_role','public.sv_invoices','insert')` = false.
  - `has_table_privilege('authenticated','public.sv_stripe_events','select')` = false.
  - sv_mail_outbox: both `sv_mail_outbox_event_type_check` and `sv_mail_outbox_template_check` contain payment_reminder_admin.
  - `sv_clients.is_test` column exists.
  - Storage policies (5) unchanged and identical to the 14-05 list: Admins can delete gecko menu images, Admins can upload gecko menu images, Public can view gecko menu images, product_images_select_all, sellerie_preview_product_images_select_all.
- Branch-only fixture: `grant select, insert, update, delete on public.gecko_admins to service_role` (same as 13-07 and 14-05); without it makeGeckoAdmin fails.
- Only `branches list/create/get` touched the production ref; no DDL or data change on production. db push, migration repair and queries used SV_TEST_DB_URL only.

## Helpers (tests/rls/helpers.ts)

Added: `setClientTest`, `reachContractSigned` (onboarding_completed, quote_accepted, contract_signed; sv_post_project_fact has no prerequisite check, facts posted in engine order), `reachAcceptanceSigned` (contract chain then deposit_received, production_completed, acceptance_signed), `invoiceHeader` (SELLER_V1 values, buyer 'RLS Client', franchise, 30 days, snapshot `{ test: true }`), `issueTestInvoice` (header totals derived from lines and deductions, deterministic `rls-inv-<id>` key), `issueTestCreditNote`, `recordTestSession` (`cs_test_` + random, amount defaults to the invoice net), `applyTestEvent` (`evt_test_` + random, admin contact@sevalys.com). cleanup() unchanged: tracked ids only, already tolerant of FK and immutability errors. A throwaway test (deleted, not committed) exercised flag test client -> project -> contract_signed -> TFA deposit invoice -> checkout session -> stripe event -> credit note on the branch without any RPC error. Commit 29c4760.

## Deviations from Plan

**1. [Operational] Credential exposure in transcript** - `supabase branches get -o json`, run to inspect the output format, printed the throwaway branch DB password to the agent transcript (the sed mask did not cover POSTGRES_URL). It is the password of the disposable sv-rls-p15 branch only, which is deleted in 15-19; nothing was committed. No production credential was involved.

**2. [Operational] Branch-only history repair and gecko_admins grant** - as in 14-05, see above.

**3. [Unresolved] `npm run test:rls` did not reach exit 0 in any full run** - six full runs on the migrated branch. Failures rotated between runs and none was in a phase-15 object: first runs failed with sign-in errors (auth rate limit, then makeGeckoAdmin until the grant above), later runs failed on a different 1 to 3 tests each time (documents storage list/download, mailoutbox sv_claim_due_mail, auth session refresh, files signed URL expiry, selfsignup). The last run after a 5 minute pause: 188 of 189 tests passed, 16 of 17 files, only `files.rls.test.ts > signed download URL works then expires` failed. Each of the failing files passed when run alone (documents twice 23/23, mailoutbox + auth + selfsignup 14/14). Likely causes: Supabase auth rate limit on a fresh branch and timing-sensitive tests (signed URL expiry, shared outbox claims) under parallel files. The plan acceptance criterion "exit 0" is therefore not demonstrated; no evidence that the phase-15 push broke phases 10-14. Recommendation: before 15-11 and 15-12, rerun `npm run test:rls` after a pause and, if flakiness persists, run files serially (`--no-file-parallelism`) rather than editing the suites.

## Known Stubs
None.

## Threat Flags
None.

## Self-Check: PASSED (with the unresolved item above)
Commit 29c4760 present; helpers.ts exports issueTestInvoice, applyTestEvent, recordTestSession (grep count 3); `.env.test.local` ignored and untracked; throwaway test file removed.
