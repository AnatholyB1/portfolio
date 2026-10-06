-- supabase/migrations/20261008000000_sv_mail_automation.sql
--
-- Sevalys - Phase 16 (mailing automation completion) - MAIL-03, MAIL-04.
-- Runs after 20261007010000_sv_payments.sql. NOT applied here: branch push is 16-05,
-- production apply is 16-13 (shared PRODUCTION Supabase project).
--
-- Decisions implemented:
--   D-02  reminders can be suspended per project: an append-only hold journal; suspending
--         skips the pending sweep-driven reminders of that project.
--   D-07  a permanent bounce is a scope 'all' suppression and always alerts the admin;
--         transient and undetermined bounces are ignored.
--   D-08  suppressions, lifts and holds are append-only for every role (service_role included);
--         a lift is a new row, needs an admin actor and a 3-300 character reason; an alert is
--         queued when the suppressed address belongs to a client member or a lead contact.
--   D-09  every Resend event id (svix-id) is recorded once; a replay returns 'duplicate'.
--   D-11  an unsubscribe is a scope 'marketing' suppression; no self-service resubscribe.
--   D-13  a complaint is a scope 'marketing' suppression.
--   D-14  the outbox closed lists are rebuilt by a pg_constraint content loop, never by a
--         hard-coded constraint name.
--   D-15  every new table has RLS here; only admins read; no new RPC is executable by
--         anon or authenticated.
-- Decisions recorded here:
--   A1  Transient and Undetermined bounces are ignored.
--   A4  the Resend event id is the svix-id header, 1..200 characters.
--   The reminder hold covers the sweep-driven reminders (unsigned documents and review
--   requests). Deposit reminders stay on the existing SQL path (D-16) and stop on payment or
--   credit note as today.
-- Every foreign key is on delete restrict and none points to auth.users.

-- ---------------------------------------------------------------------------
-- Outbox closed lists (D-14): content loop, no hard-coded constraint name
-- ---------------------------------------------------------------------------

do $$
declare
  v_name text;
begin
  alter table public.sv_mail_outbox drop constraint if exists sv_mail_outbox_event_type_check;
  alter table public.sv_mail_outbox drop constraint if exists sv_mail_outbox_template_check;
  for v_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.sv_mail_outbox'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%credit_note_issued%'
  loop
    execute format('alter table public.sv_mail_outbox drop constraint %I', v_name);
  end loop;
  alter table public.sv_mail_outbox
    add constraint sv_mail_outbox_event_type_check check (event_type in ('client_invited', 'step_changed', 'onboarding_completed', 'document_issued', 'document_signed', 'document_signed_admin', 'acceptance_refused', 'payment_requested', 'payment_received', 'payment_reminder', 'payment_reminder_admin', 'payment_anomaly_admin', 'credit_note_issued', 'document_reminder', 'document_reminder_admin', 'review_request', 'mail_suppression_admin'));
  alter table public.sv_mail_outbox
    add constraint sv_mail_outbox_template_check check (template in ('invite', 'step_changed', 'onboarding_completed', 'document_issued', 'document_signed', 'document_signed_admin', 'acceptance_refused', 'payment_requested', 'payment_received', 'payment_reminder', 'payment_reminder_admin', 'payment_anomaly_admin', 'credit_note_issued', 'document_reminder', 'document_reminder_admin', 'review_request', 'mail_suppression_admin'));
end;
$$;

-- ---------------------------------------------------------------------------
-- sv_resend_events (D-09): one row per Resend event id, no payload
-- ---------------------------------------------------------------------------

create table if not exists public.sv_resend_events (
  event_id text primary key check (char_length(event_id) between 1 and 200),
  event_type text not null check (char_length(event_type) <= 100),
  outcome text not null check (outcome in ('applied', 'ignored')),
  received_at timestamptz not null default now()
);
alter table public.sv_resend_events enable row level security;
revoke all on public.sv_resend_events from anon, authenticated, service_role;
grant select on public.sv_resend_events to service_role;

drop trigger if exists sv_resend_events_no_upd_del on public.sv_resend_events;
create trigger sv_resend_events_no_upd_del
  before update or delete on public.sv_resend_events
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_resend_events_no_truncate on public.sv_resend_events;
create trigger sv_resend_events_no_truncate
  before truncate on public.sv_resend_events
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_mail_suppressions (D-07, D-11, D-13): append-only
-- ---------------------------------------------------------------------------

