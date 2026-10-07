-- Phase 17 : pilotage admin (couts, tresorerie de depart).
--
-- Decisions couvertes : D-04 (aucun agregat stocke : le tableau de bord recalcule depuis les
-- tables sources), D-05 (montants en centimes de depenses reelles, pas de TJM interne),
-- D-06 (une modification de cout recurrent est une nouvelle version de la meme serie),
-- D-07 (un arret est une ligne d'arret, une correction de cout projet est une ligne d'annulation),
-- D-09 (solde de tresorerie de depart en lignes datees), D-14 (lecture admin uniquement,
-- aucune ecriture directe, insertion par RPC service_role).
--
-- Trois tables append-only : aucune ligne n'est jamais modifiee ni supprimee, y compris par service_role.
-- Migration append-only, never applied to production before 17-13 (branche d'essai en 17-06).
-- Le fichier ne contient que des instructions compatibles avec une transaction englobante.

-- ---------------------------------------------------------------------------
-- sv_recurring_costs : versions d'une serie de couts recurrents
-- ---------------------------------------------------------------------------
create table if not exists public.sv_recurring_costs (
  id bigint generated always as identity primary key,
  series_id uuid not null,
  label text not null check (char_length(btrim(label)) between 1 and 120),
  category text not null check (category in ('sous_traitance', 'outils', 'hebergement', 'publicite', 'licences', 'autre')),
  amount_cents bigint not null check (amount_cents > 0),
  frequency text not null check (frequency in ('monthly', 'yearly')),
  starts_on date not null,
  ends_on date null check (ends_on is null or ends_on >= starts_on),
  stopped boolean not null default false,
  created_by uuid null,
  created_at timestamptz not null default now()
);
alter table public.sv_recurring_costs enable row level security;
revoke all on public.sv_recurring_costs from anon, authenticated, service_role;
grant select on public.sv_recurring_costs to authenticated;
grant select on public.sv_recurring_costs to service_role;

create index if not exists sv_recurring_costs_series_idx on public.sv_recurring_costs (series_id, starts_on, id);

drop policy if exists sv_recurring_costs_admin_read on public.sv_recurring_costs;
create policy sv_recurring_costs_admin_read on public.sv_recurring_costs
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_recurring_costs_no_upd_del on public.sv_recurring_costs;
create trigger sv_recurring_costs_no_upd_del
  before update or delete on public.sv_recurring_costs
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_recurring_costs_no_truncate on public.sv_recurring_costs;
create trigger sv_recurring_costs_no_truncate
  before truncate on public.sv_recurring_costs
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_project_costs : couts reels par projet (TTC paye), corrections par annulation
-- ---------------------------------------------------------------------------
create table if not exists public.sv_project_costs (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  incurred_on date not null,
  category text not null check (category in ('sous_traitance', 'outils', 'hebergement', 'publicite', 'licences', 'autre')),
  label text not null check (char_length(btrim(label)) between 1 and 120),
  amount_cents bigint not null check (amount_cents > 0),
  vat_cents bigint null check (vat_cents is null or (vat_cents >= 0 and vat_cents <= amount_cents)),
  voids_cost_id bigint null references public.sv_project_costs (id) on delete restrict,
  created_by uuid null,
  created_at timestamptz not null default now()
);
alter table public.sv_project_costs enable row level security;
revoke all on public.sv_project_costs from anon, authenticated, service_role;
grant select on public.sv_project_costs to authenticated;
grant select on public.sv_project_costs to service_role;

create index if not exists sv_project_costs_project_idx on public.sv_project_costs (project_id);
create unique index if not exists sv_project_costs_one_void on public.sv_project_costs (voids_cost_id) where voids_cost_id is not null;

drop policy if exists sv_project_costs_admin_read on public.sv_project_costs;
create policy sv_project_costs_admin_read on public.sv_project_costs
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_project_costs_no_upd_del on public.sv_project_costs;
create trigger sv_project_costs_no_upd_del
  before update or delete on public.sv_project_costs
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_project_costs_no_truncate on public.sv_project_costs;
create trigger sv_project_costs_no_truncate
  before truncate on public.sv_project_costs
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_cash_balances : soldes de tresorerie de depart (peut etre negatif)
-- ---------------------------------------------------------------------------
create table if not exists public.sv_cash_balances (
  id bigint generated always as identity primary key,
  as_of date not null,
  amount_cents bigint not null,
  note text null check (note is null or char_length(note) <= 200),
  created_by uuid null,
  created_at timestamptz not null default now()
);
alter table public.sv_cash_balances enable row level security;
revoke all on public.sv_cash_balances from anon, authenticated, service_role;
grant select on public.sv_cash_balances to authenticated;
grant select on public.sv_cash_balances to service_role;

drop policy if exists sv_cash_balances_admin_read on public.sv_cash_balances;
create policy sv_cash_balances_admin_read on public.sv_cash_balances
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_cash_balances_no_upd_del on public.sv_cash_balances;
create trigger sv_cash_balances_no_upd_del
  before update or delete on public.sv_cash_balances
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_cash_balances_no_truncate on public.sv_cash_balances;
create trigger sv_cash_balances_no_truncate
  before truncate on public.sv_cash_balances
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- RPC : ajout d'une version de cout recurrent
-- ---------------------------------------------------------------------------
create or replace function public.sv_add_recurring_cost(
  p_series_id uuid,
  p_label text,
  p_category text,
  p_amount_cents bigint,
  p_frequency text,
  p_starts_on date,
  p_ends_on date,
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text := btrim(coalesce(p_label, ''));
  v_series uuid;
  v_id bigint;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'sv_cost_amount_invalid' using errcode = 'P0001';
  end if;
  if v_label = '' or char_length(v_label) > 120 then
    raise exception 'sv_cost_label_invalid' using errcode = 'P0001';
  end if;
  if p_category is null or p_category not in ('sous_traitance', 'outils', 'hebergement', 'publicite', 'licences', 'autre') then
    raise exception 'sv_cost_category_invalid' using errcode = 'P0001';
  end if;
  if p_frequency is null or p_frequency not in ('monthly', 'yearly') then
    raise exception 'sv_cost_frequency_invalid' using errcode = 'P0001';
  end if;
  if p_starts_on is null or abs(p_starts_on - current_date) > 3653
    or (p_ends_on is not null and abs(p_ends_on - current_date) > 3653)
  then
    raise exception 'sv_cost_date_invalid' using errcode = 'P0001';
  end if;
  if p_ends_on is not null and p_ends_on < p_starts_on then
    raise exception 'sv_cost_end_before_start' using errcode = 'P0001';
  end if;

  if p_series_id is not null then
    if not exists (select 1 from public.sv_recurring_costs where series_id = p_series_id) then
      raise exception 'sv_series_not_found' using errcode = 'P0001';
    end if;
    v_series := p_series_id;
  else
    v_series := gen_random_uuid();
  end if;

  insert into public.sv_recurring_costs (series_id, label, category, amount_cents, frequency, starts_on, ends_on, stopped, created_by)
  values (v_series, v_label, p_category, p_amount_cents, p_frequency, p_starts_on, p_ends_on, false, p_actor)
  returning id into v_id;

  return jsonb_build_object('cost_id', v_id, 'series_id', v_series);
end;
$$;
revoke all on function public.sv_add_recurring_cost(uuid, text, text, bigint, text, date, date, uuid) from public, anon, authenticated;
grant execute on function public.sv_add_recurring_cost(uuid, text, text, bigint, text, date, date, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- RPC : arret d'une serie (ligne d'arret, jamais de mise a jour)
-- ---------------------------------------------------------------------------
create or replace function public.sv_stop_recurring_cost(
  p_series_id uuid,
  p_from date,
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_latest public.sv_recurring_costs%rowtype;
  v_from date;
  v_id bigint;
begin
  -- Derniere version : granularite mois puis id (meme regle que effectiveVersionFor).
  select * into v_latest
  from public.sv_recurring_costs
  where series_id = p_series_id
  order by date_trunc('month', starts_on) desc, id desc
  limit 1;

  if not found then
    raise exception 'sv_series_not_found' using errcode = 'P0001';
  end if;
  if v_latest.stopped then
    raise exception 'sv_series_already_stopped' using errcode = 'P0001';
  end if;
  if p_from is null or abs(p_from - current_date) > 3653 then
    raise exception 'sv_cost_date_invalid' using errcode = 'P0001';
  end if;

  v_from := date_trunc('month', p_from)::date;
  if v_from < date_trunc('month', v_latest.starts_on)::date then
    raise exception 'sv_cost_end_before_start' using errcode = 'P0001';
  end if;

  insert into public.sv_recurring_costs (series_id, label, category, amount_cents, frequency, starts_on, ends_on, stopped, created_by)
  values (v_latest.series_id, v_latest.label, v_latest.category, v_latest.amount_cents, v_latest.frequency, v_from, null, true, p_actor)
  returning id into v_id;

  return jsonb_build_object('cost_id', v_id);
end;
$$;
revoke all on function public.sv_stop_recurring_cost(uuid, date, uuid) from public, anon, authenticated;
grant execute on function public.sv_stop_recurring_cost(uuid, date, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- RPC : ajout d'un cout projet
-- ---------------------------------------------------------------------------
create or replace function public.sv_add_project_cost(
  p_project_id uuid,
  p_incurred_on date,
  p_category text,
  p_label text,
  p_amount_cents bigint,
  p_vat_cents bigint,
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text := btrim(coalesce(p_label, ''));
  v_id bigint;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'sv_cost_amount_invalid' using errcode = 'P0001';
  end if;
  if p_vat_cents is not null and (p_vat_cents < 0 or p_vat_cents > p_amount_cents) then
    raise exception 'sv_cost_vat_invalid' using errcode = 'P0001';
  end if;
  if p_project_id is null or not exists (select 1 from public.sv_projects where id = p_project_id) then
    raise exception 'sv_project_not_found' using errcode = 'P0001';
  end if;
  if p_incurred_on is null or abs(p_incurred_on - current_date) > 3653 then
    raise exception 'sv_cost_date_invalid' using errcode = 'P0001';
  end if;
  if v_label = '' or char_length(v_label) > 120 then
    raise exception 'sv_cost_label_invalid' using errcode = 'P0001';
  end if;
  if p_category is null or p_category not in ('sous_traitance', 'outils', 'hebergement', 'publicite', 'licences', 'autre') then
    raise exception 'sv_cost_category_invalid' using errcode = 'P0001';
  end if;

  insert into public.sv_project_costs (project_id, incurred_on, category, label, amount_cents, vat_cents, created_by)
  values (p_project_id, p_incurred_on, p_category, v_label, p_amount_cents, p_vat_cents, p_actor)
  returning id into v_id;

  return jsonb_build_object('cost_id', v_id);
end;
$$;
revoke all on function public.sv_add_project_cost(uuid, date, text, text, bigint, bigint, uuid) from public, anon, authenticated;
grant execute on function public.sv_add_project_cost(uuid, date, text, text, bigint, bigint, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- RPC : annulation d'un cout projet (nouvelle ligne pointant sur sa cible)
-- ---------------------------------------------------------------------------
create or replace function public.sv_void_project_cost(
  p_cost_id bigint,
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.sv_project_costs%rowtype;
  v_id bigint;
begin
  select * into v_target
  from public.sv_project_costs
  where id = p_cost_id and voids_cost_id is null;

  if not found then
    raise exception 'sv_cost_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.sv_project_costs where voids_cost_id = p_cost_id) then
    raise exception 'sv_cost_already_voided' using errcode = 'P0001';
  end if;

  begin
    insert into public.sv_project_costs (project_id, incurred_on, category, label, amount_cents, vat_cents, voids_cost_id, created_by)
    values (v_target.project_id, v_target.incurred_on, v_target.category, v_target.label, v_target.amount_cents, v_target.vat_cents, p_cost_id, p_actor)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'sv_cost_already_voided' using errcode = 'P0001';
  end;

  return jsonb_build_object('cost_id', v_id);
end;
$$;
revoke all on function public.sv_void_project_cost(bigint, uuid) from public, anon, authenticated;
grant execute on function public.sv_void_project_cost(bigint, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- RPC : ajout d'un solde de tresorerie de depart
-- ---------------------------------------------------------------------------
create or replace function public.sv_add_cash_balance(
  p_as_of date,
  p_amount_cents bigint,
  p_note text,
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_id bigint;
begin
  if p_amount_cents is null then
    raise exception 'sv_balance_amount_invalid' using errcode = 'P0001';
  end if;
  if p_as_of is null or abs(p_as_of - current_date) > 3653 then
    raise exception 'sv_cost_date_invalid' using errcode = 'P0001';
  end if;
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'sv_balance_note_invalid' using errcode = 'P0001';
  end if;

  insert into public.sv_cash_balances (as_of, amount_cents, note, created_by)
  values (p_as_of, p_amount_cents, v_note, p_actor)
  returning id into v_id;

  return jsonb_build_object('balance_id', v_id);
end;
$$;
revoke all on function public.sv_add_cash_balance(date, bigint, text, uuid) from public, anon, authenticated;
grant execute on function public.sv_add_cash_balance(date, bigint, text, uuid) to service_role;
