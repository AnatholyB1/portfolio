---
phase: 14-electronic-signature
plan: 02
subsystem: signature
tags: [hash-chain, audit-trail, sha256, tdd]
requires: []
provides:
  - SIGNATURE_EVENTS / SIGNATURE_ACTOR_KINDS / SIGNATURE_EVENT_LABELS
  - canonicalJson, LINK_SEPARATOR, HASH_FORMAT_VERSION
  - genesisHash, linkHash, verifyChainExport
  - scripts/verify-trail.mjs offline CLI
affects: [14-04, 14-12, 14-17]
tech-stack:
  added: []
  patterns: [standalone dependency-free verifier, native Node type stripping]
key-files:
  created:
    - src/lib/signature/events.ts
    - src/lib/signature/canonical.ts
    - src/lib/signature/canonical.test.ts
    - src/lib/signature/verifyChain.ts
    - src/lib/signature/verifyChain.test.ts
    - src/lib/signature/chainFixtures.ts
    - src/lib/signature/verifyTrailCli.test.ts
    - scripts/verify-trail.mjs
key-decisions:
  - "verifyChain.ts keeps local copies of constants; test asserts they match canonical.ts/events.ts"
  - "Shared test helper chainFixtures.ts builds exports with an independent hand-joined hash"
metrics:
  tasks: 3
  tests: 29 (src/lib/signature)
  completed: 2026-10-04
---

# Phase 14 Plan 02: Hash chain toolkit and offline verifier Summary

Pure hash-chain toolkit (closed 12-event list with French labels, canonical JSON, SHA-256 link hash with U+001F separator) plus an offline verifier and CLI that reports the first broken seq.

## Usage

`node scripts/verify-trail.mjs <export.json | ->` (Node >= 23.6). Exit 0 = OK with count and head hash, 1 = broken (seq and reason) or bad format, 2 = unreadable input.

## Commits
- 5316d29 test: canonical json and event list (RED)
- ee8cadf feat: canonical json and closed event list
- bdeef88 test: link hash and verifier (RED)
- 4586223 feat: link hash and verifier
- test: CLI tests, then feat: scripts/verify-trail.mjs

## Deviations from Plan

- Added `chainFixtures.ts` (shared test helper, allowed by the plan's "import if exported from shared helper").
- The CLI RED commit was made after both files were drafted, so the CLI RED run was not observed failing separately (tests were committed first, though).
- Environment: worktree had no node_modules; symlinked to the main checkout's (gitignored, not committed).
- Golden vector placeholder: `it.todo` under `describe('golden vector from database')` for 14-12.

## Known Stubs
None (the it.todo is an intentional placeholder for 14-12).

## Self-Check: PASSED