create table if not exists public.sv_mail_suppressions (
  id bigint generated always as identity primary key,
  email_norm text not null check (
    email_norm = lower(btrim(email_norm))
    and char_length(email_norm) between 3 and 254
    and position('@' in email_norm) > 1
  ),
  scope text not null check (scope in ('marketing', 'all')),
  cause text not null check (cause in ('complaint', 'bounce_permanent', 'unsubscribe')),
  source text not null check (source in ('resend_webhook', 'one_click', 'link')),
  resend_event_id text null references public.sv_resend_events (event_id) on delete restrict,
  created_at timestamptz not null default now(),
  check (scope = case when cause = 'bounce_permanent' then 'all' else 'marketing' end),
  check ((cause = 'unsubscribe') = (source in ('one_click', 'link'))),
  check ((source = 'resend_webhook') = (resend_event_id is not null)),
  unique (email_norm, cause, resend_event_id)
);
alter table public.sv_mail_suppressions enable row level security;
revoke all on public.sv_mail_suppressions from anon, authenticated, service_role;
grant select on public.sv_mail_suppressions to service_role;
grant select on public.sv_mail_suppressions to authenticated;
create index if not exists sv_mail_suppressions_email_idx on public.sv_mail_suppressions (email_norm);

drop policy if exists sv_mail_suppressions_admin_read on public.sv_mail_suppressions;
create policy sv_mail_suppressions_admin_read on public.sv_mail_suppressions
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_mail_suppressions_no_upd_del on public.sv_mail_suppressions;
create trigger sv_mail_suppressions_no_upd_del
  before update or delete on public.sv_mail_suppressions
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_mail_suppressions_no_truncate on public.sv_mail_suppressions;
create trigger sv_mail_suppressions_no_truncate
  before truncate on public.sv_mail_suppressions
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_mail_suppression_lifts (D-08): a lift is a new row, never an update
-- ---------------------------------------------------------------------------

create table if not exists public.sv_mail_suppression_lifts (
  id bigint generated always as identity primary key,
  suppression_id bigint not null unique references public.sv_mail_suppressions (id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 3 and 300),
  lifted_by uuid not null,
  created_at timestamptz not null default now()
);
alter table public.sv_mail_suppression_lifts enable row level security;
revoke all on public.sv_mail_suppression_lifts from anon, authenticated, service_role;
grant select on public.sv_mail_suppression_lifts to service_role;
grant select on public.sv_mail_suppression_lifts to authenticated;

drop policy if exists sv_mail_suppression_lifts_admin_read on public.sv_mail_suppression_lifts;
create policy sv_mail_suppression_lifts_admin_read on public.sv_mail_suppression_lifts
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_mail_suppression_lifts_no_upd_del on public.sv_mail_suppression_lifts;
create trigger sv_mail_suppression_lifts_no_upd_del
  before update or delete on public.sv_mail_suppression_lifts
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_mail_suppression_lifts_no_truncate on public.sv_mail_suppression_lifts;
create trigger sv_mail_suppression_lifts_no_truncate
  before truncate on public.sv_mail_suppression_lifts
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_reminder_holds (D-02): current state = action of the highest id row (none = active)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_reminder_holds (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  action text not null check (action in ('suspend', 'resume')),
  actor_id uuid not null,
  created_at timestamptz not null default now()
);
alter table public.sv_reminder_holds enable row level security;
revoke all on public.sv_reminder_holds from anon, authenticated, service_role;
grant select on public.sv_reminder_holds to service_role;
grant select on public.sv_reminder_holds to authenticated;
create index if not exists sv_reminder_holds_project_idx on public.sv_reminder_holds (project_id, id desc);

drop policy if exists sv_reminder_holds_admin_read on public.sv_reminder_holds;
create policy sv_reminder_holds_admin_read on public.sv_reminder_holds
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_reminder_holds_no_upd_del on public.sv_reminder_holds;
create trigger sv_reminder_holds_no_upd_del
  before update or delete on public.sv_reminder_holds
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_reminder_holds_no_truncate on public.sv_reminder_holds;
create trigger sv_reminder_holds_no_truncate
  before truncate on public.sv_reminder_holds
  for each statement execute function sv_private.deny_mutation();

-- fin partie 1

-- ---------------------------------------------------------------------------
-- sv_mail_block_scope: 'all' | 'marketing' | 'none' for one address
-- ---------------------------------------------------------------------------

