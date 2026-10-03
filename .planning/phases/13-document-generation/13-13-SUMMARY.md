---
phase: 13-document-generation
plan: 13
subsystem: documents
tags: [snapshot, react-pdf, storage, rpc, outbox]
requires: [13-04, 13-08, 13-10]
provides: [buildSnapshot, clientPartyFrom, renderDocument, issueDocument, aggregateMail]
affects: [13-17]
key-files:
  created:
    - src/lib/documents/snapshot.ts
    - src/lib/documents/snapshot.test.ts
    - src/lib/server/documents/render.ts
    - src/lib/server/documents/issue.ts
    - src/lib/server/documents/issue.test.ts
decisions:
  - "clientPartyFrom sets billingAddress to the company address when billing does not differ (matches fixtures); billingDiffers drives the invoice deliveryAddress"
  - "Deposit invoice totalCents is the deposit amount; balance invoice totalCents is the quote total"
  - "ProjectRef.offerLabel resolved from OFFER_LABELS with the raw slug as fallback"
metrics:
  tasks: 2
  completed: 2026-10-03
---

# Phase 13 Plan 13: Snapshot builder, render and issue services Summary

Pure snapshot assembly for the five document types (totals recomputed in integer cents) plus server-only render and issue services: render once, SHA-256 of the exact uploaded buffer, write-once upload to sv-documents, a single sv_issue_document RPC, then best-effort outbox sending.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | snapshot.ts pure builder (+ 14 tests) | d8d5a34 |
| 2 | render.ts, issue.ts (+ tests) | feb8505 |

## Verification

- `vitest run src/lib/documents src/lib/server/documents`: 164 passed
- `tsc --noEmit`: clean
- `upsert: false` x1, `upsert: true` x0, `renderToBuffer` absent from issue.ts, `new Date(` absent from snapshot.ts

## Deviations from Plan

None - plan executed as written. The RPC also requires `p_id` and `p_doc_type`, which the plan's argument list omitted; they are passed (documentId, snapshot.docType) per the migration signature.

## Known Stubs

None.

## Threat Flags

None. T-13-43 to T-13-48 mitigations are implemented and tested (hash on uploaded buffer, upsert false, upload before RPC, server-recomputed totals, seller refusal, generic log codes).

## Self-Check: PASSED
