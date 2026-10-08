-- supabase/migrations/20261010000000_sv_reviews.sql
--
-- Sevalys - Phase 18 (avis clients verifies) - REV-01, REV-03.
-- Runs after 20261009000000_sv_pilotage.sql. NOT applied here: branch push is 18-05,
-- production apply is 18-15 (shared PRODUCTION Supabase project). No begin/commit: the
-- production apply wraps the file.
--
-- Decisions implemented:
--   D-03  public reads are paginated (limit 1..100, offset >= 0) so /avis lists everything.
--   D-04  public reads return display columns only, of reviews whose latest moderation action
--         is not a hide.
--   D-05  submitting publishes immediately, skips the pending review requests of the project
--         and queues one admin alert.
--   D-06  a review is immutable for every role (service_role included); hiding never edits or
--         deletes it; four legal reasons only, none tied to the rating or the opinion.
--   D-07  every moderation action is an append-only log row with actor and date; a hide queues
--         one transactional notice per client member of the project.
--   D-09  a review link is stored as a sha256 hex hash, expires 60 days after the effective
--         acceptance_signed fact (or 60 days after a reissue) and is consumed exactly once;
--         a reissue invalidates the active link and is journaled.
--   D-15  every new table has RLS here; only admins read; the 6 public RPCs are executable by
--         service_role only; the private helper and the trigger function by nobody.
-- Every foreign key is on delete restrict and none points to auth.users.

-- ---------------------------------------------------------------------------
-- Outbox closed lists: content loop, no hard-coded constraint name
-- ---------------------------------------------------------------------------

do $$
declare
  v_name text;
begin
  for v_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.sv_mail_outbox'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%mail_suppression_admin%'
  loop
    execute format('alter table public.sv_mail_outbox drop constraint %I', v_name);
  end loop;
  alter table public.sv_mail_outbox
    add constraint sv_mail_outbox_event_type_check check (event_type in ('client_invited', 'step_changed', 'onboarding_completed', 'document_issued', 'document_signed', 'document_signed_admin', 'acceptance_refused', 'payment_requested', 'payment_received', 'payment_reminder', 'payment_reminder_admin', 'payment_anomaly_admin', 'credit_note_issued', 'document_reminder', 'document_reminder_admin', 'review_request', 'mail_suppression_admin', 'review_published_admin', 'review_hidden'));
  alter table public.sv_mail_outbox
    add constraint sv_mail_outbox_template_check check (template in ('invite', 'step_changed', 'onboarding_completed', 'document_issued', 'document_signed', 'document_signed_admin', 'acceptance_refused', 'payment_requested', 'payment_received', 'payment_reminder', 'payment_reminder_admin', 'payment_anomaly_admin', 'credit_note_issued', 'document_reminder', 'document_reminder_admin', 'review_request', 'mail_suppression_admin', 'review_published_admin', 'review_hidden'));
end;
$$;

-- ---------------------------------------------------------------------------
-- sv_review_links (D-09): hashed token, set-once used/invalidated
-- ---------------------------------------------------------------------------

create table if not exists public.sv_review_links (
  id uuid primary key,
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  generation int not null default 1 check (generation >= 1),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid null,
  used_at timestamptz null,
  invalidated_at timestamptz null,
  invalidated_by uuid null,
  check (not (used_at is not null and invalidated_at is not null))
);
alter table public.sv_review_links enable row level security;
revoke all on public.sv_review_links from anon, authenticated, service_role;
grant select on public.sv_review_links to service_role;
grant select on public.sv_review_links to authenticated;

create unique index if not exists sv_review_links_one_active
  on public.sv_review_links (project_id)
  where used_at is null and invalidated_at is null;

drop policy if exists sv_review_links_admin_read on public.sv_review_links;
create policy sv_review_links_admin_read on public.sv_review_links
  for select to authenticated
  using ((select sv_private.is_admin()));