create or replace function public.sv_mail_block_scope(p_email text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if exists (
    select 1 from public.sv_mail_suppressions s
    where s.email_norm = v_email
      and s.scope = 'all'
      and not exists (select 1 from public.sv_mail_suppression_lifts l where l.suppression_id = s.id)
  ) then
    return 'all';
  end if;
  if exists (
    select 1 from public.sv_mail_suppressions s
    where s.email_norm = v_email
      and s.scope = 'marketing'
      and not exists (select 1 from public.sv_mail_suppression_lifts l where l.suppression_id = s.id)
  ) then
    return 'marketing';
  end if;
  return 'none';
end;
$$;
revoke all on function public.sv_mail_block_scope(text) from public, anon, authenticated;
grant execute on function public.sv_mail_block_scope(text) to service_role;

-- ---------------------------------------------------------------------------
-- Private helper: admin alert for a new suppression (D-07, D-08)
-- ---------------------------------------------------------------------------

create or replace function sv_private.queue_suppression_alert(
  p_suppression_id bigint,
  p_email text,
  p_cause text,
  p_force boolean,
  p_admin_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_admin text := lower(btrim(coalesce(p_admin_email, '')));
  v_client_id uuid;
  v_client_name text;
  v_is_lead boolean;
  v_id uuid;
begin
  if v_admin = '' then
    return null;
  end if;

  select c.id, c.name into v_client_id, v_client_name
  from public.sv_client_members m
  join public.sv_clients c on c.id = m.client_id
  where lower(btrim(m.invited_email)) = v_email
  limit 1;

  v_is_lead := exists (select 1 from public.sv_lead_contacts lc where lc.email_norm = v_email);

  if not (coalesce(p_force, false) or v_client_id is not null or v_is_lead) then
    return null;
  end if;

  insert into public.sv_mail_outbox (
    event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id
  ) values (
    'mail_suppression_admin', 'mail_suppression_admin', v_admin, 'admin',
    'mail_suppression_admin:' || p_suppression_id::text,
    jsonb_build_object(
      'cause', p_cause,
      'maskedEmail', left(split_part(v_email, '@', 1), 1) || '***@' || split_part(v_email, '@', 2),
      'clientName', v_client_name,
      'isLead', v_is_lead
    ),
    v_client_id
  )
  on conflict (dedupe_key) do nothing
  returning id into v_id;

  return v_id;
end;
$$;
revoke all on function sv_private.queue_suppression_alert(bigint, text, text, boolean, text) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sv_apply_resend_event (D-07, D-09, D-13)
-- ---------------------------------------------------------------------------

create or replace function public.sv_apply_resend_event(
  p_event_id text,
  p_event_type text,
  p_emails text[],
  p_bounce_type text,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_emails text[];
  v_email text;
  v_cause text;
  v_scope text;
  v_outcome text;
  v_inserted text;
  v_sid bigint;
  v_oid uuid;
  v_count integer := 0;
  v_ids uuid[] := '{}';
begin
  if p_event_id is null or char_length(p_event_id) not between 1 and 200
     or p_event_type is null or char_length(p_event_type) > 100
     or p_emails is null or coalesce(array_length(p_emails, 1), 0) not between 1 and 50 then
    raise exception 'sv_invalid_resend_event' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(distinct lower(btrim(e))), '{}') into v_emails
  from unnest(p_emails) as e;

  foreach v_email in array v_emails loop
    if v_email is null or char_length(v_email) not between 3 and 254 or position('@' in v_email) <= 1 then
      raise exception 'sv_invalid_resend_event' using errcode = 'P0001';
    end if;
  end loop;

  v_outcome := case
    when p_event_type = 'email.complained' then 'applied'
    when p_event_type = 'email.bounced' and p_bounce_type = 'Permanent' then 'applied'
    else 'ignored'
  end;

  insert into public.sv_resend_events (event_id, event_type, outcome)
  values (p_event_id, p_event_type, v_outcome)
  on conflict (event_id) do nothing
  returning event_id into v_inserted;

  if v_inserted is null then
    return jsonb_build_object('outcome', 'duplicate', 'suppressions', 0, 'outbox_ids', '[]'::jsonb);
  end if;

  if v_outcome = 'ignored' then
    return jsonb_build_object('outcome', 'ignored', 'suppressions', 0, 'outbox_ids', '[]'::jsonb);
  end if;

  if p_event_type = 'email.complained' then
    v_cause := 'complaint';
    v_scope := 'marketing';
  else
    v_cause := 'bounce_permanent';
    v_scope := 'all';
  end if;

  foreach v_email in array v_emails loop
    v_sid := null;
    insert into public.sv_mail_suppressions (email_norm, scope, cause, source, resend_event_id)
    values (v_email, v_scope, v_cause, 'resend_webhook', p_event_id)
    on conflict do nothing
    returning id into v_sid;

    if v_sid is not null then
      v_count := v_count + 1;
      v_oid := sv_private.queue_suppression_alert(
        v_sid, v_email, v_cause, (v_cause = 'bounce_permanent'), p_admin_email
      );
      if v_oid is not null then
        v_ids := v_ids || v_oid;
      end if;
    end if;
  end loop;

  return jsonb_build_object('outcome', 'applied', 'suppressions', v_count, 'outbox_ids', to_jsonb(v_ids));
end;
$$;
revoke all on function public.sv_apply_resend_event(text, text, text[], text, text) from public, anon, authenticated;
grant execute on function public.sv_apply_resend_event(text, text, text[], text, text) to service_role;

-- ---------------------------------------------------------------------------
-- sv_record_unsubscribe (D-11): no self-service resubscribe, repeated clicks do not grow the log
-- ---------------------------------------------------------------------------

create or replace function public.sv_record_unsubscribe(
  p_email text,
  p_source text,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_sid bigint;
  v_oid uuid;
  v_ids uuid[] := '{}';
begin
  if p_source is null or p_source not in ('one_click', 'link')
     or char_length(v_email) not between 3 and 254 or position('@' in v_email) <= 1 then
    raise exception 'sv_invalid_unsubscribe' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('sv_unsub:' || v_email, 0));

  if exists (
    select 1 from public.sv_mail_suppressions s
    where s.email_norm = v_email
      and s.cause = 'unsubscribe'
      and not exists (select 1 from public.sv_mail_suppression_lifts l where l.suppression_id = s.id)
  ) then
    return jsonb_build_object('outcome', 'already', 'outbox_ids', '[]'::jsonb);
  end if;

  insert into public.sv_mail_suppressions (email_norm, scope, cause, source, resend_event_id)
  values (v_email, 'marketing', 'unsubscribe', p_source, null)
  returning id into v_sid;

  v_oid := sv_private.queue_suppression_alert(v_sid, v_email, 'unsubscribe', false, p_admin_email);
  if v_oid is not null then
    v_ids := v_ids || v_oid;
  end if;

  return jsonb_build_object('outcome', 'recorded', 'outbox_ids', to_jsonb(v_ids));
end;
$$;
revoke all on function public.sv_record_unsubscribe(text, text, text) from public, anon, authenticated;
grant execute on function public.sv_record_unsubscribe(text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- sv_lift_suppression (D-08): admin actor, reason 3-300, new row
-- ---------------------------------------------------------------------------

create or replace function public.sv_lift_suppression(
  p_suppression_id bigint,
  p_reason text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null or not exists (select 1 from public.sv_admins a where a.user_id = p_actor_id) then
    raise exception 'sv_not_admin' using errcode = 'P0001';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 300 then
    raise exception 'sv_invalid_reason' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.sv_mail_suppressions s where s.id = p_suppression_id) then
    return jsonb_build_object('outcome', 'not_found');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('sv_lift:' || p_suppression_id::text, 0));

  if exists (select 1 from public.sv_mail_suppression_lifts l where l.suppression_id = p_suppression_id) then
    return jsonb_build_object('outcome', 'already_lifted');
  end if;

  insert into public.sv_mail_suppression_lifts (suppression_id, reason, lifted_by)
  values (p_suppression_id, btrim(p_reason), p_actor_id);

  return jsonb_build_object('outcome', 'lifted');
end;
$$;
revoke all on function public.sv_lift_suppression(bigint, text, uuid) from public, anon, authenticated;
grant execute on function public.sv_lift_suppression(bigint, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- sv_set_reminder_hold (D-02)
-- ---------------------------------------------------------------------------

create or replace function public.sv_set_reminder_hold(
  p_project_id uuid,
  p_action text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current text;
  v_skipped integer := 0;
begin
  if p_actor_id is null or not exists (select 1 from public.sv_admins a where a.user_id = p_actor_id) then
    raise exception 'sv_not_admin' using errcode = 'P0001';
  end if;
  if p_action is null or p_action not in ('suspend', 'resume') then
    raise exception 'sv_invalid_hold' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.sv_projects p where p.id = p_project_id) then
    raise exception 'sv_project_not_found' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('sv_hold:' || p_project_id::text, 0));

  select h.action into v_current
  from public.sv_reminder_holds h
  where h.project_id = p_project_id
  order by h.id desc
  limit 1;
  v_current := case when v_current = 'suspend' then 'suspend' else 'resume' end;

  if v_current = p_action then
    return jsonb_build_object('outcome', 'unchanged', 'skipped', 0);
  end if;

  insert into public.sv_reminder_holds (project_id, action, actor_id)
  values (p_project_id, p_action, p_actor_id);

  if p_action = 'suspend' then
    update public.sv_mail_outbox
    set status = 'skipped', last_error = 'reminder_hold'
    where project_id = p_project_id
      and status in ('pending', 'failed')
      and event_type in ('document_reminder', 'document_reminder_admin', 'review_request');
    get diagnostics v_skipped = row_count;
    return jsonb_build_object('outcome', 'suspended', 'skipped', v_skipped);
  end if;

  return jsonb_build_object('outcome', 'resumed', 'skipped', 0);
end;
$$;
revoke all on function public.sv_set_reminder_hold(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.sv_set_reminder_hold(uuid, text, uuid) to service_role;
