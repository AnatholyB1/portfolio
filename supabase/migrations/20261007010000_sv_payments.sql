-- supabase/migrations/20261007010000_sv_payments.sql
--
-- Sevalys - Phase 15 (Stripe payments and invoicing) - PAY-01, PAY-02, PAY-03.
-- Runs after 20261007000000_sv_invoices.sql; NOT applied to production until 15-19.
--
-- Decisions implemented:
--   D-01  a live payment on a test invoice (and the reverse) is an anomaly: the livemode of an
--         event must match a checkout session recorded for the invoice.
--   D-02  Stripe customers are stored per client and per mode.
--   D-03  every Stripe event id is recorded once; the apply RPC does everything in ONE
--         transaction and sets processed_at last, a replay returns the stored result.
--   D-04  amount, currency, livemode, unknown invoice, credited invoice, duplicate payment,
--         partial funding and unreconciled funds are ledger anomalies with an admin mail,
--         never a fact. Business mismatches never raise (they must commit).
--   D-10  a paid deposit invoice posts deposit_received, a paid final invoice balance_received,
--         a period invoice posts no fact (D-08). Actor system.
--   D-16  the payment ledger is append-only.
--   D-17  pending reminders are skipped on processing (bank transfer) and on paid.
--   D-18  Stripe ids are admin-only: no client grant on events, sessions and customers; the
--         ledger exposes only kind, amount, method and date to the owner of the invoice.
-- Every foreign key is on delete restrict and none points to auth.users.

-- ---------------------------------------------------------------------------
-- sv_stripe_customers (D-02)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_stripe_customers (
  client_id uuid not null references public.sv_clients (id) on delete restrict,
  livemode boolean not null,
  stripe_customer_id text not null unique check (stripe_customer_id ~ '^cus_'),
  created_at timestamptz not null default now(),
  primary key (client_id, livemode)
);
alter table public.sv_stripe_customers enable row level security;
revoke all on public.sv_stripe_customers from anon, authenticated, service_role;
-- insert is safe: a customer id carries no money state
grant select, insert on public.sv_stripe_customers to service_role;
grant select on public.sv_stripe_customers to authenticated;

drop policy if exists sv_stripe_customers_admin_read on public.sv_stripe_customers;
create policy sv_stripe_customers_admin_read on public.sv_stripe_customers
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_stripe_customers_no_upd_del on public.sv_stripe_customers;
create trigger sv_stripe_customers_no_upd_del
  before update or delete on public.sv_stripe_customers
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_stripe_customers_no_truncate on public.sv_stripe_customers;
create trigger sv_stripe_customers_no_truncate
  before truncate on public.sv_stripe_customers
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_checkout_sessions: rows exist only through sv_record_checkout_session
-- ---------------------------------------------------------------------------

create table if not exists public.sv_checkout_sessions (
  id text primary key check (id ~ '^cs_'),
  invoice_id uuid not null references public.sv_invoices (id) on delete restrict,
  livemode boolean not null,
  url text null,
  amount_cents bigint not null check (amount_cents > 0),
  expires_at timestamptz null,
  created_at timestamptz not null default now()
);
alter table public.sv_checkout_sessions enable row level security;
revoke all on public.sv_checkout_sessions from anon, authenticated, service_role;
grant select on public.sv_checkout_sessions to service_role;
grant select on public.sv_checkout_sessions to authenticated;
create index if not exists sv_checkout_sessions_invoice_idx on public.sv_checkout_sessions (invoice_id);

drop policy if exists sv_checkout_sessions_admin_read on public.sv_checkout_sessions;
create policy sv_checkout_sessions_admin_read on public.sv_checkout_sessions
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_checkout_sessions_no_upd_del on public.sv_checkout_sessions;
create trigger sv_checkout_sessions_no_upd_del
  before update or delete on public.sv_checkout_sessions
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_checkout_sessions_no_truncate on public.sv_checkout_sessions;
create trigger sv_checkout_sessions_no_truncate
  before truncate on public.sv_checkout_sessions
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_stripe_events (D-03): no API grant for clients, no payload, no e-mail, no card data
-- ---------------------------------------------------------------------------

