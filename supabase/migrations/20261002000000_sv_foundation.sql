-- supabase/migrations/20261002000000_sv_foundation.sql
--
-- Sèvalys — Phase 10 (Foundation, Auth, Isolation) — FOUND-02, FOUND-03.
-- Tables de rôles/tenants sv_*, RLS deny-by-default, helpers privés,
-- triggers d'exclusivité de rôle, fonctions réservées au service_role, seed admin.
--
-- Pourquoi revoke-then-grant : le projet Supabase est partagé avec Ziko/Gecko et
-- les privilèges par défaut donnent ALL à anon/authenticated sur les nouvelles
-- tables. Chaque table sv_* révoque donc explicitement, puis n'accorde que SELECT.
-- Les rôles ne viennent jamais des métadonnées JWT (D-06) : uniquement des tables.
-- Le code de connexion n'est jamais émis via signInWithOtp ; sv_login_allowed filtre
-- côté serveur pour qu'aucun utilisateur auth ne soit créé au login (plan 10-04).

create schema if not exists sv_private;
revoke all on schema sv_private from public, anon;
grant usage on schema sv_private to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.sv_tenants (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.sv_tenants enable row level security;

create table if not exists public.sv_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null default '5e7a1750-0000-4000-8000-000000000001'
    references public.sv_tenants (id),
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.sv_admins enable row level security;

create table if not exists public.sv_clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default '5e7a1750-0000-4000-8000-000000000001'
    references public.sv_tenants (id),
  name text not null check (char_length(trim(name)) between 1 and 200),
  siret text not null unique check (siret ~ '^[0-9]{14}$'),
  siren text generated always as (left(siret, 9)) stored,
  company jsonb,
  company_source text not null default 'api' check (company_source in ('api', 'manual')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.sv_clients enable row level security;
create index if not exists sv_clients_created_at_idx on public.sv_clients (created_at desc);

create table if not exists public.sv_client_members (
  client_id uuid not null references public.sv_clients (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  invited_email text not null,
  role text not null default 'member' check (role in ('member')),
  created_at timestamptz not null default now(),
  primary key (client_id, user_id),
  unique (user_id)
);
alter table public.sv_client_members enable row level security;

create table if not exists public.sv_throttle (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
alter table public.sv_throttle enable row level security;

-- ---------------------------------------------------------------------------
-- Privileges : deny-by-default, SELECT explicite uniquement
-- ---------------------------------------------------------------------------

revoke all on public.sv_tenants, public.sv_admins, public.sv_clients,
  public.sv_client_members, public.sv_throttle from anon, authenticated;

grant select on public.sv_admins, public.sv_clients, public.sv_client_members to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers privés (schéma sv_private, non exposé par PostgREST)
-- ---------------------------------------------------------------------------

create or replace function sv_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sv_admins where user_id = (select auth.uid())
  );
$$;
revoke all on function sv_private.is_admin() from public, anon;
grant execute on function sv_private.is_admin() to authenticated;

create or replace function sv_private.client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select client_id from public.sv_client_members where user_id = (select auth.uid());
$$;
revoke all on function sv_private.client_ids() from public, anon;
grant execute on function sv_private.client_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Exclusivité de rôle (D-04) : un admin ne peut pas être membre client, et inversement
-- ---------------------------------------------------------------------------

create or replace function sv_private.enforce_admin_exclusive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.sv_client_members where user_id = new.user_id) then
    raise exception 'sv_role_conflict' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function sv_private.enforce_admin_exclusive() from public, anon;

create or replace function sv_private.enforce_member_exclusive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.sv_admins where user_id = new.user_id) then
    raise exception 'sv_role_conflict' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function sv_private.enforce_member_exclusive() from public, anon;

drop trigger if exists sv_admins_exclusive on public.sv_admins;
create trigger sv_admins_exclusive
  before insert or update of user_id on public.sv_admins
  for each row execute function sv_private.enforce_admin_exclusive();

drop trigger if exists sv_client_members_exclusive on public.sv_client_members;
create trigger sv_client_members_exclusive
  before insert or update of user_id on public.sv_client_members
  for each row execute function sv_private.enforce_member_exclusive();

-- ---------------------------------------------------------------------------
-- Policies (SELECT uniquement, rôle authenticated). sv_tenants : aucune policy.
-- ---------------------------------------------------------------------------

drop policy if exists sv_admins_self_read on public.sv_admins;
create policy sv_admins_self_read on public.sv_admins
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists sv_clients_read on public.sv_clients;
create policy sv_clients_read on public.sv_clients
  for select to authenticated
  using ((select sv_private.is_admin()) or id in (select sv_private.client_ids()));

drop policy if exists sv_members_read on public.sv_client_members;
create policy sv_members_read on public.sv_client_members
  for select to authenticated
  using ((select sv_private.is_admin()) or user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- RPC réservées au service_role (appelées par le code serveur uniquement)
-- ---------------------------------------------------------------------------

create or replace function public.sv_login_allowed(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
      and (
        exists (select 1 from public.sv_admins a where a.user_id = u.id)
        or exists (select 1 from public.sv_client_members m where m.user_id = u.id)
      )
  );
$$;
revoke all on function public.sv_login_allowed(text) from public, anon, authenticated;
grant execute on function public.sv_login_allowed(text) to service_role;

create or replace function public.sv_throttle_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket timestamptz;
  v_hits integer;
begin
  v_bucket := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.sv_throttle as t (key, window_start, hits)
  values (p_key, v_bucket, 1)
  on conflict (key, window_start) do update set hits = t.hits + 1
  returning t.hits into v_hits;

  delete from public.sv_throttle where window_start < now() - interval '1 day';

  return v_hits <= p_max;
end;
$$;
revoke all on function public.sv_throttle_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.sv_throttle_hit(text, integer, integer) to service_role;

create or replace function public.sv_session_age_ok(p_session_id uuid, p_max_days integer default 30)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions s
    where s.id = p_session_id
      and s.created_at > now() - make_interval(days => p_max_days)
  );
$$;
revoke all on function public.sv_session_age_ok(uuid, integer) from public, anon, authenticated;
grant execute on function public.sv_session_age_ok(uuid, integer) to service_role;

create or replace function public.sv_find_auth_user(p_email text)
returns table (id uuid, last_sign_in_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.last_sign_in_at
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;
revoke all on function public.sv_find_auth_user(text) from public, anon, authenticated;
grant execute on function public.sv_find_auth_user(text) to service_role;

-- ---------------------------------------------------------------------------
-- Seed (idempotent)
-- ---------------------------------------------------------------------------

insert into public.sv_tenants (id, name)
values ('5e7a1750-0000-4000-8000-000000000001', 'Sèvalys')
on conflict (id) do nothing;

-- D-05 : premier admin issu de l'utilisateur auth existant, jamais depuis l'app.
-- Sur une branche sans données, ceci insère 0 ligne (comportement correct).
insert into public.sv_admins (user_id, email)
select id, lower(email)
from auth.users
where lower(email) = 'contact@sevalys.com'
on conflict (user_id) do nothing;
