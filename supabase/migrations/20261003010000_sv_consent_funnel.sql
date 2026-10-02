-- supabase/migrations/20261003010000_sv_consent_funnel.sql
--
-- Sèvalys — Phase 11 (Lead attribution pipeline) — LEAD-01, LEAD-08, LEAD-09.
-- NOT applied by plan 11-05: application happens on the branch in 11-10, prod in 11-17.
--
-- Décisions implémentées :
--   D-04   chaque choix de consentement est journalisé (date, choix, version du texte,
--          langue, identifiant anonyme, empreinte IP salée) ; la version doit exister
--          dans sv_consent_versions (texte exact FR/EN/TH stocké en base).
--   D-20   compteurs de visites anonymes (aucun identifiant) + coût manuel par RDV ;
--          l'entonnoir survit à l'effacement (il ne lit jamais les contacts).
--   LEAD-08 vue sv_funnel_v : visites, simulations, leads, qualifiés, RDV, signés,
--          coût par RDV, par source + campagne + mois.
--   A5     chaque étape est comptée dans le mois de son propre horodatage.
--   A6     journal de consentement conservé 25 mois (purge dans la migration suivante).

-- ---------------------------------------------------------------------------
-- Versions du texte de consentement
-- ---------------------------------------------------------------------------

create table if not exists public.sv_consent_versions (
  version text not null,
  locale text not null check (locale in ('fr', 'en', 'th')),
  heading text not null,
  body text not null,
  published_at timestamptz not null default now(),
  primary key (version, locale)
);
alter table public.sv_consent_versions enable row level security;
revoke all on public.sv_consent_versions from anon, authenticated;
grant select on public.sv_consent_versions to authenticated;
grant select on public.sv_consent_versions to service_role;

drop policy if exists sv_consent_versions_admin_read on public.sv_consent_versions;
create policy sv_consent_versions_admin_read on public.sv_consent_versions
  for select to authenticated
  using ((select sv_private.is_admin()));

