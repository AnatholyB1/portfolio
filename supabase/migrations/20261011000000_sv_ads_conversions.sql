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
