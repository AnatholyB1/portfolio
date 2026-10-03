---
phase: 13-document-generation
verified: 2026-10-03T22:10:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
gaps: []
human_verification:
  - test: "Decide on CR-01 (issue.ts orphan upload and failed retry): fix now, or accept and schedule"
    expected: "A decision. Fix = remove the uploaded object after any non-success RPC result (except already_issued), and regenerate documentId in PreviewIssuePanel after a failed issue."
    why_human: "The defect is real and unresolved in code, but it does not break a phase 13 success criterion. Whether to block the phase on it is a product and risk call."
  - test: "Schedule the accountant review (VAT 293 B, invoice mentions) and the lawyer review (contract clauses)"
    expected: "Reviews booked. Any corrections ship as template v2. Issued documents do not change."
    why_human: "The owner accepted provisional wording in 13-20 Task 3. This is an accepted legal risk that cannot be checked in code."
---

# Phase 13: Document generation, Verification Report

**Phase Goal:** Les documents contractuels et comptables sont générés en PDF figés, conformes, et retrouvables par le client
**Verified:** 2026-10-03
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Quote, contract, spec, PV and invoice are generated as PDF from a versioned template and project data, at the right step | VERIFIED | `registry.ts` maps the 5 doc types to `v1` templates. Template files exist for quote, spec, contract, acceptance and invoice. The step guard is in `steps.ts`, and the admin actions and forms exist. In production (13-20), quote, spec and contract were issued and previewed on the fixture project. The invoice is preview-only by design (D-10). The roadmap text says "facture générée en PDF", and that holds for the preview PDF. `issueDocument` returns `invoice_not_issuable`, and the SQL `doc_type` check excludes `invoice`. The roadmap and D-10 are consistent with real issuance deferred to phase 15 (PAY-04). |
| 2 | An issued PDF never changes: write-once bytes, SHA-256, template version, data copy viewable | VERIFIED | The migration has `sv_project_documents` with `sha256` (check `^[0-9a-f]{64}$`), `template_version`, and append-only triggers on UPDATE, DELETE and TRUNCATE. `sv_document_snapshots` holds the JSONB copy and is admin-read only. The upload uses `upsert:false` on a private bucket. The hash is computed on the uploaded buffer. `verifyDocumentHash` re-downloads and compares. Production evidence (13-20): the downloaded v2 PDF sha256 equals the stored sha256. A replacement creates a new row and v1 stays "Remplacé". |
| 3 | The client finds all their documents in their space with status (à signer, signé, payé) | VERIFIED | `DocumentsList.tsx` renders the table. `status.ts` derives status from facts (D-14), with no status column. `createDocumentDownloadUrl` authorizes through an RLS read and then returns a short-lived signed URL. The URL is not rendered in the DOM. Production evidence (13-20): the portal showed "Signé", "Remplacé" in retrait, "Émis" and "À signer". |
| 4 | An automated test fails if a mandatory French legal mention is missing from extracted quote or invoice text | VERIFIED | `legalMentions.test.ts` renders real PDFs (`pdfText(createElement(QuoteV1 ...))`), covers 2 sellers by billing-address variants, and checks mentions by id. A non-vacuity test strips each mention and asserts it is detected. I ran it in the documents suite: 25 files and 249 tests passed. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/migrations/20261005000000_sv_documents.sql` | VERIFIED | Tables, RLS, grants that exclude `storage_path`, triggers, private bucket, `sv_issue_document` RPC (service_role only). Applied to production through `db query -f` plus `migration repair` (13-16-SUMMARY, per the owner). |
| `src/lib/documents/registry.ts` and 5 templates | VERIFIED | All wired. |
| `src/lib/server/documents/{issue,render,prepare,read,download,adminView}.ts` | VERIFIED | Wired, with unit tests. CR-01 applies to `issue.ts`. |
| `src/components/admin/projects/documents/*` | VERIFIED | Wired into the admin project page. |
| `src/components/portal/project/DocumentsList.tsx` and `src/app/espace-client/documents/page.tsx` | VERIFIED | Wired, and exercised in production. |
| `tests/rls/documents.rls.test.ts` | EXISTS | I did not run it, because it needs the Supabase branch. Its coverage is claimed in 13-09. Production behavior (13-20) is consistent with it. |

### Key Link Verification

| From | To | Status | Details |
|------|-----|--------|---------|
| Admin action → `prepareDocument` → `issueDocument` → RPC → outbox mails | WIRED | The `issue.ts` flow is read directly. Production produced 4 documents and 8 outbox rows, all sent. |
| Portal page → `withStatuses` → `DocumentsList` → signed download | WIRED | The download hash matched in production. |
| Verify-hash action → `verifyDocumentHash` | WIRED | Confirmed in 13-20 step 3. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Documents, server, portal and admin unit suites | `npx vitest run src/lib/documents src/lib/server/documents src/components/portal src/components/admin/projects` | 25 files, 249 tests passed | PASS |
| Full gate (13-19 claim) | not re-run | 1265 tests passed, per SUMMARY | NOT RE-RUN |

### Probe Execution

Step 7c: SKIPPED. No probe scripts are declared by the phase plans.

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|-------------|--------------|--------|----------|
| DOC-01 | 13 plans declare it | SATISFIED | Truth 1. Invoice is preview-only per D-10 and the ROADMAP. |
| DOC-02 | 16 plans | SATISFIED | Truth 2. |
| DOC-03 | 14 plans | SATISFIED | Truth 3. |
| DOC-04 | 7 plans | SATISFIED | Truth 4. |

No orphaned IDs. REQUIREMENTS.md maps only DOC-01 to DOC-04 to Phase 13, and all four appear in plan frontmatter.

**Bookkeeping:** the REQUIREMENTS.md checkboxes (lines 42-45) and the traceability rows (lines 157-160) still read `[ ]` and "Pending". Update them to complete when the phase is closed.

### Anti-Patterns Found

No TBD, FIXME or XXX markers in the phase 13 source directories (grep).

Findings from 13-REVIEW.md (referenced, not redone):

| Finding | Severity here | Justification |
|---------|---------------|---------------|
| CR-01 (`issue.ts:62-108`): upload before RPC leaves orphan PDFs, and a retry with the same `documentId` fails with `upload_failed` | WARNING (not a gap) | I confirmed it in the code. The `up.error` branch only checks for an existing row. There is no `remove()` after a failed RPC. It does not break any of the 4 success criteria. Written documents stay immutable and hash-verified. The effect is an admin-side failed retry until a page reload, plus unreferenced private objects that hold PII. They are not listed, not downloadable by clients, and the bucket is private. Production e2e passed. It deserves a fix soon, so it goes in the human decision list. |
| WR-02: outbox dedupe key in SQL is not clamped and could exceed 256 characters | Warning | I confirmed the key is not clamped (SQL line 222). It needs an abnormally long email. It contradicts D-04 only in that edge case. |
| WR-03, WR-04: loose date and number validation that reaches immutable PDFs | Warning | Fixable with a template v2 or a schema tightening. Worth fixing before real clients. |
| WR-08: `signed_no_replace` is enforced in app code only, so a race window of seconds exists | Warning | The RPC does not re-check facts. Low probability, with admin-only actors. |
| WR-01, WR-05, WR-06, WR-07, IN-01 to IN-05 | Warning or info | Not blocking. |

### Human Verification Required

1. **CR-01 decision.** Choose between fixing the orphan upload and retry issue now, or accepting it and scheduling it. The suggested fix is in 13-REVIEW.md. Run `/gsd-code-review-fix 13` or create a gap plan.
2. **Professional reviews.** The accountant review (VAT 293 B, invoice mentions) and the lawyer review (contract) are accepted as a risk by the owner (13-20 Task 3). They need to be scheduled. The STATE.md blockers should be reworded as "accepted risk, reviews to schedule".

Cosmetic items from 13-20 (table overflow in the admin card, no pre-fill on replacement, the "Gérant" role in phase 12 data) are not blocking.

### Gaps Summary

No must-have truth fails. All four roadmap success criteria hold in the code and are backed by owner-driven production evidence. The test suite I re-ran passes. I classified CR-01 as a warning because it affects retry ergonomics and storage hygiene, not the frozen-document, compliance or retrieval guarantees. The status is `human_needed` because the CR-01 decision and the scheduling of the professional reviews are decisions that code checks cannot settle.

---

_Verified: 2026-10-03_
_Verifier: Claude (gsd-verifier)_
