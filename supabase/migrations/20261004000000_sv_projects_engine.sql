-- supabase/migrations/20261004000000_sv_projects_engine.sql
--
-- Sevalys - Phase 12 (Conversion, projects and step engine) - PORTAL-01, PORTAL-02,
-- PORTAL-04, PORTAL-05, PORTAL-06, MAIL-02, ADM-01.
-- NOT applied by plan 12-01: application happens on the branch in 12-05, prod in 12-20.
--
-- Decisions implemented:
--   D-01..D-05  atomic lead conversion (sv_convert_lead): client by SIRET, member, first
--               project, converted_client_id, journal event and invite mail in ONE
--               transaction; the lead status is never changed; new/lost leads refused.
--   D-06, D-10  sv_projects.offer is a metadata column (9 slugs), no effect on steps.
--   D-08, D-09  the database stores only typed facts (append-only); the step is derived in
--               TypeScript and is NEVER stored. A correction is a fact_revoked row whose
--               reason (10-500 chars) lives in admin-only sv_project_fact_notes.
--   D-13        structured onboarding columns, no free text blob.
--   D-14        private bucket sv-project-files; no storage policy on purpose.
--   D-16        append-only consents journal.
--   D-17, D-18  mail outbox with unique dedupe_key and send_after.
--   D-22        tables, RLS, revoke-then-grant and read policy live in this one file.
-- RESEARCH Pitfall 1: append-only tables have no FK to auth.users and every FK out of
-- them is on delete restrict, so deleting a test user is never blocked by a journal.
-- Pitfall 6: mail rows stuck in sending beyond 23 h are failed for human review.

-- ---------------------------------------------------------------------------
-- sv_projects
-- ---------------------------------------------------------------------------

