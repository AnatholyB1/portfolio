# Quick Task 260919-wig Deferred Items

## Out-of-Scope Issues Discovered During Execution

### Build Error: `npm run build` fails when Supabase env vars are unset
- **Discovered during:** Task 2 (`npm run build` verification)
- **File:** `src/lib/supabase.ts` (used by `src/app/api/crm/{orders,products,stock}/route.ts`)
- **Error:** `Error: supabaseUrl is required` thrown during "Collecting page data" for `/api/crm/stock`, which aborts the whole build
- **Root cause:** `src/lib/supabase.ts` calls `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...)` at module load. This fresh worktree has no `.env.local` (env files are gitignored by design), so the vars are empty and the Supabase client constructor throws — unrelated to the contact form changes in this plan.
- **Not fixed here:** `src/lib/supabase.ts` and the CRM routes are untouched by this plan; fixing this would mean either guarding the Supabase client against missing env vars or requiring env vars to always be present at build time — both are architectural decisions outside this quick task's scope.
- **Verified our changes are unaffected:** Re-ran `npm run build` with dummy `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` values (not committed anywhere) and the build completed successfully, with `/api/contact` compiling correctly as a dynamic route alongside the existing CRM routes.
- **Deferred to:** A future plan that hardens `src/lib/supabase.ts` against missing env vars, or ensures CI/deploy environments always inject real Supabase credentials before build.
