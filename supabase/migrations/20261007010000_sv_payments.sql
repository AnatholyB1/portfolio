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
