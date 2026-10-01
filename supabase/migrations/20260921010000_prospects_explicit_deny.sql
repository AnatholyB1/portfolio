-- supabase/migrations/20260921010000_prospects_explicit_deny.sql
--
-- Phase 10 — synchronisation de la dérive prod → repo (déjà appliquée en prod, ne pas modifier).
--
-- Pourquoi : cette migration existe dans l'historique prod (version 20260921010000,
-- name prospects_explicit_deny) mais pas dans le repo. Une branche Supabase construite
-- depuis les migrations du repo doit refléter la prod pour cet objet.
--
-- Note : l'historique prod enregistre `statements = null` pour cette version. Le SQL
-- ci-dessous est reconstruit à partir de l'état réel de prod (lecture seule de
-- pg_policies) : une policy ALL, rôles {anon, authenticated}, using(false) / with check(false).
-- Idempotent : sans effet là où la policy existe déjà. Jamais rejoué en prod (version déjà
-- présente dans schema_migrations).

drop policy if exists "prospects service_role only" on public.prospects;

create policy "prospects service_role only"
  on public.prospects
  as permissive
  for all
  to anon, authenticated
  using (false)
  with check (false);