create or replace function sv_private.review_link_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.project_id is distinct from old.project_id
     or new.token_hash is distinct from old.token_hash
     or new.generation is distinct from old.generation
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at
     or new.created_by is distinct from old.created_by then
    raise exception 'sv_link_immutable' using errcode = 'P0001';
  end if;
  if (old.used_at is not null and new.used_at is distinct from old.used_at)
     or (old.invalidated_at is not null and new.invalidated_at is distinct from old.invalidated_at)
     or (old.invalidated_by is not null and new.invalidated_by is distinct from old.invalidated_by) then
    raise exception 'sv_link_immutable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function sv_private.review_link_guard() from public, anon, authenticated;

drop trigger if exists sv_review_links_guard on public.sv_review_links;
create trigger sv_review_links_guard
  before update on public.sv_review_links
  for each row execute function sv_private.review_link_guard();
drop trigger if exists sv_review_links_no_delete on public.sv_review_links;
create trigger sv_review_links_no_delete
  before delete on public.sv_review_links
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_review_links_no_truncate on public.sv_review_links;
create trigger sv_review_links_no_truncate
  before truncate on public.sv_review_links
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_reviews (D-06): immutable, no e-mail, no IP
-- ---------------------------------------------------------------------------

create table if not exists public.sv_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.sv_projects (id) on delete restrict,
  link_id uuid not null unique references public.sv_review_links (id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  title text null check (title is null or char_length(btrim(title)) between 1 and 100),
  body text not null check (char_length(btrim(body)) between 20 and 2000) check (body !~ '[<>]'),
  display_mode text not null check (display_mode in ('first_company', 'first_initial', 'company_only')),
  display_name text not null check (char_length(display_name) between 1 and 99),
  author_kind text not null check (author_kind in ('person', 'company')),
  company_name_snapshot text not null,
  publication_consent boolean not null check (publication_consent),
  experience_date date not null,
  published_at timestamptz not null default now()
);
alter table public.sv_reviews enable row level security;
revoke all on public.sv_reviews from anon, authenticated, service_role;
grant select on public.sv_reviews to service_role;
grant select on public.sv_reviews to authenticated;

drop policy if exists sv_reviews_admin_read on public.sv_reviews;
create policy sv_reviews_admin_read on public.sv_reviews
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_reviews_no_upd_del on public.sv_reviews;
create trigger sv_reviews_no_upd_del
  before update or delete on public.sv_reviews
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_reviews_no_truncate on public.sv_reviews;
create trigger sv_reviews_no_truncate
  before truncate on public.sv_reviews
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_review_moderation_log (D-06, D-07): append-only; state = action of the highest id
-- ---------------------------------------------------------------------------

create table if not exists public.sv_review_moderation_log (
  id bigint generated always as identity primary key,
  review_id uuid not null references public.sv_reviews (id) on delete restrict,
  action text not null check (action in ('hide', 'unhide')),
  reason text null check (reason in ('defamation_or_insult', 'third_party_personal_data', 'illegal_content', 'inauthentic')),
  detail text not null check (char_length(btrim(detail)) between 3 and 500),
  actor_id uuid not null,
  created_at timestamptz not null default now(),
  check ((action = 'hide' and reason is not null) or (action = 'unhide' and reason is null))
);
alter table public.sv_review_moderation_log enable row level security;
revoke all on public.sv_review_moderation_log from anon, authenticated, service_role;
grant select on public.sv_review_moderation_log to service_role;
grant select on public.sv_review_moderation_log to authenticated;
create index if not exists sv_review_moderation_log_review_idx
  on public.sv_review_moderation_log (review_id, id desc);

