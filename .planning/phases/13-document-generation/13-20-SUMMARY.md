---
phase: 13-document-generation
plan: 20
subsystem: verification
tags: [e2e, production, documents, fixture]
requires: [13-19]
provides: ["end-to-end evidence of phase 13 on production with the permanent test client"]
completed: 2026-10-03
---

# Phase 13 Plan 20: End-to-end verification on production Summary

Success criteria 1-3 observed on `https://sevalys.com` with the permanent client "Test E2E Sèvalys" (project `9d54a1e5-2746-4c5d-b298-205d7a125926`). The assistant drove Chrome; the owner typed the only one-time code (client login). The admin session was already open in the owner's Chrome profile (no admin code needed).

## Starting state (Task 1)

Production fixture at step 2 after the owner's two corrective revocations in 13-19 (`deposit_received`, `quote_accepted`); zero documents; zero `document_issued` outbox rows. Client members: `anatholyb+sv-test@gmail.com` and a leftover phase-12 test member `anatholyb+sv-test-p12-202610031045@gmail.com`, so each document produces two e-mails.

## Per-step evidence (Task 2)

| Step | Check | Result | Evidence |
|------|-------|--------|----------|
| 1 | Admin lists Devis and Cahier des charges "À émettre"; nothing exists before "Générer" | pass | Documents section at step 2; 0 rows before |
| 2 | Devis: 2 lines, deposit 30 %, preview with "Aperçu non conservé", issue | pass | Preview PDF 2 pages, totals 1 740,00 € HT / acompte 522,00 € / solde 1 218,00 €, mention "TVA non applicable, art. 293 B du CGI"; issued row "Devis · Version 1", "À signer", model v1, sha256 `9f033803f95d07993521b819b2514141391617c473089257718bfdc1b299054d`, 16 419 bytes |
| 3 | "Voir les données" and "Vérifier l'empreinte" | pass | frozen data read-only (lines, totals, reference DEV-2026-9D54A1E5-1); verify says "L'empreinte correspond au fichier stocké." |
| 4 | Cahier des charges issued | pass | context empty because the fixture's `project_goal` is null (nothing to pre-fill, code reads `projectGoal`); issued v1, sha256 prefix `16220fb7aee3`, 12 946 bytes |
| 5 | Client e-mail and portal tab | pass | Gmail: 8 messages (4 documents × 2 recipients), sender connexion@sevalys.com, subjects "Nouveau document : Devis — Projet ANATHOLY BRICON" etc., no amount in the snippets. Portal Documents tab (owner-typed code): Devis v2 "Signé", Devis v1 "Remplacé" en retrait with "Remplacé par la version 2 du 03/10/2026", Cahier des charges v1 "Émis", Contrat v1 "À signer"; no amount or hash shown |
| 5b | Download hash equals stored hash | pass | downloaded `Devis-DEV-2026-9D54A1E5-2.pdf` sha256 `05d943505994a77516db90fc69e98203c017b89f6485b8270178ffa774dca880` equals the stored sha256 of quote v2 (SQL `sha256 = '…'` true) |
| 6 | "Remplacer" the quote, issue v2 | pass | confirmation text "Il remplacera la version 1, qui restera consultable."; v2 (1 600,00 € HT, acompte 480,00 €, solde 1 120,00 €) "À signer", v1 "Remplacé par la version 2"; e-mail subject "Nouvelle version : Devis — Projet ANATHOLY BRICON" |
| 7 | Post "Devis accepté" in the fact journal | pass | quote v2 status "Signé" for admin and client; project moved to step 3; Devis block disappeared; Contrat "À émettre" appeared |
| 8 | Contract preview and issue | pass | preview 3 pages, "Article 1 — Parties", quote reference DEV-2026-9D54A1E5-2 (version 2) with v2 amounts, 1 600,00 €; issued "Contrat · Version 1", client sees "À signer"; sha256 prefix `4edb2fe51ec3` |
| 9 | Invoice preview (step 6 only) | not reached | fixture at step 3; invoice preview covered by the DOC-04 automated test and 13-12/13-17 unit tests |
| 10 | Read-only integrity after the run | pass | `sv_project_documents` rows for the project = 4 (quote v1, spec v1, quote v2, contract v1); outbox `document_issued` = 8 rows, 8 distinct dedupe keys, 0 not sent; nothing deleted |

DOC-04 (success criterion 4) is covered by the automated mention test (13-05) run in the 13-19 gate (1265 tests passing).

## Observations (not blocking; candidates for a follow-up)

1. **Admin issued-documents table overflows its card** to the right (table wider than the Documents card at 1920 px). Cosmetic.
2. **Replacement form starts empty**: "Remplacer" does not pre-fill the previous version's lines; the admin re-types everything. By design (D-03 says a new document), but a pre-fill from the head snapshot would be friendlier.
3. **Fixture dead-end**: a project advanced past step 2 by hand without a quote cannot issue one (guard step 2, D-05); the way out is revoking the facts (done in 13-19). Real projects follow the order.
4. **Signatory role "Gérant"** stored in the fixture's onboarding for an entreprise individuelle; this is phase-12 data, shown on the contract (should read the owner's real title, e.g. "Entrepreneur individuel").
5. **Leftover test member** `anatholyb+sv-test-p12-202610031045@gmail.com` receives every document mail; harmless, but the permanent fixture could drop it.
6. Downloaded test PDFs remain in the owner's `Downloads` folder (`Devis-DEV-2026-9D54A1E5-2.pdf`); not deleted by the assistant.

## Professional reviews (Task 3, non-blocking)

Decision (owner, 2026-10-03, via interactive question), verbatim: "Accepter le texte provisoire". The owner accepts the current provisional wording (invoice and contract mentions, 293 B regime, EI mention, penalty rate, contract clauses) for use with real clients now; accountant and lawyer reviews remain to be scheduled. A correction after review is a new template version (v2); documents already issued do not change. STATE.md blockers about the reviews should be reworded as "accepted risk, reviews to schedule" at the phase state update.

## Data created in production

Fixture project only: 4 documents with their snapshots and storage objects, 8 outbox rows (sent), one `quote_accepted` fact (journal note "Test E2E phase 13 : acceptation du devis version 2"). Nothing deleted; the fixture client stays.
