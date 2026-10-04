---
phase: 14-electronic-signature
plan: 10
subsystem: documents, copy
tags: [contract-v2, evidence-clause, copy, signature]
requires: ["14-03"]
provides:
  - "ContractV2 template (evidence clause, no countersignature statement)"
  - "PROJECT_COPY.signature (all phase-14 French strings)"
affects: [14-15, 14-16, 14-17]
key-files:
  created:
    - src/lib/documents/pdf/templates/contract/v2/ContractV2.tsx
    - src/lib/projects/signatureCopy.test.ts
  modified:
    - src/lib/documents/registry.ts
    - src/lib/documents/types.ts
    - src/lib/documents/render.test.ts
    - src/lib/documents/types.test.ts
    - src/lib/projects/copy.ts
decisions:
  - "Evidence clause is Article 10 of ContractV2 (law moves to Article 11); text imported from consentText PROOF_CLAUSE.v1"
  - "admin.actions keys follow the real SIGNATURE_EVENTS names and a test pins equality with SIGNATURE_EVENT_LABELS"
metrics:
  tasks: 2
  completed: 2026-10-04
---

# Phase 14 Plan 10: Contract v2 and signature copy Summary

ContractV2 adds the evidence-agreement article (from the single legal module consentText.ts, including the "Sèvalys ne contre-signe pas" sentence), is the current contract template, and v1 stays untouched; PROJECT_COPY.signature centralises every phase-14 French string.

## Commits
- 0047f2e feat(14-10): contract template v2 with evidence clause
- feat(14-10): PROJECT_COPY.signature and frozen-document sentence (second commit, see git log)

## Deviations from Plan

1. **[Rule 1 - Bug] Registry import typo.** An edit produced `InvoiceV1from` in registry.ts in the first commit; vitest still passed but tsc failed. Fixed in the second commit.
2. **Documented copy deviation (as planned).** `code.signFailed` ("Aucune signature n'a été enregistrée") is for code-verification failure only; `code.finalizePending` plus `finalizeAction` 'Reprendre la finalisation' is for recorded-but-unsealed signatures (protocols A/B/C).
3. Audit action keys use the real event names from events.ts rather than the UI-SPEC prose labels; labels are identical to SIGNATURE_EVENT_LABELS.

## Deferred Issues
- `src/lib/signature/verifyChain.test.ts` L20 has a pre-existing tsc error (eventType typed as string), from an earlier plan, out of scope.

## Known Stubs
None. Legal texts remain provisional pending legal review (STATE blocker).

## Verification
vitest on src/lib/documents, src/lib/projects, src/components/admin/projects, src/app/admin/projets, src/lib/server/documents: all green. git diff on contract/v1: empty.

## Self-Check: PASSED