create table if not exists public.sv_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.sv_clients (id) on delete restrict,
  lead_id uuid null references public.sv_leads (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  offer text not null check (offer in (
    'site-vitrine', 'rebranding-site-premium', 'branding', 'projet-sur-mesure',
    'agent-vocal-ia', 'maintenance', 'community-management', 'meta-ads', 'google-ads'
  )),
  created_by uuid null,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.sv_projects enable row level security;
revoke all on public.sv_projects from anon, authenticated;
grant select on public.sv_projects to authenticated;
grant select, insert on public.sv_projects to service_role;
create index if not exists sv_projects_client_idx on public.sv_projects (client_id);

-- Helper defined after sv_projects and before every policy that uses it.
create or replace function sv_private.project_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.sv_projects p
  where p.client_id in (
    select m.client_id from public.sv_client_members m where m.user_id = (select auth.uid())
  );
$$;
revoke all on function sv_private.project_ids() from public, anon;
grant execute on function sv_private.project_ids() to authenticated;

drop policy if exists sv_projects_read on public.sv_projects;
create policy sv_projects_read on public.sv_projects
  for select to authenticated
  using ((select sv_private.is_admin()) or client_id in (select sv_private.client_ids()));

-- ---------------------------------------------------------------------------
-- sv_project_facts (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_project_facts (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  type text not null check (type in (
    'onboarding_completed', 'quote_accepted', 'contract_signed', 'deposit_received',
    'production_completed', 'acceptance_signed', 'balance_received', 'fact_revoked'
  )),
  target_fact_id bigint null references public.sv_project_facts (id) on delete restrict,
  actor_kind text not null check (actor_kind in ('system', 'admin', 'client')),
  actor_id uuid null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((type = 'fact_revoked') = (target_fact_id is not null))
);
alter table public.sv_project_facts enable row level security;
revoke all on public.sv_project_facts from anon, authenticated, service_role;
grant select (id, project_id, type, target_fact_id, actor_kind, occurred_at, created_at)
  on public.sv_project_facts to authenticated;
grant select, insert on public.sv_project_facts to service_role;
create index if not exists sv_project_facts_project_idx on public.sv_project_facts (project_id);

drop policy if exists sv_project_facts_read on public.sv_project_facts;
create policy sv_project_facts_read on public.sv_project_facts
  for select to authenticated
  using ((select sv_private.is_admin()) or project_id in (select sv_private.project_ids()));

drop trigger if exists sv_project_facts_no_upd_del on public.sv_project_facts;
create trigger sv_project_facts_no_upd_del
  before update or delete on public.sv_project_facts
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_project_facts_no_truncate on public.sv_project_facts;
create trigger sv_project_facts_no_truncate
  before truncate on public.sv_project_facts
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_project_fact_notes (append-only, admin-only read)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_project_fact_notes (
  id bigint generated always as identity primary key,
  fact_id bigint not null unique references public.sv_project_facts (id) on delete restrict,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.sv_project_fact_notes enable row level security;
revoke all on public.sv_project_fact_notes from anon, authenticated, service_role;
grant select on public.sv_project_fact_notes to authenticated;
grant select, insert on public.sv_project_fact_notes to service_role;

drop policy if exists sv_project_fact_notes_admin_read on public.sv_project_fact_notes;
create policy sv_project_fact_notes_admin_read on public.sv_project_fact_notes
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_project_fact_notes_no_upd_del on public.sv_project_fact_notes;
create trigger sv_project_fact_notes_no_upd_del
  before update or delete on public.sv_project_fact_notes
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_project_fact_notes_no_truncate on public.sv_project_fact_notes;
create trigger sv_project_fact_notes_no_truncate
  before truncate on public.sv_project_fact_notes
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_client_onboarding (structured, D-13)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_client_onboarding (
  client_id uuid primary key references public.sv_clients (id) on delete restrict,
  company_confirmed_at timestamptz null,
  signatory_name text null check (char_length(signatory_name) <= 120),
  signatory_role text null check (char_length(signatory_role) <= 120),
  project_contact_name text null check (char_length(project_contact_name) <= 120),
  project_contact_email text null check (char_length(project_contact_email) <= 254),
  project_contact_phone text null check (char_length(project_contact_phone) <= 30),
  billing_same_as_company boolean not null default true,
  billing_address jsonb null,
  vat_status text null check (vat_status in ('number', 'not_subject')),
  vat_number text null check (char_length(vat_number) <= 20),
  existing_site_url text null check (existing_site_url ~ '^https://' and char_length(existing_site_url) <= 2000),
  social_links jsonb not null default '[]'::jsonb
    check (jsonb_typeof(social_links) = 'array' and jsonb_array_length(social_links) <= 4),
  project_goal text null check (char_length(project_goal) <= 1000),
  updated_at timestamptz not null default now(),
  updated_by uuid null
);
alter table public.sv_client_onboarding enable row level security;
revoke all on public.sv_client_onboarding from anon, authenticated;
grant select on public.sv_client_onboarding to authenticated;
grant select, insert, update on public.sv_client_onboarding to service_role;

drop policy if exists sv_client_onboarding_read on public.sv_client_onboarding;
create policy sv_client_onboarding_read on public.sv_client_onboarding
  for select to authenticated
  using ((select sv_private.is_admin()) or client_id in (select sv_private.client_ids()));

-- ---------------------------------------------------------------------------
-- sv_project_files (metadata; bytes live in the private bucket)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  storage_path text not null unique,
  filename text not null check (char_length(filename) between 1 and 200),
  mime text not null check (char_length(mime) <= 150),
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  uploaded_by_kind text not null check (uploaded_by_kind in ('client', 'admin')),
  uploaded_by uuid null,
  status text not null default 'pending' check (status in ('pending', 'ready')),
  created_at timestamptz not null default now(),
  ready_at timestamptz null
);
alter table public.sv_project_files enable row level security;
revoke all on public.sv_project_files from anon, authenticated;
grant select (id, project_id, storage_path, filename, mime, size_bytes, uploaded_by_kind, status, created_at, ready_at)
  on public.sv_project_files to authenticated;
grant select, insert, update on public.sv_project_files to service_role;
create index if not exists sv_project_files_project_idx on public.sv_project_files (project_id);

drop policy if exists sv_project_files_read on public.sv_project_files;
create policy sv_project_files_read on public.sv_project_files
  for select to authenticated
  using ((select sv_private.is_admin()) or project_id in (select sv_private.project_ids()));

-- ---------------------------------------------------------------------------
-- sv_project_links
-- ---------------------------------------------------------------------------

create table if not exists public.sv_project_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 80),
  url text not null check (url ~ '^https://' and char_length(url) <= 2000),
  created_by uuid null,
  created_at timestamptz not null default now()
);
alter table public.sv_project_links enable row level security;
revoke all on public.sv_project_links from anon, authenticated;
grant select on public.sv_project_links to authenticated;
grant select, insert on public.sv_project_links to service_role;
create index if not exists sv_project_links_project_idx on public.sv_project_links (project_id);

