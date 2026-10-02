-- supabase/migrations/20261003000000_sv_leads_core.sql
--
-- Sèvalys — Phase 11 (Lead attribution pipeline) — LEAD-02, LEAD-03, LEAD-04, LEAD-07.
-- NOT applied by plan 11-04: application happens on the branch in 11-10, prod in 11-17.
--
-- Décisions implémentées :
--   D-11..D-13  dédoublonnage : un nouveau contact est rattaché au lead existant non
--               effacé dont le dernier contact date de moins de 9 mois (même e-mail
--               ou téléphone normalisés), sans changer sa source ; sinon nouveau lead
--               lié à l'ancien (previous_lead_id).
--   D-14        source figée (source_*, first_touch...) : modifiable uniquement via
--               sv_correct_lead_source (motif 10-500 car., journalisé).
--   D-15        effacement par tombstone : contacts + notes supprimés, la ligne lead,
--               sa source et ses événements restent.
--   D-18, D-19  six statuts, motif de perte en liste fermée, horodatages d'étape
--               write-once, un saut remplit les étapes précédentes.
--   D-21        lecture admin uniquement (sv_private.is_admin) ; écritures = RPC service_role.
--   A3          source figée = dernier contact (last touch) à la création, calculée côté TS.
--   A4          fenêtre de 9 mois glissante depuis le dernier contact.
-- Déviation de nommage : l'exigence parle de `lead_events`, la table est
-- `public.sv_lead_events` (espace sv_ sur la base partagée avec Gecko, couverture linter).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.sv_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default '5e7a1750-0000-4000-8000-000000000001'
    references public.sv_tenants (id),
  status text not null default 'new'
    check (status in ('new', 'qualified', 'rdv', 'quote_sent', 'signed', 'lost')),
  lost_reason text null
    check (lost_reason in ('hors_budget', 'concurrent', 'sans_reponse', 'hors_cible', 'projet_abandonne', 'autre')),
  source_kind text not null check (source_kind in ('touch', 'direct', 'legacy')),
  source_source text not null,
  source_medium text not null,
  source_campaign text null,
  first_touch jsonb null,
  last_touch jsonb null,
  channel text not null check (channel in ('simulateur', 'contact')),
  previous_lead_id uuid null references public.sv_leads (id),
  converted_client_id uuid null references public.sv_clients (id) on delete set null,
  legacy_prospect_id uuid null unique,
  contact_count integer not null default 1,
  unseen_return boolean not null default false,
  created_at timestamptz not null default now(),
  last_contact_at timestamptz not null default now(),
  qualified_at timestamptz null,
  rdv_at timestamptz null,
  quote_sent_at timestamptz null,
  signed_at timestamptz null,
  lost_at timestamptz null,
  erased_at timestamptz null
);
alter table public.sv_leads enable row level security;
revoke all on public.sv_leads from anon, authenticated;
grant select on public.sv_leads to authenticated;
grant select, insert, update on public.sv_leads to service_role;
create index if not exists sv_leads_last_contact_idx on public.sv_leads (last_contact_at desc);
create index if not exists sv_leads_status_idx on public.sv_leads (status);

drop policy if exists sv_leads_admin_read on public.sv_leads;
create policy sv_leads_admin_read on public.sv_leads
  for select to authenticated
  using ((select sv_private.is_admin()));

create table if not exists public.sv_lead_contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.sv_leads (id),
  channel text not null check (channel in ('simulateur', 'contact')),
  nom text not null,
  email text not null,
  telephone text null,
  email_norm text not null,
  phone_norm text null,
  payload jsonb not null default '{}'::jsonb,
  consent_rgpd boolean null,
  consent jsonb null,
  ip_hash text null,
  touch jsonb null,
  created_at timestamptz not null default now()
);
alter table public.sv_lead_contacts enable row level security;
revoke all on public.sv_lead_contacts from anon, authenticated;
grant select on public.sv_lead_contacts to authenticated;
grant select, insert, delete on public.sv_lead_contacts to service_role;
create index if not exists sv_lead_contacts_email_norm_idx on public.sv_lead_contacts (email_norm);
create index if not exists sv_lead_contacts_phone_norm_idx on public.sv_lead_contacts (phone_norm);
create index if not exists sv_lead_contacts_lead_idx on public.sv_lead_contacts (lead_id);

