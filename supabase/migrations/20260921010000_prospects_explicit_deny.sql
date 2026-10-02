-- supabase/migrations/20260921010000_prospects_explicit_deny.sql
--
-- Sèvalys v1.1 — Quick task 260921-v9p (Supabase security hardening)
-- Closes Supabase advisor lint 0008 `rls_enabled_no_policy` for
-- `public.prospects`: RLS was already enabled with zero policies, which the
-- linter correctly flags as an implicit posture (locked by absence of grants
-- rather than a declared intent). This migration adds an explicit
-- restrictive deny-all policy for anon/authenticated so the intent is
-- auditable in SQL, not merely inferred.
--
-- This is behaviour-neutral: the only writer is the server Route Handler at
-- src/app/api/simulateur/route.ts, which uses the service_role key.
-- service_role bypasses RLS entirely, so a deny-all policy scoped to
-- anon/authenticated cannot affect lead capture.
--
-- No anon insert policy is added on purpose. CONTEXT.md floats it as a
-- possible example, but adding one would re-open the direct-PostgREST
-- bypass that 20260920000000_create_prospects_table.sql was written to
-- close (see that file's header comment).
--
-- Scope guard: this database also hosts other tenants' tables (gecko_*,
-- rh_*/swap_shift_employees, etc.) merged in from separate Supabase
-- projects. Those sibling advisor findings are deliberately NOT touched
-- here — they belong to dedicated tenant sessions (gecko-cabane-7e,
-- ziko-platform-0f, ghjulianu-codani-51, ecurie-db) and editing them from
-- this task risks a concurrent-edit conflict on the same policies. This
-- file contains only statements targeting public.prospects.

-- ===========================================================================
-- Explicit restrictive deny-all policy for anon/authenticated
-- ===========================================================================
-- RESTRICTIVE (not PERMISSIVE): restrictive policies AND with all other
-- applicable policies. Even if a future migration adds a permissive policy
-- for anon/authenticated on this table, this restrictive policy still
-- forces the combined result to false until someone deliberately drops it
-- by name.
drop policy if exists "prospects service_role only" on public.prospects;

create policy "prospects service_role only"
  on public.prospects
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ===========================================================================
-- Defense in depth: re-assert the revoke
-- ===========================================================================
-- Harmless if already revoked (20260920000000_create_prospects_table.sql
-- already did this) — re-asserted here so this file is a complete,
-- self-contained statement of intent for this table.
revoke all on table public.prospects from anon, authenticated;

-- ===========================================================================
-- Document the access model on the table itself
-- ===========================================================================
comment on table public.prospects is
  'Diagnostic simulator leads (Sèvalys v1.1, Phase 5/7). Dedicated lead-capture table, separate from the existing demo CRM schema. 12-month retention via pg_cron, see purge job in 20260920000000_create_prospects_table.sql. Access is service_role-only: RLS is enabled and enforced by the restrictive "prospects service_role only" deny-all policy for anon/authenticated above, plus an explicit revoke of all privileges from those roles.';