drop policy if exists sv_project_links_read on public.sv_project_links;
create policy sv_project_links_read on public.sv_project_links
  for select to authenticated
  using ((select sv_private.is_admin()) or project_id in (select sv_private.project_ids()));

-- ---------------------------------------------------------------------------
-- sv_project_consents (append-only, D-16)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_project_consents (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  granted boolean not null,
  text_version text not null check (char_length(text_version) <= 40),
  text_snapshot text not null check (char_length(text_snapshot) between 1 and 5000),
  actor_id uuid not null,
  created_at timestamptz not null default now()
);
alter table public.sv_project_consents enable row level security;
revoke all on public.sv_project_consents from anon, authenticated, service_role;
grant select on public.sv_project_consents to authenticated;
grant select, insert on public.sv_project_consents to service_role;
create index if not exists sv_project_consents_project_idx on public.sv_project_consents (project_id);

drop policy if exists sv_project_consents_read on public.sv_project_consents;
create policy sv_project_consents_read on public.sv_project_consents
  for select to authenticated
  using ((select sv_private.is_admin()) or project_id in (select sv_private.project_ids()));

drop trigger if exists sv_project_consents_no_upd_del on public.sv_project_consents;
create trigger sv_project_consents_no_upd_del
  before update or delete on public.sv_project_consents
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_project_consents_no_truncate on public.sv_project_consents;
create trigger sv_project_consents_no_truncate
  before truncate on public.sv_project_consents
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_mail_outbox (D-17, D-18)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_mail_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('client_invited', 'step_changed', 'onboarding_completed')),
  template text not null check (template in ('invite', 'step_changed', 'onboarding_completed')),
  recipient_email text not null check (char_length(recipient_email) <= 254),
  recipient_kind text not null check (recipient_kind in ('client', 'admin')),
  dedupe_key text not null unique check (char_length(dedupe_key) <= 256),
  payload jsonb not null default '{}'::jsonb,
  client_id uuid null,
  project_id uuid null,
  send_after timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  last_error text null check (char_length(last_error) <= 200),
  provider_id text null,
  claimed_at timestamptz null,
  sent_at timestamptz null,
  created_at timestamptz not null default now()
);
alter table public.sv_mail_outbox enable row level security;
revoke all on public.sv_mail_outbox from anon, authenticated;
grant select on public.sv_mail_outbox to authenticated;
grant select, insert, update on public.sv_mail_outbox to service_role;
create index if not exists sv_mail_outbox_due_idx on public.sv_mail_outbox (status, send_after);

drop policy if exists sv_mail_outbox_admin_read on public.sv_mail_outbox;
create policy sv_mail_outbox_admin_read on public.sv_mail_outbox
  for select to authenticated
  using ((select sv_private.is_admin()));

-- ---------------------------------------------------------------------------
-- Lead journal: allow the lead_converted event (constraint name never hardcoded)
-- ---------------------------------------------------------------------------

do $$
declare
  v_name text;
begin
  select c.conname into v_name
  from pg_constraint c
  where c.conrelid = 'public.sv_lead_events'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%lead_created%'
  limit 1;
  if v_name is not null then
    execute format('alter table public.sv_lead_events drop constraint %I', v_name);
  end if;
  alter table public.sv_lead_events
    add constraint sv_lead_events_type_check check (type in (
      'lead_created', 'contact_added', 'status_changed', 'source_corrected',
      'lead_linked', 'erased', 'return_acknowledged', 'lead_converted'
    ));
end;
$$;