create table if not exists public.sv_stripe_events (
  event_id text primary key check (event_id ~ '^evt_'),
  type text not null,
  livemode boolean not null,
  object_id text null,
  received_at timestamptz not null default now(),
  processed_at timestamptz null,
  outcome text null,
  project_id uuid null,
  fact_id bigint null
);
alter table public.sv_stripe_events enable row level security;
revoke all on public.sv_stripe_events from anon, authenticated, service_role;
grant select on public.sv_stripe_events to service_role;

create or replace function sv_private.guard_stripe_event_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.processed_at is null
     and new.processed_at is not null
     and new.event_id = old.event_id
     and new.type = old.type
     and new.livemode = old.livemode
     and new.object_id is not distinct from old.object_id
     and new.received_at = old.received_at then
    return new;
  end if;
  raise exception 'sv_stripe_event_immutable' using errcode = 'P0001';
end;
$$;
revoke all on function sv_private.guard_stripe_event_update() from public, anon, authenticated, service_role;

drop trigger if exists sv_stripe_events_guard_update on public.sv_stripe_events;
create trigger sv_stripe_events_guard_update
  before update on public.sv_stripe_events
  for each row execute function sv_private.guard_stripe_event_update();
-- a processed row is frozen for update and delete; an unprocessed row may only receive the
-- guarded processed_at transition above and can never be deleted
drop trigger if exists sv_stripe_events_no_upd_del on public.sv_stripe_events;
create trigger sv_stripe_events_no_upd_del
  before update or delete on public.sv_stripe_events
  for each row when (old.processed_at is not null) execute function sv_private.deny_mutation();
drop trigger if exists sv_stripe_events_no_delete on public.sv_stripe_events;
create trigger sv_stripe_events_no_delete
  before delete on public.sv_stripe_events
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_stripe_events_no_truncate on public.sv_stripe_events;
create trigger sv_stripe_events_no_truncate
  before truncate on public.sv_stripe_events
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_invoice_payment_events: append-only payment ledger (D-16)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_invoice_payment_events (
  id bigint generated always as identity primary key,
  invoice_id uuid null references public.sv_invoices (id) on delete restrict,
  client_id uuid null references public.sv_clients (id) on delete restrict,
  stripe_event_id text null unique,
  kind text not null check (kind in (
    'processing', 'paid', 'failed', 'expired', 'partially_funded',
    'refund_requested', 'refunded', 'refund_failed', 'anomaly'
  )),
  detail text null check (detail in (
    'amount_mismatch', 'currency_mismatch', 'livemode_mismatch', 'unknown_invoice',
    'credited_invoice', 'duplicate_payment', 'partially_funded', 'unreconciled_funds', 'refund_failed'
  )),
  amount_cents bigint null,
  expected_cents bigint null,
  currency text null,
  livemode boolean not null,
  method text null check (method in ('card', 'bank_transfer')),
  payment_intent_id text null,
  checkout_session_id text null,
  refund_id text null,
  occurred_at timestamptz not null default now(),
  check (invoice_id is not null or client_id is not null)
);
alter table public.sv_invoice_payment_events enable row level security;
revoke all on public.sv_invoice_payment_events from anon, authenticated, service_role;
grant select on public.sv_invoice_payment_events to service_role;
grant select (id, invoice_id, kind, amount_cents, method, occurred_at) on public.sv_invoice_payment_events to authenticated;
create index if not exists sv_invoice_payment_events_invoice_idx on public.sv_invoice_payment_events (invoice_id);
create index if not exists sv_invoice_payment_events_client_idx on public.sv_invoice_payment_events (client_id);
create index if not exists sv_invoice_payment_events_pi_idx on public.sv_invoice_payment_events (payment_intent_id);

drop policy if exists sv_invoice_payment_events_read on public.sv_invoice_payment_events;
create policy sv_invoice_payment_events_read on public.sv_invoice_payment_events
  for select to authenticated
  using (
    (select sv_private.is_admin())
    or exists (
      select 1 from public.sv_invoices i
      where i.id = invoice_id and i.project_id in (select sv_private.project_ids())
    )
  );

