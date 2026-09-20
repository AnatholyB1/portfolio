-- supabase/migrations/20260920000000_create_prospects_table.sql
--
-- Sèvalys v1.1 — Phase 5 (Prospect Capture Backend)
-- Creates the repo's first tracked schema migration: a dedicated `prospects`
-- table for the diagnostic-simulator lead capture flow (CRM-01, CRM-02, D-04).
-- This table is intentionally separate from the products/orders/stock demo
-- CRM used by the VAPI voice agent — do not reference or alter those tables
-- here.

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nom text not null check (char_length(trim(nom)) > 0),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telephone text not null check (char_length(trim(telephone)) > 0),
  reponses_diagnostic jsonb not null,
  services_recommandes jsonb not null,
  consentement_rgpd boolean not null,
  ip_hash text,
  constraint consentement_requis check (consentement_rgpd = true)
);

-- This is a dedicated lead-capture table, separate from the existing demo
-- CRM schema (see the file header above) — not conflated with it here.
comment on table public.prospects is
  'Diagnostic simulator leads (Sèvalys v1.1, Phase 5/7). Dedicated lead-capture table, separate from the existing demo CRM schema. 12-month retention via pg_cron, see purge job below.';

alter table public.prospects enable row level security;

-- No anon/authenticated policy is created on purpose. The only writer is the
-- server-side Route Handler using the service_role key (bypasses RLS by
-- design), which structurally closes the direct-PostgREST bypass described
-- in 05-RESEARCH.md Pitfall 2. Enabling RLS above does not by itself revoke
-- a pre-existing GRANT on this table, so the explicit revoke below is
-- required and not redundant (defense in depth against default privileges).
revoke all on table public.prospects from anon, authenticated;

-- 12-month retention purge (D-04)
create extension if not exists pg_cron;

select cron.schedule(
  'purge-prospects-12mo',
  '0 3 * * *', -- daily, 03:00 UTC
  $$ delete from public.prospects where created_at < now() - interval '12 months' $$
);