drop policy if exists sv_lead_contacts_admin_read on public.sv_lead_contacts;
create policy sv_lead_contacts_admin_read on public.sv_lead_contacts
  for select to authenticated
  using ((select sv_private.is_admin()));

create table if not exists public.sv_lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.sv_leads (id) on delete restrict,
  type text not null check (type in (
    'lead_created', 'contact_added', 'status_changed', 'source_corrected',
    'lead_linked', 'erased', 'return_acknowledged'
  )),
  actor text not null,
  from_status text null,
  to_status text null,
  reason_code text null,
  channel text null,
  touch jsonb null,
  detail jsonb null,
  created_at timestamptz not null default now()
);
alter table public.sv_lead_events enable row level security;
revoke all on public.sv_lead_events from anon, authenticated, service_role;
grant select on public.sv_lead_events to authenticated;
grant select, insert on public.sv_lead_events to service_role;
create index if not exists sv_lead_events_lead_idx on public.sv_lead_events (lead_id, created_at);

drop policy if exists sv_lead_events_admin_read on public.sv_lead_events;
create policy sv_lead_events_admin_read on public.sv_lead_events
  for select to authenticated
  using ((select sv_private.is_admin()));

create table if not exists public.sv_lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.sv_leads (id),
  event_id bigint null references public.sv_lead_events (id) on delete restrict,
  kind text not null check (kind in ('lost_note', 'correction_note')),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.sv_lead_notes enable row level security;
revoke all on public.sv_lead_notes from anon, authenticated;
grant select on public.sv_lead_notes to authenticated;
grant select, insert, delete on public.sv_lead_notes to service_role;
create index if not exists sv_lead_notes_lead_idx on public.sv_lead_notes (lead_id);

drop policy if exists sv_lead_notes_admin_read on public.sv_lead_notes;
create policy sv_lead_notes_admin_read on public.sv_lead_notes
  for select to authenticated
  using ((select sv_private.is_admin()));

-- ---------------------------------------------------------------------------
-- Immutabilité : journal d'événements, suppression de leads
-- ---------------------------------------------------------------------------

create or replace function sv_private.deny_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'sv_immutable_table' using errcode = 'P0001';
end;
$$;
revoke all on function sv_private.deny_mutation() from public, anon;

drop trigger if exists sv_lead_events_no_upd_del on public.sv_lead_events;
create trigger sv_lead_events_no_upd_del
  before update or delete on public.sv_lead_events
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_lead_events_no_truncate on public.sv_lead_events;
create trigger sv_lead_events_no_truncate
  before truncate on public.sv_lead_events
  for each statement execute function sv_private.deny_mutation();

drop trigger if exists sv_leads_no_delete on public.sv_leads;
create trigger sv_leads_no_delete
  before delete on public.sv_leads
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_leads_no_truncate on public.sv_leads;
create trigger sv_leads_no_truncate
  before truncate on public.sv_leads
  for each statement execute function sv_private.deny_mutation();

-- Source figée (D-14) : seul sv_correct_lead_source pose le drapeau local.
create or replace function sv_private.protect_lead_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('sv.allow_source_change', true), '') = 'on' then
    return new;
  end if;
  if new.source_kind is distinct from old.source_kind
    or new.source_source is distinct from old.source_source
    or new.source_medium is distinct from old.source_medium
    or new.source_campaign is distinct from old.source_campaign
    or new.first_touch is distinct from old.first_touch
    or new.created_at is distinct from old.created_at
    or new.channel is distinct from old.channel
    or new.legacy_prospect_id is distinct from old.legacy_prospect_id
  then
    raise exception 'sv_source_frozen' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function sv_private.protect_lead_source() from public, anon;

drop trigger if exists sv_leads_protect_source on public.sv_leads;
create trigger sv_leads_protect_source
  before update on public.sv_leads
  for each row execute function sv_private.protect_lead_source();

-- ---------------------------------------------------------------------------
-- RPC (service_role uniquement)
-- ---------------------------------------------------------------------------