drop trigger if exists sv_invoice_payment_events_no_upd_del on public.sv_invoice_payment_events;
create trigger sv_invoice_payment_events_no_upd_del
  before update or delete on public.sv_invoice_payment_events
  for each row execute function sv_private.deny_mutation();
drop trigger if exists sv_invoice_payment_events_no_truncate on public.sv_invoice_payment_events;
create trigger sv_invoice_payment_events_no_truncate
  before truncate on public.sv_invoice_payment_events
  for each statement execute function sv_private.deny_mutation();

-- fin partie 1

-- ---------------------------------------------------------------------------
-- Private helpers (no API role may call them)
-- ---------------------------------------------------------------------------

create or replace function sv_private.invoice_credited_cents(p_invoice_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  return coalesce((
    select sum(c.total_incl_tax_cents)
    from public.sv_invoices c
    where c.credits_invoice_id = p_invoice_id
  ), 0)::bigint;
end;
$$;
revoke all on function sv_private.invoice_credited_cents(uuid) from public, anon, authenticated, service_role;

create or replace function sv_private.invoice_has_kind(p_invoice_id uuid, p_kind text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.sv_invoice_payment_events l
    where l.invoice_id = p_invoice_id and l.kind = p_kind
  );
end;
$$;
revoke all on function sv_private.invoice_has_kind(uuid, text) from public, anon, authenticated, service_role;

-- processing means: no paid row yet and the latest of processing / failed / expired / paid is processing
create or replace function sv_private.invoice_is_processing(p_invoice_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last text;
begin
  if sv_private.invoice_has_kind(p_invoice_id, 'paid') then
    return false;
  end if;
  select l.kind into v_last
  from public.sv_invoice_payment_events l
  where l.invoice_id = p_invoice_id and l.kind in ('processing', 'failed', 'expired', 'paid')
  order by l.id desc
  limit 1;
  return coalesce(v_last = 'processing', false);
end;
$$;
revoke all on function sv_private.invoice_is_processing(uuid) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sv_record_checkout_session (D-05, Pitfall 4)
-- ---------------------------------------------------------------------------

create or replace function public.sv_record_checkout_session(
  p_invoice_id uuid,
  p_session_id text,
  p_livemode boolean,
  p_url text,
  p_amount_cents bigint,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv public.sv_invoices%rowtype;
  v_due bigint;
begin
  select * into v_inv from public.sv_invoices i where i.id = p_invoice_id for update;
  if not found then
    raise exception 'sv_invoice_not_found' using errcode = 'P0001';
  end if;
  if p_session_id is null or p_session_id !~ '^cs_' then
    raise exception 'sv_checkout_session_invalid' using errcode = 'P0001';
  end if;
  if p_livemode is null or (p_livemode and v_inv.is_test) then
    raise exception 'sv_checkout_livemode_invalid' using errcode = 'P0001';
  end if;

  v_due := greatest(v_inv.net_to_pay_cents - sv_private.invoice_credited_cents(v_inv.id), 0);
  if v_inv.kind = 'credit_note'
     or sv_private.invoice_has_kind(v_inv.id, 'paid')
     or sv_private.invoice_is_processing(v_inv.id)
     or v_due <= 0 then
    raise exception 'sv_invoice_not_payable' using errcode = 'P0001';
  end if;
  if p_amount_cents is distinct from v_due then
    raise exception 'sv_checkout_amount_mismatch' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.sv_invoices o
    where o.client_id = v_inv.client_id
      and o.id <> v_inv.id
      and sv_private.invoice_is_processing(o.id)
  ) then
    raise exception 'sv_client_payment_in_progress' using errcode = 'P0001';
  end if;

  insert into public.sv_checkout_sessions (id, invoice_id, livemode, url, amount_cents, expires_at)
  values (p_session_id, v_inv.id, p_livemode, p_url, p_amount_cents, p_expires_at);

  return jsonb_build_object('recorded', true);
end;
$$;
revoke all on function public.sv_record_checkout_session(uuid, text, boolean, text, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.sv_record_checkout_session(uuid, text, boolean, text, bigint, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- sv_record_refund_request (credit note with refund requested, origin paid)
-- ---------------------------------------------------------------------------

create or replace function public.sv_record_refund_request(
  p_credit_note_id uuid,
  p_refund_id text,
  p_amount_cents bigint,
  p_payment_intent_id text,
  p_livemode boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cn public.sv_invoices%rowtype;
  v_ledger_id bigint;
begin
  select * into v_cn from public.sv_invoices i where i.id = p_credit_note_id for update;
  if not found or v_cn.kind <> 'credit_note' or v_cn.refund_requested is not true then
    raise exception 'sv_refund_not_requested' using errcode = 'P0001';
  end if;
  if p_refund_id is null or p_refund_id !~ '^re_' or p_livemode is null then
    raise exception 'sv_refund_invalid' using errcode = 'P0001';
  end if;
  if not sv_private.invoice_has_kind(v_cn.credits_invoice_id, 'paid') then
    raise exception 'sv_refund_origin_unpaid' using errcode = 'P0001';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 or p_amount_cents > v_cn.total_incl_tax_cents then
    raise exception 'sv_refund_amount_invalid' using errcode = 'P0001';
  end if;

  -- idempotent on the Stripe refund id
  select l.id into v_ledger_id
  from public.sv_invoice_payment_events l
  where l.kind = 'refund_requested' and l.refund_id = p_refund_id
  order by l.id
  limit 1;
  if v_ledger_id is not null then
    return jsonb_build_object('ledger_id', v_ledger_id);
  end if;

  insert into public.sv_invoice_payment_events (
    invoice_id, client_id, kind, amount_cents, livemode, payment_intent_id, refund_id
  ) values (
    v_cn.credits_invoice_id, v_cn.client_id, 'refund_requested', p_amount_cents, p_livemode,
    p_payment_intent_id, p_refund_id
  )
  returning id into v_ledger_id;

  return jsonb_build_object('ledger_id', v_ledger_id);
end;
$$;
revoke all on function public.sv_record_refund_request(uuid, text, bigint, text, boolean) from public, anon, authenticated;
grant execute on function public.sv_record_refund_request(uuid, text, bigint, text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- sv_apply_stripe_event (D-03, D-04, D-10, D-17): the single source of "paid"
-- ---------------------------------------------------------------------------

create or replace function public.sv_apply_stripe_event(
  p_event_id text,
  p_type text,
  p_livemode boolean,
  p_object_id text,
  p_kind text,
  p_invoice_id uuid,
  p_customer_id text,
  p_payment_intent_id text,
  p_checkout_session_id text,
  p_amount_cents bigint,
  p_expected_cents bigint,
  p_currency text,
  p_method text,
  p_refund_id text,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ev public.sv_stripe_events%rowtype;
  v_inv public.sv_invoices%rowtype;
  v_has_inv boolean := false;
  v_client_id uuid;
  v_kind text;
  v_detail text;
  v_credited bigint := 0;
  v_due bigint;
  v_expected bigint;
  v_project_id uuid;
  v_title text;
  v_fact jsonb;
  v_fact_id bigint;
  v_fact_changed boolean := false;
  v_outcome text;
  v_email text;
  v_outbox_id uuid;
  v_ids uuid[] := '{}';
  v_admin text := lower(nullif(btrim(coalesce(p_admin_email, '')), ''));
begin
  -- malformed arguments raise (Stripe retries); business mismatches never do
  if p_event_id is null or p_event_id !~ '^evt_'
     or p_type is null or btrim(p_type) = ''
     or p_livemode is null then
    raise exception 'sv_event_invalid' using errcode = 'P0001';
  end if;
  if p_kind is null or p_kind not in (
    'processing', 'paid', 'failed', 'expired', 'partially_funded',
    'refund_requested', 'refunded', 'refund_failed', 'anomaly'
  ) then
    raise exception 'sv_ledger_kind_invalid' using errcode = 'P0001';
  end if;
  if p_method is not null and p_method not in ('card', 'bank_transfer') then
    raise exception 'sv_method_invalid' using errcode = 'P0001';
  end if;

  -- a. record the event once, lock it, replay returns the stored result
  insert into public.sv_stripe_events (event_id, type, livemode, object_id)
  values (p_event_id, p_type, p_livemode, p_object_id)
  on conflict (event_id) do nothing;

  select * into v_ev from public.sv_stripe_events e where e.event_id = p_event_id for update;
  if v_ev.processed_at is not null then
    return jsonb_build_object(
      'replay', true, 'outcome', v_ev.outcome, 'project_id', v_ev.project_id,
      'fact_id', v_ev.fact_id, 'fact_changed', false, 'outbox_ids', '[]'::jsonb
    );
  end if;

  -- b. resolve the invoice (explicit id, checkout session, earlier payment intent), then the client
  if p_invoice_id is not null then
    select * into v_inv from public.sv_invoices i where i.id = p_invoice_id for update;
    v_has_inv := found;
  end if;
  if not v_has_inv and p_checkout_session_id is not null then
    select i.* into v_inv
    from public.sv_invoices i
    join public.sv_checkout_sessions s on s.invoice_id = i.id
    where s.id = p_checkout_session_id
    for update of i;
    v_has_inv := found;
  end if;
  if not v_has_inv and p_payment_intent_id is not null then
    select i.* into v_inv
    from public.sv_invoices i
    where i.id = (
      select l.invoice_id from public.sv_invoice_payment_events l
      where l.payment_intent_id = p_payment_intent_id and l.invoice_id is not null
      order by l.id
      limit 1
    )
    for update;
    v_has_inv := found;
  end if;

  if v_has_inv then
    v_client_id := v_inv.client_id;
    v_project_id := v_inv.project_id;
  elsif p_customer_id is not null then
    select c.client_id into v_client_id
    from public.sv_stripe_customers c
    where c.stripe_customer_id = p_customer_id;
  end if;

  -- e2. unresolved: no ledger row (the CHECK invoice_id or client_id would raise and Stripe
  -- would retry forever); mark the event processed and succeed
  if not v_has_inv and v_client_id is null then
    update public.sv_stripe_events
    set processed_at = now(), outcome = 'ignored_unresolved'
    where event_id = p_event_id;
    return jsonb_build_object(
      'replay', false, 'outcome', 'ignored_unresolved', 'project_id', null,
      'fact_id', null, 'fact_changed', false, 'outbox_ids', '[]'::jsonb
    );
  end if;

  -- c, d, e. final kind and detail
  v_kind := p_kind;
  if p_kind = 'partially_funded' then
    v_detail := 'partially_funded';
  elsif p_kind = 'refund_failed' then
    v_detail := 'refund_failed';
  elsif p_kind = 'anomaly' then
    v_detail := 'unreconciled_funds';
  end if;

  if not v_has_inv then
    if p_kind <> 'anomaly' then
      v_kind := 'anomaly';
      v_detail := 'unknown_invoice';
    end if;
    v_expected := p_expected_cents;
  else
    v_credited := sv_private.invoice_credited_cents(v_inv.id);
    v_due := greatest(v_inv.net_to_pay_cents - v_credited, 0);
    v_expected := v_due;
    if not exists (
      select 1 from public.sv_checkout_sessions s
      where s.invoice_id = v_inv.id and s.livemode = p_livemode
    ) then
      v_kind := 'anomaly';
      v_detail := 'livemode_mismatch';
    elsif v_kind = 'paid' then
      if v_inv.kind = 'credit_note' then
        v_kind := 'anomaly';
        v_detail := 'unknown_invoice';
      elsif sv_private.invoice_has_kind(v_inv.id, 'paid') then
        v_kind := 'anomaly';
        v_detail := 'duplicate_payment';
      elsif v_credited > 0 and v_due = 0 then
        v_kind := 'anomaly';
        v_detail := 'credited_invoice';
      elsif lower(coalesce(p_currency, '')) <> 'eur' then
        v_kind := 'anomaly';
        v_detail := 'currency_mismatch';
      elsif p_amount_cents is distinct from v_due then
        v_kind := 'anomaly';
        v_detail := 'amount_mismatch';
      end if;
    end if;
  end if;

  -- f. ledger row
  insert into public.sv_invoice_payment_events (
    invoice_id, client_id, stripe_event_id, kind, detail, amount_cents, expected_cents, currency,
    livemode, method, payment_intent_id, checkout_session_id, refund_id
  ) values (
    case when v_has_inv then v_inv.id end, v_client_id, p_event_id, v_kind, v_detail, p_amount_cents,
    v_expected, lower(p_currency), p_livemode, p_method, p_payment_intent_id, p_checkout_session_id, p_refund_id
  );

  if v_project_id is not null then
    select p.title into v_title from public.sv_projects p where p.id = v_project_id;
  end if;

  -- g. paid: fact, receipt, reminder cancellation
  if v_kind = 'paid' then
    if v_inv.kind = 'deposit' then
      v_fact := public.sv_post_project_fact(
        v_project_id, 'deposit_received', 'system', null, null, 'Paiement Stripe ' || v_inv.number
      );
    elsif v_inv.kind = 'final' then
      v_fact := public.sv_post_project_fact(
        v_project_id, 'balance_received', 'system', null, null, 'Paiement Stripe ' || v_inv.number
      );
    end if;
    if v_fact is not null then
      v_fact_id := (v_fact ->> 'fact_id')::bigint;
      v_fact_changed := coalesce((v_fact ->> 'changed')::boolean, false);
    end if;

    for v_email in
      select distinct lower(m.invited_email)
      from public.sv_client_members m
      where m.client_id = v_inv.client_id
    loop
      v_outbox_id := null;
      insert into public.sv_mail_outbox (
        event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id
      ) values (
        'payment_received', 'payment_received', v_email, 'client',
        'payment_received:' || v_inv.id::text || ':' || v_email,
        jsonb_build_object(
          'invoiceNumber', v_inv.number, 'amountCents', p_amount_cents,
          'projectTitle', v_title, 'kind', v_inv.kind
        ),
        v_inv.client_id, v_project_id
      )
      on conflict (dedupe_key) do nothing
      returning id into v_outbox_id;
      if v_outbox_id is not null then
        v_ids := v_ids || v_outbox_id;
      end if;
    end loop;
  end if;

  -- g and h. paid or processing: pending reminders are skipped (Pitfall 9)
  if v_has_inv and v_kind in ('paid', 'processing') then
    update public.sv_mail_outbox
    set status = 'skipped'
    where status = 'pending'
      and (
        dedupe_key like 'payment_reminder:' || v_inv.id::text || ':%'
        or dedupe_key = 'payment_reminder_admin:' || v_inv.id::text || ':d14'
      );
  end if;

  -- i. anomalies go to the admin
  if v_kind in ('anomaly', 'partially_funded', 'refund_failed') and v_admin is not null then
    v_outbox_id := null;
    insert into public.sv_mail_outbox (
      event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id
    ) values (
      'payment_anomaly_admin', 'payment_anomaly_admin', v_admin, 'admin',
      'payment_anomaly_admin:' || p_event_id,
      jsonb_build_object(
        'invoiceNumber', case when v_has_inv then v_inv.number end,
        'amountCents', p_amount_cents,
        'expectedCents', v_expected,
        'projectTitle', v_title,
        'projectId', v_project_id,
        'detail', v_detail
      ),
      v_client_id, v_project_id
    )
    on conflict (dedupe_key) do nothing
    returning id into v_outbox_id;
    if v_outbox_id is not null then
      v_ids := v_ids || v_outbox_id;
    end if;
  end if;

  -- j. processed_at is set last
  v_outcome := v_kind || case when v_kind = 'anomaly' and v_detail is not null then '/' || v_detail else '' end;
  update public.sv_stripe_events
  set processed_at = now(), outcome = v_outcome, project_id = v_project_id, fact_id = v_fact_id
  where event_id = p_event_id;

  return jsonb_build_object(
    'replay', false, 'outcome', v_outcome, 'project_id', v_project_id,
    'fact_id', v_fact_id, 'fact_changed', v_fact_changed, 'outbox_ids', to_jsonb(v_ids)
  );
end;
$$;
revoke all on function public.sv_apply_stripe_event(text, text, boolean, text, text, uuid, text, text, text, bigint, bigint, text, text, text, text) from public, anon, authenticated;
grant execute on function public.sv_apply_stripe_event(text, text, boolean, text, text, uuid, text, text, text, bigint, bigint, text, text, text, text) to service_role;
