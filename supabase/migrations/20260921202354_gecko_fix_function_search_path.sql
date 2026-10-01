-- supabase/migrations/20260921202354_gecko_fix_function_search_path.sql
--
-- Phase 10 — synchronisation de la dérive prod → repo (déjà appliquée en prod, ne pas modifier).
--
-- Pourquoi : cette migration existe dans l'historique prod (version 20260921202354,
-- name gecko_fix_function_search_path) mais pas dans le repo. Une branche Supabase
-- construite depuis les migrations du repo doit refléter la prod pour ces objets.
-- SQL copié verbatim depuis supabase_migrations.schema_migrations.

alter function public.gecko_update_updated_at_column() set search_path = public;
alter function public.gecko_update_reservation_timestamp() set search_path = public;
