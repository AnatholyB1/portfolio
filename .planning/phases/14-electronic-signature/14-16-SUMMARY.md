---
phase: 14-electronic-signature
plan: 16
subsystem: portal-ui
tags: [signing-ui, acceptance-checklist, esign]
requires: [14-13, 14-15]
provides: [signer page, SigningFlow, AcceptanceChecklist, pt-sign styles]
key-files:
  created:
    - src/app/espace-client/documents/[id]/signer/page.tsx
    - src/components/portal/project/SigningFlow.tsx
    - src/components/portal/project/AcceptanceChecklist.tsx
    - src/components/portal/project/signingUi.test.ts
  modified:
    - src/components/portal/project/project.css
metrics:
  tasks: 3 of 3
  completed: 2026-10-04
---

# Phase 14 Plan 16: Client signing page and PV checklist Summary

Client signing page (read in iframe from signed URL, two consents, single one-time-code field, 60 s resend countdown, finalize-resume and signed states) plus the PV acceptance checklist that blocks the code step on any refusal; styled with `pt-sign-*` using existing tokens only.

## Commits
- b82aa77: SigningFlow client component
- c099e13: AcceptanceChecklist and signer page shell
- f464bda: pt-sign-* CSS and static UI test (49 portal tests green)

## Decisions
- AcceptanceChecklist is a client component that renders SigningFlow itself (action props are serializable server action references), so "Modifier mes réponses" is shown only while the flow is in the consent phase; once a code is sent consents are final and the button disappears.
- The page passes `getDownloadUrl={documentDownloadAction}` (not listed in the plan) for the "Télécharger le document" fallback of the original, and `signOutSlot` for the mismatch card.
- PV with an existing non-refused submission goes straight to SigningFlow with a server-computed recap; with no or a refused submission the checklist is shown (only when the signer matches, otherwise the mismatch card).
- Resend countdown is announced only via a separate sr-only live region (at 0); the start is announced by the "Code envoyé" status.

## Deviations from Plan
- [Rule 1] CSS used 12px paddings, which the existing projectUi test forbids; replaced by 8px/16px.
- Reserves recap list on the signed state of a PV (UI-SPEC A3/B) not rendered; signed state shows reference and sealed hash only.

## Known Stubs
None.

## Self-Check: PASSED
Files exist; commits b82aa77 and c099e13 verified; `rtk vitest run src/components/portal` and `rtk tsc --noEmit` green. Visual and device checks deferred to 14-18. RLS suites not run.
