-- Phase 19 : préparation publicitaire (ADS-01, ADS-02).
-- Décisions : D-03, D-04 (drapeau de non-conformité UTM figé avec la source),
-- D-07 à D-11 (journal serveur des conversions, event_id déterministe, valeur du devis).
-- Migration additive. Appliquée sur la branche Supabase en 19-06, puis en production en 19-11.
-- Pas de begin/commit : la production l'enveloppe elle-même.
-- Ne touche ni sv_set_lead_status, ni sv_funnel_v, ni sv_record_visit, ni la file de mails.

-- ---------------------------------------------------------------------------
-- Section A : colonnes UTM, RPC de capture, source figée et correction
-- ---------------------------------------------------------------------------

alter table public.sv_leads add column if not exists source_nonconformity text[] null;
alter table public.sv_leads add column if not exists source_raw jsonb null;

alter table public.sv_leads drop constraint if exists sv_leads_source_nonconformity_check;
alter table public.sv_leads add constraint sv_leads_source_nonconformity_check check (
  source_nonconformity is null
  or (
    cardinality(source_nonconformity) between 1 and 6
    and source_nonconformity <@ array[
      'source_missing', 'source_unknown', 'medium_missing', 'medium_unknown',
      'campaign_malformed', 'content_malformed'
    ]::text[]
  )
);

alter table public.sv_leads drop constraint if exists sv_leads_source_raw_check;
alter table public.sv_leads add constraint sv_leads_source_raw_check check (
  source_raw is null or jsonb_typeof(source_raw) = 'object'
);

-- Source figée (D-14) étendue aux deux nouvelles colonnes (D-04).
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
    or new.source_nonconformity is distinct from old.source_nonconformity
    or new.source_raw is distinct from old.source_raw
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

