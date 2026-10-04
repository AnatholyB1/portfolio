---
status: partial
phase: 14-electronic-signature
source: [14-VERIFICATION.md]
updated: 2026-10-04
---

# Phase 14 — Human UAT

Automated verification found no code gaps (4/4 success criteria). Two items need a human.

## Tests

### 1. Safari iOS PDF iframe
expected: Open the signing page (`/espace-client/documents/<id>/signer`) on an iPhone; the PDF shows (or the "ouvrir dans un nouvel onglet" fallback works) and the signature can be completed.
result: pending

### 2. Legal review of provisional texts
expected: The consent texts and evidence-agreement clause (`src/lib/signature/consentText.ts`, contract template v2) are reviewed by a legal professional before real client contracts are signed. Any change is a new version, never an edit of v1.
result: pending (risk accepted 2026-10-03)

## Summary
total: 2 — passed: 0 — pending: 2