-- ---------------------------------------------------------------------------
-- Private bucket. No policy on the storage objects table on purpose: every access goes
-- through service_role signed URLs. Gecko policies are filtered by bucket_id and are
-- not touched here.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sv-project-files', 'sv-project-files', false, 26214400,
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/zip', 'application/x-zip-compressed',
    'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/postscript', 'application/illustrator',
    'text/plain', 'text/csv'
  ]
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RPC (service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.sv_convert_lead(
  p_lead_id uuid,
  p_actor uuid,
  p_user_id uuid,
  p_email text,
  p_name text,
  p_siret text,
  p_company jsonb,
  p_company_source text,
  p_project_title text,
  p_offer text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.sv_leads%rowtype;
  v_client_id uuid;
  v_project_id uuid;
  v_reused boolean := false;
  v_outbox_id uuid;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_title text := btrim(coalesce(p_project_title, ''));
begin
  select * into v_lead from public.sv_leads where id = p_lead_id for update;
  if not found then
    raise exception 'sv_lead_not_found' using errcode = 'P0001';
  end if;
  if v_lead.erased_at is not null then
    raise exception 'sv_lead_erased' using errcode = 'P0001';
  end if;
  if v_lead.converted_client_id is not null then
    raise exception 'sv_lead_already_converted' using errcode = 'P0001';
  end if;
  if v_lead.status not in ('qualified', 'rdv', 'quote_sent', 'signed') then
    raise exception 'sv_lead_not_convertible' using errcode = 'P0001';
  end if;
  if p_offer is null or p_offer not in (
    'site-vitrine', 'rebranding-site-premium', 'branding', 'projet-sur-mesure',
    'agent-vocal-ia', 'maintenance', 'community-management', 'meta-ads', 'google-ads'
  ) then
    raise exception 'sv_invalid_offer' using errcode = 'P0001';
  end if;
  if char_length(v_title) < 1 or char_length(v_title) > 80 then
    raise exception 'sv_invalid_title' using errcode = 'P0001';
  end if;
  if p_siret is null or p_siret !~ '^[0-9]{14}$' then
    raise exception 'sv_invalid_siret' using errcode = 'P0001';
  end if;

  select c.id into v_client_id from public.sv_clients c where c.siret = p_siret;
  if v_client_id is not null then
    v_reused := true;
  else
    insert into public.sv_clients (name, siret, company, company_source, created_by)
    values (p_name, p_siret, p_company, coalesce(p_company_source, 'api'), p_actor)
    returning id into v_client_id;
  end if;

  insert into public.sv_client_members (client_id, user_id, invited_email)
  values (v_client_id, p_user_id, v_email)
  on conflict (client_id, user_id) do nothing;

  insert into public.sv_projects (client_id, lead_id, title, offer, created_by)
  values (v_client_id, p_lead_id, v_title, p_offer, p_actor)
  returning id into v_project_id;

  update public.sv_leads set converted_client_id = v_client_id where id = p_lead_id;

  insert into public.sv_lead_events (lead_id, type, actor, detail)
  values (p_lead_id, 'lead_converted', coalesce(p_actor::text, 'system'),
    jsonb_build_object('client_id', v_client_id, 'project_id', v_project_id));

  insert into public.sv_mail_outbox (
    event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id
  ) values (
    'client_invited', 'invite', v_email, 'client',
    'client_invited:' || v_client_id::text || ':' || v_email,
    jsonb_build_object('clientName', p_name), v_client_id, v_project_id
  )
  on conflict (dedupe_key) do nothing
  returning id into v_outbox_id;

  return jsonb_build_object(
    'client_id', v_client_id,
    'project_id', v_project_id,
    'client_reused', v_reused,
    'outbox_id', v_outbox_id
  );
end;
$$;
revoke all on function public.sv_convert_lead(uuid, uuid, uuid, text, text, text, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.sv_convert_lead(uuid, uuid, uuid, text, text, text, jsonb, text, text, text) to service_role;

create or replace function public.sv_create_project(
  p_client_id uuid,
  p_actor uuid,
  p_title text,
  p_offer text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_title text := btrim(coalesce(p_title, ''));
begin
  if not exists (select 1 from public.sv_clients where id = p_client_id) then
    raise exception 'sv_client_not_found' using errcode = 'P0001';
  end if;
  if p_offer is null or p_offer not in (
    'site-vitrine', 'rebranding-site-premium', 'branding', 'projet-sur-mesure',
    'agent-vocal-ia', 'maintenance', 'community-management', 'meta-ads', 'google-ads'
  ) then
    raise exception 'sv_invalid_offer' using errcode = 'P0001';
  end if;
  if char_length(v_title) < 1 or char_length(v_title) > 80 then
    raise exception 'sv_invalid_title' using errcode = 'P0001';
  end if;

  insert into public.sv_projects (client_id, title, offer, created_by)
  values (p_client_id, v_title, p_offer, p_actor)
  returning id into v_project_id;

  return jsonb_build_object('project_id', v_project_id);
end;
$$;
revoke all on function public.sv_create_project(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.sv_create_project(uuid, uuid, text, text) to service_role;

create or replace function public.sv_post_project_fact(
  p_project_id uuid,
  p_type text,
  p_actor_kind text,
  p_actor_id uuid,
  p_target_fact_id bigint,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_target public.sv_project_facts%rowtype;
  v_fact_id bigint;
begin
  perform 1 from public.sv_projects where id = p_project_id for update;
  if not found then
    raise exception 'sv_project_not_found' using errcode = 'P0001';
  end if;
  if p_actor_kind is null or p_actor_kind not in ('system', 'admin', 'client') then
    raise exception 'sv_invalid_actor' using errcode = 'P0001';
  end if;
  if p_type is null or p_type not in (
    'onboarding_completed', 'quote_accepted', 'contract_signed', 'deposit_received',
    'production_completed', 'acceptance_signed', 'balance_received', 'fact_revoked'
  ) then
    raise exception 'sv_invalid_fact_type' using errcode = 'P0001';
  end if;
  if p_type = 'onboarding_completed' and p_actor_kind <> 'system' then
    raise exception 'sv_invalid_actor' using errcode = 'P0001';
  end if;

  if p_type = 'fact_revoked' then
    if v_reason is null or char_length(v_reason) < 10 then
      raise exception 'sv_reason_required' using errcode = 'P0001';
    end if;
    if char_length(v_reason) > 500 then
      raise exception 'sv_invalid_reason' using errcode = 'P0001';
    end if;
    select * into v_target from public.sv_project_facts
    where id = p_target_fact_id and project_id = p_project_id and type <> 'fact_revoked';
    if not found then
      raise exception 'sv_invalid_target' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.sv_project_facts r where r.target_fact_id = v_target.id) then
      raise exception 'sv_fact_already_revoked' using errcode = 'P0001';
    end if;

    insert into public.sv_project_facts (project_id, type, target_fact_id, actor_kind, actor_id)
    values (p_project_id, 'fact_revoked', v_target.id, p_actor_kind, p_actor_id)
    returning id into v_fact_id;

    insert into public.sv_project_fact_notes (fact_id, body) values (v_fact_id, v_reason);

    return jsonb_build_object('fact_id', v_fact_id, 'changed', true);
  end if;

  if p_target_fact_id is not null then
    raise exception 'sv_invalid_target' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.sv_project_facts f
    where f.project_id = p_project_id
      and f.type = p_type
      and not exists (select 1 from public.sv_project_facts r where r.target_fact_id = f.id)
  ) then
    return jsonb_build_object('fact_id', null, 'changed', false);
  end if;

  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'sv_invalid_reason' using errcode = 'P0001';
  end if;

  insert into public.sv_project_facts (project_id, type, actor_kind, actor_id)
  values (p_project_id, p_type, p_actor_kind, p_actor_id)
  returning id into v_fact_id;

  if v_reason is not null then
    insert into public.sv_project_fact_notes (fact_id, body) values (v_fact_id, v_reason);
  end if;

  return jsonb_build_object('fact_id', v_fact_id, 'changed', true);
end;
$$;
revoke all on function public.sv_post_project_fact(uuid, text, text, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.sv_post_project_fact(uuid, text, text, uuid, bigint, text) to service_role;

create or replace function public.sv_claim_due_mail(p_limit integer)
returns setof public.sv_mail_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.sv_mail_outbox
  set status = 'failed', last_error = 'stale_sending'
  where status = 'sending' and claimed_at < now() - interval '23 hours';

  return query
  update public.sv_mail_outbox o
  set status = 'sending', attempts = o.attempts + 1, claimed_at = now()
  where o.id in (
    select m.id
    from public.sv_mail_outbox m
    where m.send_after <= now()
      and (
        m.status = 'pending'
        or (m.status = 'failed' and m.attempts < 3 and coalesce(m.last_error, '') <> 'stale_sending')
        or (m.status = 'sending' and m.claimed_at < now() - interval '15 minutes')
      )
    order by m.created_at
    limit greatest(1, least(coalesce(p_limit, 1), 50))
    for update skip locked
  )
  returning o.*;
end;
$$;
revoke all on function public.sv_claim_due_mail(integer) from public, anon, authenticated;
grant execute on function public.sv_claim_due_mail(integer) to service_role;

create or replace function public.sv_client_last_sign_in(p_client_ids uuid[])
returns table (client_id uuid, last_sign_in_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.client_id, max(u.last_sign_in_at) as last_sign_in_at
  from public.sv_client_members m
  join auth.users u on u.id = m.user_id
  where m.client_id = any(p_client_ids)
  group by m.client_id;
$$;
revoke all on function public.sv_client_last_sign_in(uuid[]) from public, anon, authenticated;
grant execute on function public.sv_client_last_sign_in(uuid[]) to service_role;