-- Capture : même signature à 13 arguments, deux valeurs de plus lues dans p_source (D-03, D-04).
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
  v_nonconf text[];
  v_raw jsonb;
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

      -- Non-conformité : seuls les six codes fermés sont retenus (triés, sans doublon).
      if jsonb_typeof(p_source->'nonconformity') = 'array' then
        select array_agg(distinct e.code order by e.code) into v_nonconf
        from jsonb_array_elements_text(p_source->'nonconformity') as e(code)
        where e.code in (
          'source_missing', 'source_unknown', 'medium_missing', 'medium_unknown',
          'campaign_malformed', 'content_malformed'
        );
      end if;

      -- Valeurs UTM brutes avant alias : objet à deux clés, tronquées à 200.
      if jsonb_typeof(p_source->'raw') = 'object' then
        v_raw := jsonb_strip_nulls(jsonb_build_object(
          'utm_source', left(p_source->'raw'->>'utm_source', 200),
          'utm_medium', left(p_source->'raw'->>'utm_medium', 200)
        ));
        if v_raw = '{}'::jsonb then
          v_raw := null;
        end if;
      end if;
    end if;

    insert into public.sv_leads (
      source_kind, source_source, source_medium, source_campaign,
      source_nonconformity, source_raw,
      first_touch, last_touch, channel, previous_lead_id
    ) values (
      v_kind, v_source, v_medium, v_campaign,
      v_nonconf, v_raw,
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

-- Correction de source : efface le drapeau de non-conformité (source_raw reste pour l'audit, D-04)
-- et journalise ce qui a été effacé.
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
      source_campaign = v_campaign,
      source_nonconformity = null
  where id = p_lead_id;
  perform set_config('sv.allow_source_change', 'off', true);

  insert into public.sv_lead_events (lead_id, type, actor, detail)
  values (p_lead_id, 'source_corrected', coalesce(p_actor::text, 'system'),
    jsonb_build_object(
      'from', jsonb_build_object('source', v_lead.source_source, 'medium', v_lead.source_medium, 'campaign', v_lead.source_campaign),
      'to', jsonb_build_object('source', v_source, 'medium', v_medium, 'campaign', v_campaign),
      'cleared_nonconformity', to_jsonb(v_lead.source_nonconformity)
    ))
  returning id into v_event_id;

  insert into public.sv_lead_notes (lead_id, event_id, kind, body)
  values (p_lead_id, v_event_id, 'correction_note', v_reason);

  return jsonb_build_object('lead_id', p_lead_id);
end;
$$;
revoke all on function public.sv_correct_lead_source(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.sv_correct_lead_source(uuid, uuid, text, text, text, text) to service_role;

-- Vue admin recréée : l.* est développé à la création, les nouvelles colonnes
-- de sv_leads imposent drop + create (create or replace échouerait).
drop view if exists public.sv_leads_admin_v;
create view public.sv_leads_admin_v with (security_invoker = true) as
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

-- ---------------------------------------------------------------------------
-- Section B : journal des conversions (D-07 à D-11)
-- ---------------------------------------------------------------------------
-- Résultat du contrôle (Open Question 3) : sv_set_lead_status est le seul écrivain de
-- sv_leads.status (sv_ingest_lead laisse le défaut 'new'), vérifié par recherche dans
-- supabase/migrations et src. Le déclencheur sur sv_lead_events couvre donc tous les changements.

create table if not exists public.sv_conversion_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.sv_leads (id) on delete restrict,
  event_name text not null check (event_name in (
    'lead_submitted', 'lead_qualified', 'rdv_booked', 'quote_sent', 'deal_signed', 'lead_lost'
  )),
  rank smallint null,
  event_id uuid not null unique,
  source_event_id bigint null references public.sv_lead_events (id) on delete restrict,
  occurred_at timestamptz not null,
  source_source text not null,
  source_medium text not null,
  source_campaign text null,
  click_ids jsonb null check (click_ids is null or jsonb_typeof(click_ids) = 'object'),
  value_cents bigint null check (value_cents is null or value_cents >= 0),
  currency text null check (currency is null or currency = 'EUR'),
  created_at timestamptz not null default now(),
  check ((value_cents is null) = (currency is null)),
  check (value_cents is null or event_name = 'deal_signed'),
  check (
    (event_name = 'lead_submitted' and rank = 1)
    or (event_name = 'lead_qualified' and rank = 2)
    or (event_name = 'rdv_booked' and rank = 3)
    or (event_name = 'deal_signed' and rank = 4)
    or (event_name in ('quote_sent', 'lead_lost') and rank is null)
  )
);
alter table public.sv_conversion_events enable row level security;
revoke all on public.sv_conversion_events from anon, authenticated, service_role;
grant select on public.sv_conversion_events to authenticated;
grant select on public.sv_conversion_events to service_role;
create index if not exists sv_conversion_events_lead_idx on public.sv_conversion_events (lead_id, occurred_at);
create unique index if not exists sv_conversion_events_lead_name_uidx
  on public.sv_conversion_events (lead_id, event_name)
  where event_name <> 'lead_lost';

drop policy if exists sv_conversion_events_admin_read on public.sv_conversion_events;
create policy sv_conversion_events_admin_read on public.sv_conversion_events
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_conversion_events_no_upd_del on public.sv_conversion_events;
create trigger sv_conversion_events_no_upd_del
  before update or delete on public.sv_conversion_events
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_conversion_events_no_truncate on public.sv_conversion_events;
create trigger sv_conversion_events_no_truncate
  before truncate on public.sv_conversion_events
  for each statement execute function sv_private.deny_mutation();

-- Identifiant d'événement déterministe (D-10) : seul endroit où l'espace de noms et l'extension
-- apparaissent. La disponibilité de uuid-ossp dans le schéma extensions est sondée sur la
-- branche en 19-06 ; le repli (digest pgcrypto) ne remplacerait que ce corps.
create or replace function sv_private.conversion_event_id(p_lead_id uuid, p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select extensions.uuid_generate_v5('87713031-3054-582f-9073-0aa58d13d20e'::uuid, lower(p_lead_id::text) || ':' || p_name);
$$;
revoke all on function sv_private.conversion_event_id(uuid, text) from public, anon, authenticated;

-- Émission atomique (D-09) : chaque lead_created / status_changed émet, dans la même
-- transaction, les rangs manquants jusqu'au rang cible avec les horodatages d'étapes
-- historiques. Un retour en arrière n'émet rien, perdu n'annule rien, les rejeux sont sans effet.
create or replace function sv_private.emit_conversions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.sv_leads%rowtype;
  v_click jsonb;
  v_touch jsonb;
  v_target integer := 0;
  v_quote boolean := false;
  v_signed boolean := false;
  v_value bigint;
begin
  if NEW.type not in ('lead_created', 'status_changed') then
    return NEW;
  end if;

  select * into v_lead from public.sv_leads where id = NEW.lead_id;
  if not found then
    return NEW;
  end if;

  -- Identifiants de clic : uniquement ceux déjà présents dans les touches stockées,
  -- donc posés après consentement (D-08, D-12).
  v_touch := coalesce(v_lead.last_touch, v_lead.first_touch);
  v_click := nullif(jsonb_strip_nulls(jsonb_build_object(
    'gclid', case when jsonb_typeof(v_touch->'params'->'gclid') = 'string' then v_touch->'params'->'gclid' end,
    'fbclid', case when jsonb_typeof(v_touch->'params'->'fbclid') = 'string' then v_touch->'params'->'fbclid' end,
    'ttclid', case when jsonb_typeof(v_touch->'params'->'ttclid') = 'string' then v_touch->'params'->'ttclid' end
  )), '{}'::jsonb);

  if NEW.type = 'lead_created' then
    v_target := 1;
  elsif NEW.to_status = 'lost' then
    insert into public.sv_conversion_events (
      lead_id, event_name, rank, event_id, source_event_id, occurred_at,
      source_source, source_medium, source_campaign, click_ids
    ) values (
      v_lead.id, 'lead_lost', null,
      sv_private.conversion_event_id(v_lead.id, 'lead_lost:' || NEW.id),
      NEW.id, coalesce(v_lead.lost_at, NEW.created_at),
      v_lead.source_source, v_lead.source_medium, v_lead.source_campaign, v_click
    )
    on conflict do nothing;
    return NEW;
  else
    v_target := case NEW.to_status
      when 'qualified' then 2
      when 'rdv' then 3
      when 'quote_sent' then 3
      when 'signed' then 4
      else 0
    end;
    v_quote := NEW.to_status in ('quote_sent', 'signed');
    v_signed := NEW.to_status = 'signed';
  end if;

  -- Retour en arrière (new) ou statut sans rang : rien à émettre.
  if v_target = 0 then
    return NEW;
  end if;

  -- Valeur : total du devis actif (tête de chaîne), sans estimation. NULL si aucun devis valide (D-11).
  if v_signed then
    select (s.data->>'totalCents')::bigint into v_value
    from public.sv_project_documents d
    join public.sv_projects p on p.id = d.project_id
    join public.sv_document_snapshots s on s.document_id = d.id
    where p.lead_id = NEW.lead_id
      and d.doc_type = 'quote'
      and not exists (
        select 1 from public.sv_project_documents r where r.replaces_document_id = d.id
      )
      and s.data->>'docType' = 'quote'
      and jsonb_typeof(s.data->'totalCents') = 'number'
      and (s.data->>'totalCents') ~ '^[0-9]{1,15}$'
    order by d.revision desc, d.issued_at desc
    limit 1;
  end if;

  insert into public.sv_conversion_events (
    lead_id, event_name, rank, event_id, source_event_id, occurred_at,
    source_source, source_medium, source_campaign, click_ids, value_cents, currency
  )
  select
    v_lead.id, v.name, v.rank::smallint,
    sv_private.conversion_event_id(v_lead.id, v.name),
    NEW.id, v.ts,
    v_lead.source_source, v_lead.source_medium, v_lead.source_campaign, v_click,
    case when v.name = 'deal_signed' then v_value end,
    case when v.name = 'deal_signed' and v_value is not null then 'EUR' end
  from (values
    ('lead_submitted', 1, v_lead.created_at, true),
    ('lead_qualified', 2, v_lead.qualified_at, v_target >= 2),
    ('rdv_booked', 3, v_lead.rdv_at, v_target >= 3),
    ('quote_sent', null::integer, v_lead.quote_sent_at, v_quote),
    ('deal_signed', 4, v_lead.signed_at, v_signed)
  ) as v(name, rank, ts, wanted)
  where v.wanted and v.ts is not null
  on conflict do nothing;

  return NEW;
end;
$$;
revoke all on function sv_private.emit_conversions() from public, anon, authenticated;

drop trigger if exists sv_lead_events_emit_conversions on public.sv_lead_events;
create trigger sv_lead_events_emit_conversions
  after insert on public.sv_lead_events
  for each row execute function sv_private.emit_conversions();