create or replace function public.sv_ingest_lead(
  p_channel text,
  p_nom text,
  p_email text,
  p_email_norm text,
  p_phone text,
  p_phone_norm text,
  p_payload jsonb,
  p_consent_rgpd boolean,
  p_source jsonb,
  p_first_touch jsonb,
  p_last_touch jsonb,
  p_ip_hash text,
  p_consent jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead_id uuid;
  v_prev_id uuid;
  v_contact_id uuid;
  v_is_return boolean := false;
  v_touch jsonb := coalesce(p_last_touch, p_first_touch);
  v_kind text;
  v_source text;
  v_medium text;
  v_campaign text;
begin
  if p_channel is null or p_channel not in ('simulateur', 'contact') then
    raise exception 'sv_invalid_reason' using errcode = 'P0001';
  end if;
  if p_email_norm is null or char_length(trim(p_email_norm)) = 0 then
    raise exception 'sv_invalid_reason' using errcode = 'P0001';
  end if;
  if p_nom is null or char_length(p_nom) > 120
    or p_email is null or char_length(p_email) > 254
    or octet_length(coalesce(p_payload, '{}'::jsonb)::text) > 20000
  then
    raise exception 'sv_invalid_reason' using errcode = 'P0001';
  end if;

  -- Verrous consultatifs, ordre fixe : e-mail puis téléphone.
  perform pg_advisory_xact_lock(hashtextextended('sv_lead:' || p_email_norm, 0));
  if p_phone_norm is not null then
    perform pg_advisory_xact_lock(hashtextextended('sv_lead_phone:' || p_phone_norm, 0));
  end if;

  select l.id into v_lead_id
  from public.sv_leads l
  where l.erased_at is null
    and l.last_contact_at > now() - interval '9 months'
    and exists (
      select 1 from public.sv_lead_contacts c
      where c.lead_id = l.id
        and (c.email_norm = p_email_norm
          or (p_phone_norm is not null and c.phone_norm = p_phone_norm))
    )
  order by l.last_contact_at desc
  limit 1
  for update of l;

  if v_lead_id is not null then
    v_is_return := true;
    insert into public.sv_lead_contacts (
      lead_id, channel, nom, email, telephone, email_norm, phone_norm,
      payload, consent_rgpd, consent, ip_hash, touch
    ) values (
      v_lead_id, p_channel, p_nom, p_email, p_phone, p_email_norm, p_phone_norm,
      coalesce(p_payload, '{}'::jsonb), p_consent_rgpd, p_consent, p_ip_hash, v_touch
    ) returning id into v_contact_id;

    update public.sv_leads
    set last_contact_at = now(),
        last_touch = coalesce(p_last_touch, last_touch),
        contact_count = contact_count + 1,
        unseen_return = true
    where id = v_lead_id;

    insert into public.sv_lead_events (lead_id, type, actor, channel, touch)
    values (v_lead_id, 'contact_added', 'visitor', p_channel, v_touch);
  else
    select l.id into v_prev_id
    from public.sv_leads l
    where l.erased_at is null
      and exists (
        select 1 from public.sv_lead_contacts c
        where c.lead_id = l.id
          and (c.email_norm = p_email_norm
            or (p_phone_norm is not null and c.phone_norm = p_phone_norm))
      )
    order by l.last_contact_at desc
    limit 1;

    if p_source is null then
      v_kind := 'direct';
      v_source := 'direct';
      v_medium := '(none)';
      v_campaign := null;
    else
      v_kind := case when p_source->>'kind' in ('touch', 'direct') then p_source->>'kind' else 'direct' end;
      v_source := coalesce(nullif(trim(p_source->>'source'), ''), 'direct');
      v_medium := coalesce(nullif(trim(p_source->>'medium'), ''), '(none)');
      v_campaign := nullif(trim(p_source->>'campaign'), '');
    end if;

    insert into public.sv_leads (
      source_kind, source_source, source_medium, source_campaign,
      first_touch, last_touch, channel, previous_lead_id
    ) values (
      v_kind, v_source, v_medium, v_campaign,
      p_first_touch, coalesce(p_last_touch, p_first_touch), p_channel, v_prev_id
    ) returning id into v_lead_id;

    insert into public.sv_lead_contacts (
      lead_id, channel, nom, email, telephone, email_norm, phone_norm,
      payload, consent_rgpd, consent, ip_hash, touch
    ) values (
      v_lead_id, p_channel, p_nom, p_email, p_phone, p_email_norm, p_phone_norm,
      coalesce(p_payload, '{}'::jsonb), p_consent_rgpd, p_consent, p_ip_hash, v_touch
    ) returning id into v_contact_id;

    insert into public.sv_lead_events (lead_id, type, actor, channel, touch)
    values (v_lead_id, 'lead_created', 'visitor', p_channel, v_touch);

    if v_prev_id is not null then
      insert into public.sv_lead_events (lead_id, type, actor, channel, detail)
      values (v_lead_id, 'lead_linked', 'system', p_channel,
        jsonb_build_object('previous_lead_id', v_prev_id));
    end if;
  end if;

  return jsonb_build_object(
    'lead_id', v_lead_id,
    'contact_id', v_contact_id,
    'is_return', v_is_return,
    'previous_lead_id', v_prev_id
  );
end;
$$;
revoke all on function public.sv_ingest_lead(text, text, text, text, text, text, jsonb, boolean, jsonb, jsonb, jsonb, text, jsonb) from public, anon, authenticated;
grant execute on function public.sv_ingest_lead(text, text, text, text, text, text, jsonb, boolean, jsonb, jsonb, jsonb, text, jsonb) to service_role;

create or replace function public.sv_set_lead_status(
  p_lead_id uuid,
  p_status text,
  p_actor uuid,
  p_lost_reason text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.sv_leads%rowtype;
  v_rank integer;
  v_event_id bigint;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  select * into v_lead from public.sv_leads where id = p_lead_id for update;
  if not found then
    raise exception 'sv_lead_not_found' using errcode = 'P0001';
  end if;
  if v_lead.erased_at is not null then
    raise exception 'sv_lead_erased' using errcode = 'P0001';
  end if;
  if p_status is null or p_status not in ('new', 'qualified', 'rdv', 'quote_sent', 'signed', 'lost') then
    raise exception 'sv_invalid_status' using errcode = 'P0001';
  end if;
  if p_status = 'lost' and (
    p_lost_reason is null
    or p_lost_reason not in ('hors_budget', 'concurrent', 'sans_reponse', 'hors_cible', 'projet_abandonne', 'autre')
  ) then
    raise exception 'sv_lost_reason_required' using errcode = 'P0001';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'sv_invalid_reason' using errcode = 'P0001';
  end if;

  if v_lead.status = p_status then
    return jsonb_build_object('lead_id', p_lead_id, 'status', v_lead.status, 'changed', false);
  end if;

  v_rank := case p_status
    when 'qualified' then 1
    when 'rdv' then 2
    when 'quote_sent' then 3
    when 'signed' then 4
    else 0
  end;

  update public.sv_leads
  set status = p_status,
      lost_reason = case when p_status = 'lost' then p_lost_reason else null end,
      lost_at = case when p_status = 'lost' then now() else null end,
      qualified_at = case when v_rank >= 1 then coalesce(qualified_at, now()) else qualified_at end,
      rdv_at = case when v_rank >= 2 then coalesce(rdv_at, now()) else rdv_at end,
      quote_sent_at = case when v_rank >= 3 then coalesce(quote_sent_at, now()) else quote_sent_at end,
      signed_at = case when v_rank >= 4 then coalesce(signed_at, now()) else signed_at end
  where id = p_lead_id;

  insert into public.sv_lead_events (lead_id, type, actor, from_status, to_status, reason_code)
  values (p_lead_id, 'status_changed', coalesce(p_actor::text, 'system'), v_lead.status, p_status,
    case when p_status = 'lost' then p_lost_reason else null end)
  returning id into v_event_id;

  if v_note is not null then
    insert into public.sv_lead_notes (lead_id, event_id, kind, body)
    values (p_lead_id, v_event_id, 'lost_note', v_note);
  end if;

  return jsonb_build_object('lead_id', p_lead_id, 'status', p_status, 'changed', true);
end;
$$;
revoke all on function public.sv_set_lead_status(uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.sv_set_lead_status(uuid, text, uuid, text, text) to service_role;

create or replace function public.sv_correct_lead_source(
  p_lead_id uuid,
  p_actor uuid,
  p_source text,
  p_medium text,
  p_campaign text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.sv_leads%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_source text := lower(trim(coalesce(p_source, '')));
  v_medium text := lower(trim(coalesce(p_medium, '')));
  v_campaign text := nullif(lower(trim(coalesce(p_campaign, ''))), '');
  v_event_id bigint;
begin
  if char_length(v_reason) < 10 or char_length(v_reason) > 500 then
    raise exception 'sv_reason_required' using errcode = 'P0001';
  end if;
  if v_source = '' or v_medium = ''
    or char_length(v_source) > 200 or char_length(v_medium) > 200
    or char_length(coalesce(v_campaign, '')) > 200
  then
    raise exception 'sv_invalid_reason' using errcode = 'P0001';
  end if;

  select * into v_lead from public.sv_leads where id = p_lead_id for update;
  if not found then
    raise exception 'sv_lead_not_found' using errcode = 'P0001';
  end if;
  if v_lead.erased_at is not null then
    raise exception 'sv_lead_erased' using errcode = 'P0001';
  end if;

  perform set_config('sv.allow_source_change', 'on', true);
  update public.sv_leads
  set source_source = v_source,
      source_medium = v_medium,
      source_campaign = v_campaign
  where id = p_lead_id;
  perform set_config('sv.allow_source_change', 'off', true);

  insert into public.sv_lead_events (lead_id, type, actor, detail)
  values (p_lead_id, 'source_corrected', coalesce(p_actor::text, 'system'),
    jsonb_build_object(
      'from', jsonb_build_object('source', v_lead.source_source, 'medium', v_lead.source_medium, 'campaign', v_lead.source_campaign),
      'to', jsonb_build_object('source', v_source, 'medium', v_medium, 'campaign', v_campaign)
    ))
  returning id into v_event_id;

  insert into public.sv_lead_notes (lead_id, event_id, kind, body)
  values (p_lead_id, v_event_id, 'correction_note', v_reason);

  return jsonb_build_object('lead_id', p_lead_id);
end;
$$;
revoke all on function public.sv_correct_lead_source(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.sv_correct_lead_source(uuid, uuid, text, text, text, text) to service_role;

create or replace function public.sv_erase_lead(
  p_lead_id uuid,
  p_actor text,
  p_reason_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.sv_leads%rowtype;
begin
  if p_reason_code is null
    or p_reason_code not in ('demande_personne', 'fin_conservation', 'doublon', 'autre')
  then
    raise exception 'sv_invalid_reason' using errcode = 'P0001';
  end if;

  select * into v_lead from public.sv_leads where id = p_lead_id for update;
  if not found then
    raise exception 'sv_lead_not_found' using errcode = 'P0001';
  end if;
  if v_lead.erased_at is not null then
    return jsonb_build_object('lead_id', p_lead_id, 'erased', false);
  end if;

  delete from public.sv_lead_notes where lead_id = p_lead_id;
  delete from public.sv_lead_contacts where lead_id = p_lead_id;

  update public.sv_leads
  set erased_at = now(), unseen_return = false
  where id = p_lead_id;

  insert into public.sv_lead_events (lead_id, type, actor, reason_code)
  values (p_lead_id, 'erased', coalesce(nullif(trim(p_actor), ''), 'system'), p_reason_code);

  return jsonb_build_object('lead_id', p_lead_id, 'erased', true);
end;
$$;
revoke all on function public.sv_erase_lead(uuid, text, text) from public, anon, authenticated;
grant execute on function public.sv_erase_lead(uuid, text, text) to service_role;

create or replace function public.sv_mark_return_seen(
  p_lead_id uuid,
  p_actor uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sv_leads set unseen_return = false
  where id = p_lead_id and unseen_return;
  if found then
    insert into public.sv_lead_events (lead_id, type, actor)
    values (p_lead_id, 'return_acknowledged', coalesce(p_actor::text, 'system'));
  end if;
end;
$$;
revoke all on function public.sv_mark_return_seen(uuid, uuid) from public, anon, authenticated;
grant execute on function public.sv_mark_return_seen(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Vue admin (security_invoker : la RLS admin s'applique à l'appelant)
-- ---------------------------------------------------------------------------

create or replace view public.sv_leads_admin_v with (security_invoker = true) as
select
  l.*,
  c.nom as contact_nom,
  c.email as contact_email,
  c.telephone as contact_telephone,
  c.channel as contact_channel
from public.sv_leads l
left join lateral (
  select nom, email, telephone, channel
  from public.sv_lead_contacts
  where lead_id = l.id
  order by created_at desc
  limit 1
) c on true;
revoke all on public.sv_leads_admin_v from anon;
grant select on public.sv_leads_admin_v to authenticated;
