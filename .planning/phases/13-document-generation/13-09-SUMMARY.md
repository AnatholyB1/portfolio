---
phase: 13-document-generation
plan: 09
subsystem: testing
tags: [rls, supabase, storage, vitest, append-only]
requires: [13-07]
provides:
  - RLS + storage + RPC integration suite for phase 13 documents
affects: [13-16]
key-files:
  created: [tests/rls/documents.rls.test.ts]
  modified: [tests/rls/helpers.ts]
requirements-completed: [DOC-02, DOC-03]
duration: 15min
completed: 2026-10-03
---

# Phase 13 Plan 09: Documents RLS suite Summary

Integration suite (23 tests) proving isolation, append-only, column grant, admin-only snapshots, private write-once bucket, chain rules, race safety and outbox rows on Supabase branch sv-rls-p13.

## Test results
- `npm run test:rls -- documents`: 23/23 passed.
- Full `npm run test:rls`: 15 files, 153/153 passed.

Coverage: read isolation matrix (members A/A2/B, anon, plain, Gecko, admin); storage_path column denied; snapshots admin-only; service_role UPDATE/DELETE denied (sv_immutable_table); TRUNCATE denied via `supabase db query --db-url` (mirrors facts suite, no limitation); authenticated insert and RPC execute denied; bucket private, no list/download for any user token, upsert:false duplicate upload fails, signed URL expires; RPC rules (replaces mismatch, revision mismatch, already issued, path mismatch, invoice rejected, unknown project); concurrent replacement yields one success and a single head; outbox one row per distinct member e-mail, key `document_issued:{id}:{email}`, payload keys documentLabel/projectTitle/revision, ids equal RPC outbox_ids.

## Deviations
**[Rule 1 - Bug] issueTestDocument used template_version 'test-1'**, which violates the migration check `^v[0-9]+$`. Changed to 'v1' in tests/rls/helpers.ts.

## Notes
- One document object uploaded by the first failed run (before the fix) remains in the branch bucket; harmless, branch is throwaway.
- Never touched the "Test E2E Sèvalys" fixture; `.env.test.local` copy removed, not committed.

Commit: aa0386d
