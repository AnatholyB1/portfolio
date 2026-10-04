---
phase: 14-electronic-signature
verified: 2026-10-04T14:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open a signed PDF (sealed) and the signing page in an iframe on Safari iOS"
    expected: "PDF renders (or the fallback download link works) with no blank frame"
    why_human: "Real-device behaviour; the owner's end-to-end confirmation did not record an iOS observation"
  - test: "Legal review of provisional v1 consent texts and the evidence-agreement clause (contract template v2)"
    expected: "A lawyer validates or amends the wording, and the version is bumped if it changes"
    why_human: "Legal judgement; tracked pre-existing blocker, risk accepted 2026-10-03"
---

# Phase 14: Electronic signature Verification Report

**Phase goal:** Le client signe en ligne avec une preuve solide, et le projet avance sur la base de documents signés.
**Re-verification:** No (initial)

## Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Consent first, then signing with a one-time code (10 min, 5 attempts) | VERIFIED | `sv_request_signature_code` raises `sv_consent_missing` without a prior `consent_given` event for the same version. It sets `expires_at = now() + interval '10 minutes'`. The code is stored as an HMAC (`^[0-9a-f]{64}$`). `sv_verify_signature_code` increments attempts, locks at >= 5 (`code_locked`), and invalidates expired codes. `attempts` has a DB check `between 0 and 5`. Consent is re-checked at verify time. |
| 2 | Append-only, hash-chained audit trail (timestamp, IP, fingerprint, version), exportable by admin | VERIFIED | `sv_signature_events` has no-update/delete and no-truncate triggers. Privileges are revoked from anon, authenticated and service_role. `append_signature_event` and `signature_link_hash` chain the links. `sv_export_signature_chain` and `sv_verify_signature_chain` exist. The TS offline verifier is `verifyChain.ts`, with a parity test. Admin export is wired through `adminView.ts`, `chain.ts`, `SignaturePanel.tsx` and the admin `actions.ts`. |
| 3 | Sealed PDF with certificate page; stored file hash identical to the signed hash | VERIFIED | `seal.ts` re-downloads the original and re-hashes it against `doc.sha256`, returning `hash_mismatch` on a difference. It appends pdf-lib certificate pages to a copy, with no re-render. It uploads with `upsert:false` to a random path, then calls the atomic `sv_seal_document`, which records the seal sha256 and the original sha256 in the `sealed` event. Seals are append-only. A "signed = frozen" guard exists. |
| 4 | Client validates each delivered step in the PV; signature unlocks next step | VERIFIED | `sv_submit_acceptance` records per-criterion responses (delivered/reserved/refused). Verify and request both require a submission with `refused_count = 0`. `sv_seal_document` posts the `acceptance_signed`, `contract_signed` or `quote_accepted` fact via `sv_post_project_fact`, which feeds the step engine. `AcceptanceChecklist` and `SigningFlow` are wired through `signer/page.tsx` and its `actions.ts`. |

**Score:** 4/4

## Required artifacts and wiring

| Artifact | Status |
|----------|--------|
| `supabase/migrations/20261006000000_sv_signature.sql` (1563 lines, 6 tables, RPCs; applied to production per owner) | VERIFIED |
| `src/lib/signature/*` (canonical, events, chain verify, consent text, signable, certificate, acceptance) | VERIFIED |
| `src/lib/server/signature/*` (codes, chain, seal, certificatePdf, links, clientIp, adminView) | VERIFIED |
| `src/app/espace-client/documents/[id]/signer/{page,actions}` + `SigningFlow`, `OtpInput`, `AcceptanceChecklist` | VERIFIED, WIRED (actions call recordConsent, requestSignatureCode, verifySignatureCode, finalizeSignature) |
| `DocumentsList` "Lire et signer" link; admin `SignaturePanel` | WIRED |
| Mail templates (code, document signed, acceptance refused) | VERIFIED (tests pass) |

## Behavioral spot-checks

| Check | Result |
|-------|--------|
| `vitest` on signature libs, server, migration test, portal, mails, signer actions | 31 files, 281 tests passed |
| `tsc --noEmit` | clean |
| 14-19 release gate (from summary, not re-run in full) | 130 files, 1533 tests |
| RLS integration tests (`tests/rls/signature*.rls.test.ts`) | Not re-run (need a DB branch); production end-to-end was confirmed by the owner on preview ("Tout est bon") |

## Requirements coverage

| ID | Status | Evidence |
|----|--------|----------|
| SIGN-01 | SATISFIED | Truth 1 |
| SIGN-02 | SATISFIED | `sv_record_signature_consent` and the consent gate in request and verify; the contract template v2 carries the evidence clause. Wording is provisional (human item). |
| SIGN-03 | SATISFIED | Truth 2 |
| SIGN-04 | SATISFIED | Truths 2 and 3 |
| SIGN-05 | SATISFIED | Truth 4 |

All five IDs appear in PLAN frontmatter (14-01 to 14-19) and in REQUIREMENTS.md. There are no orphaned requirements. The REQUIREMENTS.md checkboxes and traceability table still show "Pending" and should be updated to Complete.

## Anti-patterns

No TBD, FIXME or XXX markers in the phase files. There is one lint warning (unused `HASH` in `seal.test.ts`), which is informational. No stubs found.

## Human verification required

1. **Safari iOS PDF iframe.** Test: open the signing page and the sealed PDF on an iPhone. Expected: the PDF renders or the fallback works. Why human: real-device behaviour, unverified.
2. **Legal review of the provisional v1 consent texts and evidence clause.** Why human: legal judgement. Tracked blocker, risk accepted 2026-10-03.

## Gaps Summary

No code gaps. Automated and owner-confirmed checks pass. Status is `human_needed` only because of the two non-programmatic items above.

_Verified: 2026-10-04 — Claude (gsd-verifier)_
