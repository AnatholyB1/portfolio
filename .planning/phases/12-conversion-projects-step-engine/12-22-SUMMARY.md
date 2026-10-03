---
phase: 12-conversion-projects-step-engine
plan: 22
subsystem: verification
tags: [production, e2e, portal, admin, mail]
requires: [12-21]
completed: 2026-10-03
---

# Phase 12 Plan 22: End-to-end verification on production

Run on https://sevalys.com against the permanent fixture "Test E2E Sèvalys" (SIRET 90098846000011, client id `a9f89b1a-…`). Lead `e184cc42-edcb-4dfa-8264-587ad204d5d1` (address `anatholyb+sv-test-p12-202610031045` plus-variant of the fixture inbox), project `9d54a1e5-2746-4c5d-b298-205d7a125926`.

## How it was run

- A first "Approved" reply arrived before any run: the production read-only check found 0 projects, 0 facts, an empty outbox and the lead still `new`, so it was not accepted as evidence.
- The owner then asked the assistant to drive Chrome. The assistant did every action except typing the one-time login codes: the owner typed each code (admin, then client, then admin again), as PROJECT.md requires. The assistant declined to enter a code even when given one in chat and with an explicit permission.
- Nothing was deleted. The project, the new client member, two files, the useful link and the consent history stay as permanent test data for later phases.

## Per-step results

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Convert disabled below Qualifié, active after | pass | UI "Convertible à partir de « Qualifié »", then button active after status set to Qualifié |
| 2 | One-click conversion, existing SIRET reused, lead stays Qualifié | pass | dialog warns "SIRET correspond à un client existant"; "Client créé. Invitation envoyée…"; DB: `lead_linked=true`, `status=qualified`, 1 fixture client, 1 new member, 1 project |
| 3 | Invitation e-mail and client login | pass (outbox + login) | outbox `client_invited` sent (attempts 1); client logged in with a code the owner typed |
| 4 | Portal timeline, step 1 "En attente de vous", onboarding card visible, rest visible | pass | page text: 6 steps, "Compléter mes informations", onboarding card and files/links/consent sections all visible |
| 5 | Onboarding closes step 1 by itself, admin and client mails | pass | step 1 "terminée", step 2 current "En attente de Sèvalys"; `onboarding_completed` fact (system); outbox `onboarding_completed` (admin) and `step_changed` sent |
| 6 | Upload and download files, `.exe` refused | pass | PDF and PNG `ready`, uploaded by client; `.exe` refused with "Ce type de fichier n'est pas accepté…"; PDF downloaded (193 bytes in Downloads) |
| 7 | `/admin/projets` list and filters | pass | row "Étape 1/6, Client, 0 j"; later `?etape=3&blocage=admin` shows it, `?blocage=client` hides it ("0 projet") |
| 8 | Facts: Devis accepté, no duplicate, Acompte ahead, cancellation | pass | "Devis accepté" → step 3 + "E-mail envoyé au client", then no longer in the select; "Acompte reçu" ahead keeps step 3; "Contrat signé" → step 4 (Production); cancel with reason (≥10 chars) → step back to 3, journal "Contrat signé Annulé" + "Annule : Contrat signé / Motif : …" |
| 9 | Useful link and files seen by admin | pass | link shown to the client under "Liens utiles"; admin sheet lists both files "Client" |
| 10 | Consent give then withdraw, admin history | pass | "Accord donné le 03/10/2026" then "Accord retiré le 03/10/2026"; DB two rows `granted` true/false, version `2026-10-v1`; admin "Historique" shows both |
| 11 | Outbox: no duplicate per event and recipient | pass | 10 rows, all `sent`, `attempts` 1: `client_invited` 1, `onboarding_completed` 1 (admin), `step_changed` 8 (4 step changes × 2 distinct client members); 0 duplicate dedupe_keys, 0 not sent |

## Observations (not blocking)

- The fixture client has two members (`anatholyb+sv-test` and the new p12 address), so each step change mails both: distinct recipients, by design.
- The admin fact form showed no visible "out of order" warning when "Acompte reçu" was selected ahead of "Contrat signé" (UI-SPEC says a warning is shown); the step logic itself behaved correctly (stayed at 3). Worth a look in a follow-up.
- Company legal form still shows the stored code (`1000`) in the portal, and the company address repeats the commune (`…SAINT-JEAN-LE-BLANC, 45650 SAINT-JEAN-LE-BLANC`).
- The browser's previous client session was signed out at the start of the run; the owner's profile was left signed in as admin.
- Test files were created in the scratchpad (PDF, PNG, fake `.exe`); the downloaded PDF remains in the owner's Downloads folder.

## Result

All five roadmap success criteria were observed on production: one-click conversion with invitation, onboarding reused, timeline and facts-driven steps, private files with signed links and presentation consent with date and text kept, e-mail rule engine with idempotent journal, and the admin projects view.
