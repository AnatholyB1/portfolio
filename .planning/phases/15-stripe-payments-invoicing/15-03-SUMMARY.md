---
phase: 15-stripe-payments-invoicing
plan: 03
subsystem: payments
tags: [postgres, migration, invoicing, rls, gapless-numbering, credit-notes]
requires: []
provides:
  - "sv_clients.is_test with lock once invoiced"
  - "sv_invoice_counters + sv_private.next_invoice_seq (gapless FA/AV/TFA/TAV)"
  - "sv_invoices, sv_invoice_lines, sv_invoice_deductions, sv_invoice_pdfs (append-only, RLS)"
  - "public.sv_issue_invoice, sv_issue_credit_note, sv_attach_invoice_pdf (service_role only)"
  - "outbox lists extended with six payment events"
affects: [15-04, 15-07, 15-08, 15-10, 15-11, 15-19]
tech-stack:
  added: []
  patterns: ["counter row upsert in the issuing transaction", "no INSERT grant: rows only through security definer RPCs", "test-only clock injection via sv_private *_at variants"]
key-files:
  created:
    - supabase/migrations/20261007000000_sv_invoices.sql
    - src/lib/invoicesMigration.test.ts
  modified: []
key-decisions:
  - "Credit notes carry net_to_pay 0 (CHECK is conditional on kind); other kinds net = incl - prepaid"
  - "Reminder skip on full credit matches the real dedupe keys payment_reminder:{id}:% and payment_reminder_admin:{id}:d14"
  - "seq limited to 1..9999 so lpad(4) never truncates the number"
  - "vat_regime closed list is franchise/standard, matching the TS type"
requirements-completed: [PAY-03, PAY-04, PAY-05]
duration: 25min
completed: 2026-10-04
---

# Phase 15 Plan 03: Invoice ledger migration Summary

Gapless, append-only invoice ledger (counters, structured header/lines/deductions/PDFs, RLS) with idempotent issuing, credit-note and PDF-attach RPCs; written but NOT applied to any database (branch push 15-08, production 15-19).

## Tasks
1. Tables, counters, test flag, RLS, triggers, outbox lists: 98f1b91
2. Issuing, credit-note, PDF-attach RPCs and static test: f981539

Verification: `invoicesMigration.test.ts`, `migrationLint.test.ts`, `signatureMigration.test.ts`, `docTypesSql.test.ts` all green (37 tests). The SQL itself is not executed on Postgres yet; that is proven in 15-08/15-11.

## Deviations from Plan
1. **[Rule 1 - consistency] Credit note net to pay**: the plan listed both "net_to_pay = total_incl - prepaid" and "credit note net 0". Implemented as a CASE check: credit notes have net 0, other kinds incl - prepaid.
2. **[Rule 1 - bug avoidance] Reminder skip pattern**: the plan's `payment_reminder%:` pattern would not match the actual keys; used `payment_reminder:{id}:%` and the exact admin key.
3. Added `seq between 1 and 9999` (lpad would silently truncate beyond), and extra error codes `sv_invoice_due_missing`, `sv_credit_scope_invalid`, `sv_invoice_not_found`.
4. Task 1 commit holds the file up to the "fin partie 1" marker; Task 2 commit appends the functions.

## Notes for downstream plans
- Payload `periodStart/periodEnd` are ISO date strings (or null).
- Idempotent replay returns `outbox_ids: []`.
- `sv_invoice_pdfs.storage_path` must be `{project_id}/invoices/{invoice_id}.pdf`; no storage bucket/policy created here (15-08 or later must provide the bucket).
- Non-franchise regime takes `vat_total_cents` from the header (not in the documented key list); only franchise is exercised in phase 15.

## Known Stubs
None.

## Threat Flags
None beyond the plan's threat model (T-15-07..12 all mitigated in SQL).

## Self-Check: PASSED
Both files exist; commits 98f1b91 and f981539 verified.
