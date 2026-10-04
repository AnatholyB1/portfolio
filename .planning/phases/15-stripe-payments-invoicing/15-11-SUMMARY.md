---
phase: 15-stripe-payments-invoicing
plan: 11
subsystem: testing
tags: [supabase, rls, vitest, invoices, numbering, immutability, credit-notes]
requires: ["15-08"]
provides:
  - "tests/rls/invoices.rls.test.ts: 23 tests proving the invoice ledger guarantees on sv-rls-p15"
affects: [15-19]
key-files:
  created:
    - tests/rls/invoices.rls.test.ts
key-decisions:
  - "Rollback proof uses a DO block that allocates a number then raises, so the whole transaction rolls back and the number is read from the error text (no multi-statement begin/rollback through the CLI)"
  - "Paris rollover is exercised on the test client (TFA series) so the legal FA counter is never advanced"
  - "Suite marks its own still-pending outbox rows as skipped in afterAll to avoid starving sv_claim_due_mail in mailoutbox.rls.test.ts"
requirements-completed: [PAY-04, PAY-05]
duration: 45min
completed: 2026-10-05
---

# Phase 15 Plan 11: Invoice ledger RLS suite Summary

`tests/rls/invoices.rls.test.ts` (23 tests) is green on the branch sv-rls-p15 and proves, on real Postgres: gapless concurrent numbering, rollback release, Paris year rollover, independent FA/AV/TFA/TAV series, immutability, credit note rules, RLS isolation, retention and the PAY-05 invoice shape. Commits 5136fe4 (suite) and c2d4555 (outbox cleanup).

## What is proven

- 8 parallel `sv_issue_invoice` calls return exactly previous+1..previous+8, distinct, formatted FA-YYYY-NNNN, counter advanced by 8.
- A transaction that allocates a number then fails leaves the counter untouched; the next issue reuses that number.
- `2026-12-31 23:30 UTC` gives a 2027 number with issued_on 2027-01-01, `22:30 UTC` gives 2026.
- Test client invoices are TFA, their credit note TAV; FA and AV counters unchanged; credit note on an FA invoice is AV; `is_test` is locked once invoices exist.
- Idempotency (same key, different id same key), line mismatch, total mismatch, contract/acceptance prerequisites, kind_exists, nothing_to_pay (counter unchanged).
- service_role update/delete refused on the four ledger tables and direct insert refused; the table owner is refused by the triggers (sv_immutable_table, truncate); counter decrement and delete refused (sv_counter_violation).
- Credit notes: reason, cumulative cap, partial then total returns fully_credited true, credit note not creditable, full credit sets pending reminders and the admin alert to `skipped`, an uncredited deposit keeps its reminders pending at +3, +7, +14 days.
- Outbox: one payment_requested per member, nothing on re-issue.
- Isolation: A vs B on invoices, lines, deductions, pdfs; anonymous, plain and Gecko users read nothing; admin reads both; snapshot, created_by, storage_path and counters are hidden; deleting a client with invoices fails.
- PAY-05: final invoice has seller siret/iban, buyer name, VATEX-FR-FRANCHISE, type 380, prepaid equal to the deduction sum, net = total - prepaid; deposit has type 386.

## Deviations from Plan

**1. [Plan vs code] Reminder count** - the plan says three pending reminder rows per member plus an admin row. The migration enqueues two per member (d3, d7) plus one admin row (d14). The test asserts what the migration (and the D-17 comment) implements: 4 client rows for 2 members, 1 admin row. No migration change.

**2. [Plan vs code] service_role mutation error** - service_role holds no UPDATE/DELETE grant, so the API returns `permission denied` rather than `sv_immutable_table`. The suite accepts either for service_role and separately proves the trigger error (`sv_immutable_table`) through the table owner via dbQuery.

**3. [Rollback technique]** - see key-decisions.

**4. [Operational] Mail outbox backlog on the branch** - the full run exposed mailoutbox.rls.test.ts failures (`sv_claim_due_mail`, limit 50) caused by 442 accumulated pending/sending/failed rows on the throwaway branch from previous runs (236 document_issued alone), plus this suite's due payment mails. Fixes: the suite skips its own pending rows in afterAll, and the branch backlog was set to `skipped` once with a branch-only `update` (SV_TEST_DB_URL, never production). After that mailoutbox passes 5/5. The leftover backlog was pre-existing and is the likely cause of the flakiness reported in 15-08.

No migration bug was found; no migration change or re-push was needed.

## Verification

Each RLS file was run alone (`npx vitest run -c vitest.rls.config.ts <file>`), all green: invoices 23, auth 2, consent 8, consents 5, convert 7, documents 23, facts 12, files 8, funnel 2, isolation 37, leads 22, mailoutbox 5 (after the backlog drain), projects 9, retention 2, roles 4, selfsignup 7, signature 14, signatureChain 22. The monolithic `npm run test:rls` was not run (known flaky on this branch per the orchestrator instruction); one transient `counter()` CLI failure occurred in a single invoices run and did not reproduce in three later runs.

## Known Stubs
None.

## Threat Flags
None. T-15-40 held: only the branch URL was used, dbQuery refuses the production ref.

## Self-Check: PASSED
tests/rls/invoices.rls.test.ts exists; commits 5136fe4 and c2d4555 present.
