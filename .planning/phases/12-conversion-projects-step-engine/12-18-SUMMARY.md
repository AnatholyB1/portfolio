---
phase: 12-conversion-projects-step-engine
plan: 18
subsystem: client-portal-actions
tags: [server-actions, onboarding, consent, files, portal]
requires: ["12-03", "12-08", "12-09", "12-13"]
provides:
  - "saveOnboardingAction, confirmCompanyAction, setConsentAction, requestUploadAction, confirmUploadAction, downloadAction"
  - "OnboardingCard, ConsentCard client components"
affects: [client-portal-page]
key-files:
  created:
    - src/app/espace-client/actions.ts
    - src/app/espace-client/actions.test.ts
    - src/components/portal/project/OnboardingCard.tsx
    - src/components/portal/project/ConsentCard.tsx
key-decisions:
  - "Every action calls requireClient() first; client_id comes from ctx.client.id, never from FormData"
  - "Project and file access goes through ctx.supabase (RLS client) with uploaderKind 'client'"
  - "Onboarding form fields are controlled so typed values survive a validation error; save on blur only when the block is dirty"
  - "Zod field error keys are mapped to PROJECT_COPY messages in the action (unknown keys fall back to the generic message)"
requirements-completed: [PORTAL-02, PORTAL-05, PORTAL-06]
duration: 20min
completed: 2026-10-03
---

# Phase 12 Plan 18: Client Portal Actions and Cards Summary

Guarded client Server Actions (onboarding blocks, company confirmation, presentation consent, file upload/confirm/download) with an onboarding card (5 save-on-blur blocks, collapsing into "Modifier mes informations" once complete) and a versioned consent card.

## Tasks

1. Client Server Actions and tests (13 tests green): 487d85f
2. OnboardingCard and ConsentCard (tsc clean): 63d506f

## Deviations from Plan

None in behavior. The company legal form is displayed as the stored `forme_juridique_code` (no code-to-label mapping exists in the codebase). Button labels are literal strings where the plan's grep criteria require it.

## Known Stubs

None. The cards are not yet mounted on the portal page (a later plan wires them).

## Self-Check: PASSED
