---
phase: 15-stripe-payments-invoicing
plan: 10
subsystem: payments
tags: [invoicing, server-modules, pdf, storage, vitest]
requires: ["15-02", "15-03", "15-06", "15-07"]
provides:
  - "loadInvoiceContext(projectId) and InvoiceContext"
  - "buildDepositInput, buildFinalInput, buildPeriodInput, buildCreditNoteInput"
  - "renderLedgerPdf, issueInvoice, issueCreditNote, attachInvoicePdf, sweepMissingPdfs"
affects: [15-14, 15-16]
tech-stack:
  added: []
  patterns: ["two-phase issue: RPC allocates the number, PDF rendered from the stored snapshot and attached once", "upload upsert false, hash of stored bytes on retry"]
key-files:
  created:
    - src/lib/server/invoices/context.ts
    - src/lib/server/invoices/build.ts
    - src/lib/server/invoices/build.test.ts
    - src/lib/server/invoices/render.ts
    - src/lib/server/invoices/issue.ts
    - src/lib/server/invoices/issue.test.ts
  modified:
    - src/lib/server/documents/read.ts
key-decisions:
  - "Builders take an optional trailing id (default randomUUID) so deposit/final keep the (ctx, now) shape; idempotence comes from the issue key"
  - "Final invoice uses the latest deposit invoice and deducts its total minus credits; missing deposit throws deposit_missing"
  - "Sweep lists invoices with an embedded left join on sv_invoice_pdfs filtered by is null"
requirements-completed: [PAY-01, PAY-04, PAY-05]
duration: 25min
completed: 2026-10-05
---

# Phase 15 Plan 10: Invoice issuing core Summary

Server-only issuing core: invoice context loader, RPC input builders for deposit, final, period invoices and credit notes (amounts derived from the frozen contract quote and DB invoices), ledger PDF rendering, and a two-phase issue with write-once PDF attach and a sweep for missing PDFs. `rtk vitest run src/lib/server/invoices src/lib/server/documents` is green (91 tests), tsc and eslint clean.

## Tasks
1. Context and input builders (`loadActiveSnapshot` now accepts 'contract'): 9279926
2. Two-phase issue, PDF attach, sweep: e3f181c

## Deviations from Plan
1. **[Interface extension] issueCreditNote input** also carries `lines` and `snapshot` (the output of buildCreditNoteInput), since the RPC needs them and the plan's `CreditForm` has neither.
2. **[Interface extension] builder signatures**: buildPeriodInput is `(ctx, form, id, now = new Date())`; buildDepositInput/buildFinalInput are `(ctx, now, id = randomUUID())`; buildCreditNoteInput is `(origin, form, now)` with a `CreditOrigin` type (id, number, issuedOn, total, creditedCents, snapshot). Downstream plans 15-14 and 15-16 should use these.
3. Tests were written together with the code rather than as a separate RED commit.
4. Added error codes thrown by builders: `deposit_missing`, `invalid_amount` (credit amount not a positive integer; excess over the invoice is left to the RPC's sv_credit_exceeds_invoice).

## Notes for downstream plans
- Invoice PDFs go to the existing `sv-documents` bucket at `{project}/invoices/{id}.pdf`; 15-08 or later must make sure the bucket accepts this path (service_role writes, no policy change needed).
- `InvoiceContext.invoices` excludes credit notes; credits are summed into `creditedCents`.
- Mail failure maps to `mail: 'failed'`; a replayed issue never re-sends mail.

## Known Stubs
None.

## Threat Flags
None beyond the plan's threat model (T-15-36..39 mitigated: no render when a pdf row exists, amounts built server-side, modules server-only, fixed-string logs).

## Self-Check: PASSED
All created files exist; commits 9279926 and e3f181c verified.