drop policy if exists sv_review_moderation_log_admin_read on public.sv_review_moderation_log;
create policy sv_review_moderation_log_admin_read on public.sv_review_moderation_log
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_review_moderation_log_no_upd_del on public.sv_review_moderation_log;
create trigger sv_review_moderation_log_no_upd_del
  before update or delete on public.sv_review_moderation_log
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_review_moderation_log_no_truncate on public.sv_review_moderation_log;
create trigger sv_review_moderation_log_no_truncate
  before truncate on public.sv_review_moderation_log
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_review_link_events (D-09): journal of reissues
-- ---------------------------------------------------------------------------

create table if not exists public.sv_review_link_events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  action text not null check (action = 'reissue'),
  old_link_id uuid null references public.sv_review_links (id) on delete restrict,
  new_link_id uuid not null references public.sv_review_links (id) on delete restrict,
  actor_id uuid not null,
  detail text not null check (char_length(btrim(detail)) between 3 and 500),
  created_at timestamptz not null default now()
);
alter table public.sv_review_link_events enable row level security;
revoke all on public.sv_review_link_events from anon, authenticated, service_role;
grant select on public.sv_review_link_events to service_role;
grant select on public.sv_review_link_events to authenticated;

drop policy if exists sv_review_link_events_admin_read on public.sv_review_link_events;
create policy sv_review_link_events_admin_read on public.sv_review_link_events
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_review_link_events_no_upd_del on public.sv_review_link_events;
create trigger sv_review_link_events_no_upd_del
  before update or delete on public.sv_review_link_events
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_review_link_events_no_truncate on public.sv_review_link_events;
create trigger sv_review_link_events_no_truncate
  before truncate on public.sv_review_link_events
  for each statement execute function sv_private.deny_mutation();

-- fin partie 1

-- ---------------------------------------------------------------------------
-- Private helper: effective acceptance date of a project (null when not signed)
-- ---------------------------------------------------------------------------

