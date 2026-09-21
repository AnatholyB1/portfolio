# Phase 8 — Deferred Items

Items discovered during execution that are out of scope for the current task/plan
(pre-existing, unrelated to the files being changed) and therefore not auto-fixed
per the executor's SCOPE BOUNDARY rule.

## `npm run build` fails on `/api/crm/products` page-data collection (env gap, not a code defect)

- **Found during:** Plan 08-01, Task 1 self-check (`npm run build` acceptance criterion)
- **Symptom:** `next build` compiles and typechecks successfully ("Compiled successfully"),
  then fails during "Collecting page data" with `Error: supabaseUrl is required.` inside
  `src/lib/supabase.ts`, surfaced via `/api/crm/products`.
- **Root cause:** This worktree has no `.env.local` — `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset (confirmed via `.env.example`). This is an
  environment/secrets provisioning gap in the isolated worktree, not a regression
  introduced by any Phase 8 file change (translations.test.ts / layout.test.ts /
  calculateur-roi/page.test.ts / page.test.ts touch none of the CRM/Supabase code path).
- **Status:** Not fixed — out of scope (CRM API routes are explicitly out of scope per
  PROJECT.md constraints: "CRM API: No changes to `src/app/api/crm/*` routes"). TypeScript
  compilation itself (the actual concern of this plan's `npm run build` acceptance
  criterion — confirming the new test files typecheck) passed cleanly before this
  unrelated runtime error occurred.
- **Action needed:** Provide `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`
  in the execution environment (or worktree provisioning) for a fully green `npm run build`.