-- Texte verbatim de src/lib/consent/text.ts (gardé par leadsMigration.test.ts).
insert into public.sv_consent_versions (version, locale, heading, body) values
  ('2026-10-v1', 'fr',
   $c$Votre choix sur les cookies$c$,
   $c$Nous mesurons l'audience du site pour l'améliorer. Avec votre accord, nous utilisons aussi des cookies pour mieux comprendre d'où viennent les visiteurs. Sans votre accord, aucune donnée n'est conservée sur votre appareil. Vous pouvez changer d'avis à tout moment.$c$),
  ('2026-10-v1', 'en',
   $c$Your cookie choice$c$,
   $c$We measure site traffic to improve it. With your consent, we also use cookies to understand where visitors come from. Without your consent, nothing is stored on your device. You can change your mind at any time.$c$),
  ('2026-10-v1', 'th',
   $c$ตัวเลือกคุกกี้ของคุณ$c$,
   $c$เราวัดการเข้าชมเว็บไซต์เพื่อปรับปรุงบริการ หากคุณยินยอม เราจะใช้คุกกี้เพื่อทำความเข้าใจที่มาของผู้เข้าชมด้วย หากไม่ยินยอม จะไม่มีข้อมูลถูกเก็บในอุปกรณ์ของคุณ คุณเปลี่ยนใจได้ทุกเมื่อ$c$)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Journal de consentement (append-only pour l'application)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_consent_log (
  id bigint generated always as identity primary key,
  anon_id uuid not null,
  choice text not null check (choice in ('accepted', 'refused')),
  version text not null,
  locale text not null,
  ip_hash text null,
  created_at timestamptz not null default now(),
  foreign key (version, locale) references public.sv_consent_versions (version, locale)
);
alter table public.sv_consent_log enable row level security;
revoke all on public.sv_consent_log from anon, authenticated;
grant select on public.sv_consent_log to authenticated;
grant select, insert on public.sv_consent_log to service_role;
create index if not exists sv_consent_log_created_idx on public.sv_consent_log (created_at);

drop policy if exists sv_consent_log_admin_read on public.sv_consent_log;
create policy sv_consent_log_admin_read on public.sv_consent_log
  for select to authenticated
  using ((select sv_private.is_admin()));

-- Pas de modification ; la suppression n'est faite que par la purge (propriétaire).
drop trigger if exists sv_consent_log_no_update on public.sv_consent_log;
create trigger sv_consent_log_no_update
  before update on public.sv_consent_log
  for each row execute function sv_private.deny_mutation();

create or replace function public.sv_log_consent(
  p_anon_id uuid,
  p_choice text,
  p_version text,
  p_locale text,
  p_ip_hash text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if p_anon_id is null or p_choice is null or p_choice not in ('accepted', 'refused') then
    raise exception 'sv_invalid_reason' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.sv_consent_versions
    where version = p_version and locale = p_locale
  ) then
    raise exception 'sv_unknown_consent_version' using errcode = 'P0001';
  end if;

  insert into public.sv_consent_log (anon_id, choice, version, locale, ip_hash)
  values (p_anon_id, p_choice, p_version, p_locale, left(p_ip_hash, 200))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.sv_log_consent(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.sv_log_consent(uuid, text, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Compteurs de visites (agrégats seulement)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_visit_counts (
  day date not null,
  source text not null,
  medium text not null,
  campaign text not null default '',
  landing text not null,
  visits integer not null default 0,
  primary key (day, source, medium, campaign, landing)
);
alter table public.sv_visit_counts enable row level security;
revoke all on public.sv_visit_counts from anon, authenticated;
grant select on public.sv_visit_counts to authenticated;
grant select, insert, update on public.sv_visit_counts to service_role;

drop policy if exists sv_visit_counts_admin_read on public.sv_visit_counts;
create policy sv_visit_counts_admin_read on public.sv_visit_counts
  for select to authenticated
  using ((select sv_private.is_admin()));

create or replace function public.sv_record_visit(
  p_source text,
  p_medium text,
  p_campaign text,
  p_landing text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text := left(coalesce(nullif(lower(trim(coalesce(p_source, ''))), ''), 'direct'), 200);
  v_medium text := left(coalesce(nullif(lower(trim(coalesce(p_medium, ''))), ''), '(none)'), 200);
  v_campaign text := left(lower(trim(coalesce(p_campaign, ''))), 200);
  v_landing text := left(trim(coalesce(p_landing, '')), 200);
begin
  insert into public.sv_visit_counts (day, source, medium, campaign, landing, visits)
  values ((now() at time zone 'utc')::date, v_source, v_medium, v_campaign, v_landing, 1)
  on conflict (day, source, medium, campaign, landing)
  do update set visits = public.sv_visit_counts.visits + 1;
end;
$$;
revoke all on function public.sv_record_visit(text, text, text, text) from public, anon, authenticated;
grant execute on function public.sv_record_visit(text, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Coût manuel par RDV
-- ---------------------------------------------------------------------------

create table if not exists public.sv_acquisition_costs (
  source text not null,
  campaign text not null default '',
  month date not null check (extract(day from month) = 1),
  cost_per_rdv_cents integer not null check (cost_per_rdv_cents > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid null,
  primary key (source, campaign, month)
);
alter table public.sv_acquisition_costs enable row level security;
revoke all on public.sv_acquisition_costs from anon, authenticated;
grant select on public.sv_acquisition_costs to authenticated;
grant select, insert, update on public.sv_acquisition_costs to service_role;

drop policy if exists sv_acquisition_costs_admin_read on public.sv_acquisition_costs;
create policy sv_acquisition_costs_admin_read on public.sv_acquisition_costs
  for select to authenticated
  using ((select sv_private.is_admin()));

create or replace function public.sv_upsert_acquisition_cost(
  p_source text,
  p_campaign text,
  p_month date,
  p_cents integer,
  p_actor uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text := lower(trim(coalesce(p_source, '')));
  v_campaign text := lower(trim(coalesce(p_campaign, '')));
begin
  if v_source = '' or char_length(v_source) > 200 or char_length(v_campaign) > 200
    or p_cents is null or p_cents <= 0
    or p_month is null or extract(day from p_month) <> 1
  then
    raise exception 'sv_invalid_reason' using errcode = 'P0001';
  end if;

  insert into public.sv_acquisition_costs (source, campaign, month, cost_per_rdv_cents, updated_at, updated_by)
  values (v_source, v_campaign, p_month, p_cents, now(), p_actor)
  on conflict (source, campaign, month)
  do update set cost_per_rdv_cents = excluded.cost_per_rdv_cents,
                updated_at = now(),
                updated_by = excluded.updated_by;
end;
$$;
revoke all on function public.sv_upsert_acquisition_cost(text, text, date, integer, uuid) from public, anon, authenticated;
grant execute on function public.sv_upsert_acquisition_cost(text, text, date, integer, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Entonnoir (A5) : lignes d'étape en union all puis regroupement.
-- Ne lit que sv_leads, sv_lead_events (sans données personnelles), les compteurs
-- de visites et les coûts : il survit à l'effacement.
-- ---------------------------------------------------------------------------

create or replace view public.sv_funnel_v with (security_invoker = true) as
with stages as (
  select v.source as source,
         v.campaign as campaign,
         date_trunc('month', v.day)::date as month,
         v.visits::bigint as visits, 0::bigint as simulations, 0::bigint as leads,
         0::bigint as qualified, 0::bigint as rdv, 0::bigint as signed
  from public.sv_visit_counts v
  union all
  select l.source_source, coalesce(l.source_campaign, ''),
         date_trunc('month', e.created_at at time zone 'utc')::date,
         0, 1, 0, 0, 0, 0
  from public.sv_lead_events e
  join public.sv_leads l on l.id = e.lead_id
  where e.type in ('lead_created', 'contact_added') and e.channel = 'simulateur'
  union all
  select l.source_source, coalesce(l.source_campaign, ''),
         date_trunc('month', l.created_at at time zone 'utc')::date,
         0, 0, 1, 0, 0, 0
  from public.sv_leads l
  union all
  select l.source_source, coalesce(l.source_campaign, ''),
         date_trunc('month', l.qualified_at at time zone 'utc')::date,
         0, 0, 0, 1, 0, 0
  from public.sv_leads l where l.qualified_at is not null
  union all
  select l.source_source, coalesce(l.source_campaign, ''),
         date_trunc('month', l.rdv_at at time zone 'utc')::date,
         0, 0, 0, 0, 1, 0
  from public.sv_leads l where l.rdv_at is not null
  union all
  select l.source_source, coalesce(l.source_campaign, ''),
         date_trunc('month', l.signed_at at time zone 'utc')::date,
         0, 0, 0, 0, 0, 1
  from public.sv_leads l where l.signed_at is not null
),
grouped as (
  select source, campaign, month,
         sum(visits)::bigint as visits,
         sum(simulations)::bigint as simulations,
         sum(leads)::bigint as leads,
         sum(qualified)::bigint as qualified,
         sum(rdv)::bigint as rdv,
         sum(signed)::bigint as signed
  from stages
  group by source, campaign, month
)
select g.source, g.campaign, g.month,
       g.visits, g.simulations, g.leads, g.qualified, g.rdv, g.signed,
       c.cost_per_rdv_cents
from grouped g
left join public.sv_acquisition_costs c
  on c.source = g.source and c.campaign = g.campaign and c.month = g.month;
revoke all on public.sv_funnel_v from anon;
grant select on public.sv_funnel_v to authenticated;