create or replace function sv_private.review_signed_at(p_project_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(f.created_at)
  from public.sv_project_facts f
  where f.project_id = p_project_id
    and f.type = 'acceptance_signed'
    and not exists (
      select 1 from public.sv_project_facts r
      where r.type = 'fact_revoked' and r.target_fact_id = f.id
    );
$$;
revoke all on function sv_private.review_signed_at(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- sv_ensure_review_link (D-09): expiry counts from the signed acceptance
-- ---------------------------------------------------------------------------

create or replace function public.sv_ensure_review_link(
  p_project_id uuid,
  p_link_id uuid,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_signed timestamptz;
  v_active public.sv_review_links%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('sv_review_link:' || p_project_id::text, 0));

  v_signed := sv_private.review_signed_at(p_project_id);
  if v_signed is null then
    return jsonb_build_object('outcome', 'not_signed', 'link_id', null);
  end if;

  if exists (select 1 from public.sv_reviews r where r.project_id = p_project_id) then
    return jsonb_build_object('outcome', 'reviewed', 'link_id', null);
  end if;

  select * into v_active
  from public.sv_review_links l
  where l.project_id = p_project_id
    and l.used_at is null
    and l.invalidated_at is null;

  if found then
    if v_active.expires_at > now() then
      return jsonb_build_object('outcome', 'existing', 'link_id', v_active.id);
    end if;
    return jsonb_build_object('outcome', 'expired', 'link_id', null);
  end if;

  if v_signed + interval '60 days' <= now() then
    return jsonb_build_object('outcome', 'expired', 'link_id', null);
  end if;

  insert into public.sv_review_links (id, project_id, token_hash, generation, expires_at, created_by)
  values (
    p_link_id,
    p_project_id,
    p_token_hash,
    coalesce((select max(l.generation) from public.sv_review_links l where l.project_id = p_project_id), 0) + 1,
    v_signed + interval '60 days',
    null
  );

  return jsonb_build_object('outcome', 'created', 'link_id', p_link_id);
end;
$$;
revoke all on function public.sv_ensure_review_link(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.sv_ensure_review_link(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- sv_review_link_state (D-09): one generic invalid payload, no leak
-- ---------------------------------------------------------------------------

create or replace function public.sv_review_link_state(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_company text;
begin
  select p.title, c.name into v_title, v_company
  from public.sv_review_links l
  join public.sv_projects p on p.id = l.project_id
  join public.sv_clients c on c.id = p.client_id
  where l.token_hash = p_token_hash
    and l.used_at is null
    and l.invalidated_at is null
    and l.expires_at > now()
    and not exists (select 1 from public.sv_reviews r where r.project_id = l.project_id);

  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;

  return jsonb_build_object('state', 'valid', 'project_title', v_title, 'company_name', v_company);
end;
$$;
revoke all on function public.sv_review_link_state(text) from public, anon, authenticated;
grant execute on function public.sv_review_link_state(text) to service_role;

-- ---------------------------------------------------------------------------
-- sv_submit_review (D-05, D-09): one lock, one review, link consumed once
-- ---------------------------------------------------------------------------

create or replace function public.sv_submit_review(
  p_token_hash text,
  p_rating int,
  p_title text,
  p_body text,
  p_display_mode text,
  p_first_name text,
  p_last_initial text,
  p_consent boolean,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.sv_review_links%rowtype;
  v_company text;
  v_project_title text;
  v_client_id uuid;
  v_first text := btrim(coalesce(p_first_name, ''));
  v_initial text := btrim(coalesce(p_last_initial, ''));
  v_admin text := lower(btrim(coalesce(p_admin_email, '')));
  v_display text;
  v_kind text;
  v_signed timestamptz;
  v_review_id uuid;
  v_oid uuid;
  v_ids uuid[] := '{}';
begin
  if p_consent is distinct from true then
    raise exception 'sv_consent_required' using errcode = 'P0001';
  end if;

  select * into v_link
  from public.sv_review_links l
  where l.token_hash = p_token_hash
  for update;

  if not found
     or v_link.used_at is not null
     or v_link.invalidated_at is not null
     or v_link.expires_at <= now()
     or exists (select 1 from public.sv_reviews r where r.project_id = v_link.project_id) then
    return jsonb_build_object('outcome', 'link_invalid', 'review_id', null, 'outbox_ids', '[]'::jsonb);
  end if;

  select p.title, p.client_id, c.name into v_project_title, v_client_id, v_company
  from public.sv_projects p
  join public.sv_clients c on c.id = p.client_id
  where p.id = v_link.project_id;

  if p_display_mode is null or p_display_mode not in ('first_company', 'first_initial', 'company_only') then
    raise exception 'sv_invalid_display_mode' using errcode = 'P0001';
  end if;

  if p_display_mode in ('first_company', 'first_initial')
     and char_length(v_first) not between 1 and 40 then
    raise exception 'sv_invalid_name' using errcode = 'P0001';
  end if;
  if p_display_mode = 'first_initial' and v_initial !~ '^[[:alpha:]]$' then
    raise exception 'sv_invalid_name' using errcode = 'P0001';
  end if;

  if p_display_mode = 'first_company' then
    v_display := v_first || ', ' || v_company;
    v_kind := 'person';
  elsif p_display_mode = 'first_initial' then
    v_display := v_first || ' ' || upper(v_initial) || '.';
    v_kind := 'person';
  else
    v_display := v_company;
    v_kind := 'company';
  end if;
  v_display := left(v_display, 99);

  v_signed := sv_private.review_signed_at(v_link.project_id);

  insert into public.sv_reviews (
    project_id, link_id, rating, title, body, display_mode, display_name, author_kind,
    company_name_snapshot, publication_consent, experience_date
  ) values (
    v_link.project_id,
    v_link.id,
    p_rating,
    nullif(btrim(coalesce(p_title, '')), ''),
    btrim(coalesce(p_body, '')),
    p_display_mode,
    v_display,
    v_kind,
    v_company,
    true,
    (coalesce(v_signed, now()) at time zone 'Europe/Paris')::date
  )
  returning id into v_review_id;

  update public.sv_review_links set used_at = now() where id = v_link.id;

  update public.sv_mail_outbox
  set status = 'skipped', last_error = 'review_filed'
  where project_id = v_link.project_id
    and status in ('pending', 'failed')
    and event_type = 'review_request';

  if v_admin <> '' then
    insert into public.sv_mail_outbox (
      event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id
    ) values (
      'review_published_admin', 'review_published_admin', v_admin, 'admin',
      'review_published_admin:' || v_review_id::text,
      jsonb_build_object('projectTitle', v_project_title, 'rating', p_rating),
      v_client_id, v_link.project_id
    )
    on conflict (dedupe_key) do nothing
    returning id into v_oid;
    if v_oid is not null then
      v_ids := v_ids || v_oid;
    end if;
  end if;

  return jsonb_build_object('outcome', 'published', 'review_id', v_review_id, 'outbox_ids', to_jsonb(v_ids));
end;
$$;
revoke all on function public.sv_submit_review(text, int, text, text, text, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.sv_submit_review(text, int, text, text, text, text, text, boolean, text) to service_role;

-- ---------------------------------------------------------------------------
-- sv_public_reviews (D-03, D-04): display columns only, paginated
-- ---------------------------------------------------------------------------

create or replace function public.sv_public_reviews(p_limit int, p_offset int)
returns table (
  id uuid,
  rating smallint,
  title text,
  body text,
  display_name text,
  author_kind text,
  published_at timestamptz,
  experience_date date
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.rating, r.title, r.body, r.display_name, r.author_kind, r.published_at, r.experience_date
  from public.sv_reviews r
  where coalesce(
    (select m.action from public.sv_review_moderation_log m where m.review_id = r.id order by m.id desc limit 1),
    'unhide'
  ) <> 'hide'
  order by r.published_at desc, r.id desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;
revoke all on function public.sv_public_reviews(int, int) from public, anon, authenticated;
grant execute on function public.sv_public_reviews(int, int) to service_role;

-- ---------------------------------------------------------------------------
-- sv_moderate_review (D-06, D-07): hide / unhide, append-only
-- ---------------------------------------------------------------------------

create or replace function public.sv_moderate_review(
  p_review_id uuid,
  p_action text,
  p_reason text,
  p_detail text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current text;
  v_target text;
  v_mod_id bigint;
  v_project_id uuid;
  v_client_id uuid;
  v_title text;
  v_email text;
  v_oid uuid;
  v_ids uuid[] := '{}';
begin
  if p_actor_id is null or not exists (select 1 from public.sv_admins a where a.user_id = p_actor_id) then
    raise exception 'sv_not_admin' using errcode = 'P0001';
  end if;
  if p_action is null or p_action not in ('hide', 'unhide') then
    raise exception 'sv_invalid_action' using errcode = 'P0001';
  end if;
  if p_action = 'hide' and (p_reason is null or p_reason not in ('defamation_or_insult', 'third_party_personal_data', 'illegal_content', 'inauthentic')) then
    raise exception 'sv_invalid_reason' using errcode = 'P0001';
  end if;
  if p_detail is null or char_length(btrim(p_detail)) not between 3 and 500 then
    raise exception 'sv_invalid_detail' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('sv_review_mod:' || p_review_id::text, 0));

  select r.project_id into v_project_id from public.sv_reviews r where r.id = p_review_id;
  if not found then
    return jsonb_build_object('outcome', 'not_found', 'moderation_id', null, 'outbox_ids', '[]'::jsonb);
  end if;

  select m.action into v_current
  from public.sv_review_moderation_log m
  where m.review_id = p_review_id
  order by m.id desc
  limit 1;
  v_current := case when v_current = 'hide' then 'hide' else 'unhide' end;
  v_target := p_action;

  if v_current = v_target then
    return jsonb_build_object('outcome', 'unchanged', 'moderation_id', null, 'outbox_ids', '[]'::jsonb);
  end if;

  insert into public.sv_review_moderation_log (review_id, action, reason, detail, actor_id)
  values (
    p_review_id,
    p_action,
    case when p_action = 'hide' then p_reason else null end,
    btrim(p_detail),
    p_actor_id
  )
  returning id into v_mod_id;

  if p_action = 'hide' then
    select p.client_id, p.title into v_client_id, v_title
    from public.sv_projects p where p.id = v_project_id;

    for v_email in
      select distinct lower(btrim(m.invited_email))
      from public.sv_client_members m
      where m.client_id = v_client_id
        and m.invited_email is not null
        and btrim(m.invited_email) <> ''
    loop
      v_oid := null;
      insert into public.sv_mail_outbox (
        event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id
      ) values (
        'review_hidden', 'review_hidden', v_email, 'client',
        'review_hidden:' || v_mod_id::text || ':' || v_email,
        jsonb_build_object('projectTitle', v_title),
        v_client_id, v_project_id
      )
      on conflict (dedupe_key) do nothing
      returning id into v_oid;
      if v_oid is not null then
        v_ids := v_ids || v_oid;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'outcome', case when p_action = 'hide' then 'hidden' else 'unhidden' end,
    'moderation_id', v_mod_id,
    'outbox_ids', to_jsonb(v_ids)
  );
end;
$$;
revoke all on function public.sv_moderate_review(uuid, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.sv_moderate_review(uuid, text, text, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- sv_reissue_review_link (D-09): invalidate the active link, create a new one, journal it
-- ---------------------------------------------------------------------------

create or replace function public.sv_reissue_review_link(
  p_project_id uuid,
  p_link_id uuid,
  p_token_hash text,
  p_actor_id uuid,
  p_detail text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_id uuid;
  v_skipped integer := 0;
begin
  if p_actor_id is null or not exists (select 1 from public.sv_admins a where a.user_id = p_actor_id) then
    raise exception 'sv_not_admin' using errcode = 'P0001';
  end if;
  if p_detail is null or char_length(btrim(p_detail)) not between 3 and 500 then
    raise exception 'sv_invalid_detail' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('sv_review_link:' || p_project_id::text, 0));

  if sv_private.review_signed_at(p_project_id) is null then
    return jsonb_build_object('outcome', 'not_signed', 'link_id', null, 'skipped', 0);
  end if;

  if exists (select 1 from public.sv_reviews r where r.project_id = p_project_id) then
    return jsonb_build_object('outcome', 'reviewed', 'link_id', null, 'skipped', 0);
  end if;

  update public.sv_review_links
  set invalidated_at = now(), invalidated_by = p_actor_id
  where project_id = p_project_id
    and used_at is null
    and invalidated_at is null
  returning id into v_old_id;

  insert into public.sv_review_links (id, project_id, token_hash, generation, expires_at, created_by)
  values (
    p_link_id,
    p_project_id,
    p_token_hash,
    coalesce((select max(l.generation) from public.sv_review_links l where l.project_id = p_project_id), 0) + 1,
    now() + interval '60 days',
    p_actor_id
  );

  insert into public.sv_review_link_events (project_id, action, old_link_id, new_link_id, actor_id, detail)
  values (p_project_id, 'reissue', v_old_id, p_link_id, p_actor_id, btrim(p_detail));

  update public.sv_mail_outbox
  set status = 'skipped', last_error = 'link_reissued'
  where project_id = p_project_id
    and status in ('pending', 'failed')
    and event_type = 'review_request';
  get diagnostics v_skipped = row_count;

  return jsonb_build_object('outcome', 'reissued', 'link_id', p_link_id, 'skipped', v_skipped);
end;
$$;
revoke all on function public.sv_reissue_review_link(uuid, uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.sv_reissue_review_link(uuid, uuid, text, uuid, text) to service_role;
