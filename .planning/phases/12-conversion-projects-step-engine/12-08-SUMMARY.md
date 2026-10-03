---
phase: 12-conversion-projects-step-engine
plan: 08
subsystem: projects
tags: [facts, onboarding, mail, service_role]
requires: ["12-01", "12-02", "12-03", "12-04"]
provides:
  - postProjectFact, revokeProjectFact, loadProjectFacts
  - saveOnboardingBlock, confirmCompany, syncOnboardingFacts
affects: [server actions for admin facts and client onboarding]
tech-stack:
  added: []
  patterns: [step derived before/after never stored, mail failure isolated from writes]
key-files:
  created:
    - src/lib/server/projects/facts.ts
    - src/lib/server/projects/facts.test.ts
    - src/lib/server/projects/onboarding.ts
    - src/lib/server/projects/onboarding.test.ts
decisions:
  - "Before-step computed by removing the new fact id from the loaded list (works for posts and revocations)"
  - "Admin onboarding_completed mail goes through enqueueAndSend only when the RPC reports changed, so idempotence rests on the RPC plus dedupe key"
metrics:
  tasks: 2
  files: 4
  completed: 2026-10-03
---

# Phase 12 Plan 08: Facts and onboarding services Summary

Server services that post project facts via sv_post_project_fact (step recomputed with deriveProjectState, step_changed mail per distinct member) and persist onboarding by block with automatic onboarding_completed system fact and a single admin mail.

## Commits
- c361e80: facts.ts and tests (7 tests)
- 15d3426: onboarding.ts and tests (9 tests)

## Verification
`rtk vitest run src/lib/server/projects` 16 passed; tsc and eslint clean.

## Deviations from Plan
None - plan executed as written. Note: syncOnboardingFacts posts for every project whose RPC reports a change; if an admin revokes an onboarding_completed fact, the next complete onboarding save would re-post it (RPC only guards against an existing non-revoked fact).

## Known Stubs
None.

## Notes
STATE.md / ROADMAP.md updates are left to the orchestrator-side commands below.

## Self-Check: PASSED
