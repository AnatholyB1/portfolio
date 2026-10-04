-- supabase/migrations/20261007000000_sv_invoices.sql
--
-- Sevalys - Phase 15 (Stripe payments and invoicing) - PAY-03, PAY-04, PAY-05.
-- NOT applied to production until 15-19; branch push in 15-08.
--
-- Decisions implemented:
--   D-01  test series: sv_clients.is_test drives TFA / TAV so a test client never consumes the
--         legal FA / AV series. The flag is locked once the client has an invoice.
--   D-11  gapless numbering FA-YYYY-NNNN / AV-YYYY-NNNN: a counter row is upserted in the same
--         transaction as the invoice insert (a rollback releases the number). No sequence
--         object is used because sequences are not gapless. Year and issue date come from
--         now() at time zone Europe/Paris, computed in SQL only.
--   D-12  invoices are issued by a security definer RPC only, after the contract-signed or
--         acceptance-signed fact is effective.
--   D-13  header, lines, deductions, PDFs and counters are append-only, even for service_role,
--         and service_role holds no INSERT grant: rows exist only through the RPCs below.
--   D-14  correction is a credit note (381) bound to its origin, cumulative credit capped at
--         the origin total, locked origin row.
--   D-15  structured seller / buyer / VAT regime / references / period / prepaid / net to pay,
--         all amounts in cents, enough to produce a Factur-X later (PAY-07 is out of scope).
--   D-17  issuing a deposit invoice enqueues the payment request, reminders at +3 and +7 days
--         per member and an admin alert at +14 days (send_after).
-- Every FK out of the invoice tables is on delete restrict (10-year retention) and none points
-- to auth.users, so deleting a test user is never blocked by the ledger.

-- ---------------------------------------------------------------------------
-- Test flag on clients (D-01)
-- ---------------------------------------------------------------------------

alter table public.sv_clients add column if not exists is_test boolean not null default false;

create or replace function sv_private.guard_client_test_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_test is distinct from old.is_test
     and exists (select 1 from public.sv_invoices i where i.client_id = old.id) then
    raise exception 'sv_client_test_flag_locked' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function sv_private.guard_client_test_flag() from public, anon, authenticated, service_role;

drop trigger if exists sv_clients_test_flag_guard on public.sv_clients;
create trigger sv_clients_test_flag_guard
  before update of is_test on public.sv_clients
  for each row execute function sv_private.guard_client_test_flag();

-- ---------------------------------------------------------------------------
-- Counters (D-11): no grant at all, written only by next_invoice_seq
-- ---------------------------------------------------------------------------

create table if not exists public.sv_invoice_counters (
  series text not null check (series in ('FA', 'AV', 'TFA', 'TAV')),
  year integer not null check (year between 2026 and 2100),
  last_seq integer not null check (last_seq >= 0),
  primary key (series, year)
);
alter table public.sv_invoice_counters enable row level security;
revoke all on public.sv_invoice_counters from anon, authenticated, service_role;

create or replace function sv_private.guard_invoice_counter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'sv_counter_violation' using errcode = 'P0001';
  elsif tg_op = 'INSERT' then
    if new.last_seq <> 1 then
      raise exception 'sv_counter_violation' using errcode = 'P0001';
    end if;
  else
    if new.series <> old.series or new.year <> old.year or new.last_seq <> old.last_seq + 1 then
      raise exception 'sv_counter_violation' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function sv_private.guard_invoice_counter() from public, anon, authenticated, service_role;

drop trigger if exists sv_invoice_counters_guard on public.sv_invoice_counters;
create trigger sv_invoice_counters_guard
  before insert or update or delete on public.sv_invoice_counters
  for each row execute function sv_private.guard_invoice_counter();

drop trigger if exists sv_invoice_counters_no_truncate on public.sv_invoice_counters;
create trigger sv_invoice_counters_no_truncate
  before truncate on public.sv_invoice_counters
  for each statement execute function sv_private.deny_mutation();

create or replace function sv_private.next_invoice_seq(p_series text, p_year integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seq integer;
begin
  insert into public.sv_invoice_counters (series, year, last_seq)
  values (p_series, p_year, 1)
  on conflict (series, year) do update set last_seq = public.sv_invoice_counters.last_seq + 1
  returning last_seq into v_seq;
  return v_seq;
end;
$$;
revoke all on function sv_private.next_invoice_seq(text, integer) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sv_invoices (append-only header, D-13, D-15)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_invoices (
  id uuid primary key,
  issue_key text not null unique check (char_length(issue_key) between 1 and 200),
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  client_id uuid not null references public.sv_clients (id) on delete restrict,
  kind text not null check (kind in ('deposit', 'period', 'final', 'credit_note')),
  series text not null check (series in ('FA', 'AV', 'TFA', 'TAV')),
  year integer not null check (year between 2026 and 2100),
  seq integer not null check (seq between 1 and 9999),
  number text not null unique,
  is_test boolean not null,
  en16931_type_code smallint not null check (en16931_type_code in (380, 381, 386)),
  issued_on date not null,
  issued_at timestamptz not null default now(),
  due_date date null,
  payment_terms_days integer null check (payment_terms_days between 0 and 365),
  service_period_start date null,
  service_period_end date null,
  currency text not null default 'EUR' check (currency = 'EUR'),
  seller_legal_name text not null,
  seller_trade_name text null,
  seller_siret text not null,
  seller_address_line text not null,
  seller_postal_code text not null,
  seller_city text not null,
  seller_country text not null default 'FR',
  seller_vat_number text null,
  seller_iban text null,
  seller_bic text null,
  seller_email text null,
  buyer_name text not null,
  buyer_siret text not null,
  buyer_siren text null,
  buyer_address_line text null,
  buyer_postal_code text null,
  buyer_city text null,
  buyer_country text not null default 'FR',
  buyer_vat_number text null,
  vat_regime text not null check (vat_regime in ('franchise', 'standard')),
  vat_category text not null default 'E',
  vat_exemption_code text null,
  vat_exemption_text text null,
  payment_terms_text text null,
  late_penalty_text text null,
  recovery_indemnity_text text null,
  total_excl_tax_cents bigint not null check (total_excl_tax_cents >= 0),
  vat_total_cents bigint not null default 0 check (vat_total_cents >= 0),
  total_incl_tax_cents bigint not null check (total_incl_tax_cents >= 0),
  prepaid_cents bigint not null default 0 check (prepaid_cents >= 0),
  net_to_pay_cents bigint not null check (net_to_pay_cents >= 0),
  deposit_percent numeric(5, 2) null check (deposit_percent between 0 and 100),
  quote_document_id uuid null references public.sv_project_documents (id) on delete restrict,
  order_reference text null,
  customer_order_number text null,
  contract_reference text null,
  template_version text not null check (template_version ~ '^v[0-9]+$'),
  credits_invoice_id uuid null references public.sv_invoices (id) on delete restrict,
  credit_scope text null check (credit_scope in ('total', 'partial')),
  reason text null,
  refund_requested boolean not null default false,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_by uuid null,
  unique (series, year, seq),
  check (number = series || '-' || year::text || '-' || lpad(seq::text, 4, '0')),
  check ((kind = 'credit_note') = (series in ('AV', 'TAV'))),
  check (is_test = (series in ('TFA', 'TAV'))),
  check (en16931_type_code = case kind when 'deposit' then 386 when 'credit_note' then 381 else 380 end),
  check (
    (kind = 'credit_note'
      and credits_invoice_id is not null
      and credit_scope is not null
      and reason is not null
      and char_length(trim(reason)) between 3 and 1000
      and prepaid_cents = 0)
    or
    (kind <> 'credit_note'
      and credits_invoice_id is null
      and credit_scope is null
      and reason is null
      and refund_requested = false)
  ),
  check (kind <> 'period' or (service_period_start is not null and service_period_end is not null and service_period_end >= service_period_start)),
  check (total_incl_tax_cents = total_excl_tax_cents + vat_total_cents),
  check (
    case when kind = 'credit_note'
      then net_to_pay_cents = 0
      else net_to_pay_cents = total_incl_tax_cents - prepaid_cents
    end
  )
);
alter table public.sv_invoices enable row level security;
revoke all on public.sv_invoices from anon, authenticated, service_role;
grant select (
  id, issue_key, project_id, client_id, kind, series, year, seq, number, is_test, en16931_type_code,
  issued_on, issued_at, due_date, payment_terms_days, service_period_start, service_period_end, currency,
  seller_legal_name, seller_trade_name, seller_siret, seller_address_line, seller_postal_code, seller_city,
  seller_country, seller_vat_number, seller_iban, seller_bic, seller_email,
  buyer_name, buyer_siret, buyer_siren, buyer_address_line, buyer_postal_code, buyer_city, buyer_country,
  buyer_vat_number, vat_regime, vat_category, vat_exemption_code, vat_exemption_text,
  payment_terms_text, late_penalty_text, recovery_indemnity_text,
  total_excl_tax_cents, vat_total_cents, total_incl_tax_cents, prepaid_cents, net_to_pay_cents,
  deposit_percent, quote_document_id, order_reference, customer_order_number, contract_reference,
  template_version, credits_invoice_id, credit_scope, reason, refund_requested
) on public.sv_invoices to authenticated;
grant select on public.sv_invoices to service_role;

create index if not exists sv_invoices_project_idx on public.sv_invoices (project_id);
create index if not exists sv_invoices_client_idx on public.sv_invoices (client_id);
create index if not exists sv_invoices_credits_idx on public.sv_invoices (credits_invoice_id);

drop policy if exists sv_invoices_read on public.sv_invoices;
create policy sv_invoices_read on public.sv_invoices
  for select to authenticated
  using ((select sv_private.is_admin()) or project_id in (select sv_private.project_ids()));

drop trigger if exists sv_invoices_no_upd_del on public.sv_invoices;
create trigger sv_invoices_no_upd_del
  before update or delete on public.sv_invoices
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_invoices_no_truncate on public.sv_invoices;
create trigger sv_invoices_no_truncate
  before truncate on public.sv_invoices
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_invoice_lines (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_invoice_lines (
  invoice_id uuid not null references public.sv_invoices (id) on delete restrict,
  position smallint not null check (position between 1 and 30),
  designation text not null check (char_length(designation) between 1 and 200),
  quantity_milli integer not null check (quantity_milli > 0),
  unit_code text not null check (unit_code in ('DAY', 'C62')),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  line_total_cents bigint not null check (line_total_cents >= 0),
  vat_category text not null default 'E',
  vat_rate_bp integer not null default 0,
  primary key (invoice_id, position),
  check (line_total_cents = div(quantity_milli::numeric * unit_price_cents + 500, 1000))
);
alter table public.sv_invoice_lines enable row level security;
revoke all on public.sv_invoice_lines from anon, authenticated, service_role;
grant select on public.sv_invoice_lines to authenticated;
grant select on public.sv_invoice_lines to service_role;

drop policy if exists sv_invoice_lines_read on public.sv_invoice_lines;
create policy sv_invoice_lines_read on public.sv_invoice_lines
  for select to authenticated
  using (
    exists (
      select 1 from public.sv_invoices i
      where i.id = invoice_id
        and ((select sv_private.is_admin()) or i.project_id in (select sv_private.project_ids()))
    )
  );

drop trigger if exists sv_invoice_lines_no_upd_del on public.sv_invoice_lines;
create trigger sv_invoice_lines_no_upd_del
  before update or delete on public.sv_invoice_lines
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_invoice_lines_no_truncate on public.sv_invoice_lines;
create trigger sv_invoice_lines_no_truncate
  before truncate on public.sv_invoice_lines
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_invoice_deductions (append-only: deposits and prepayments already invoiced)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_invoice_deductions (
  invoice_id uuid not null references public.sv_invoices (id) on delete restrict,
  position smallint not null check (position between 1 and 30),
  label text not null check (char_length(label) between 1 and 200),
  ref_invoice_id uuid not null references public.sv_invoices (id) on delete restrict,
  ref_number text not null,
  ref_date date not null,
  amount_cents bigint not null check (amount_cents > 0),
  primary key (invoice_id, position)
);
alter table public.sv_invoice_deductions enable row level security;
revoke all on public.sv_invoice_deductions from anon, authenticated, service_role;
grant select on public.sv_invoice_deductions to authenticated;
grant select on public.sv_invoice_deductions to service_role;

drop policy if exists sv_invoice_deductions_read on public.sv_invoice_deductions;
create policy sv_invoice_deductions_read on public.sv_invoice_deductions
  for select to authenticated
  using (
    exists (
      select 1 from public.sv_invoices i
      where i.id = invoice_id
        and ((select sv_private.is_admin()) or i.project_id in (select sv_private.project_ids()))
    )
  );

drop trigger if exists sv_invoice_deductions_no_upd_del on public.sv_invoice_deductions;
create trigger sv_invoice_deductions_no_upd_del
  before update or delete on public.sv_invoice_deductions
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_invoice_deductions_no_truncate on public.sv_invoice_deductions;
create trigger sv_invoice_deductions_no_truncate
  before truncate on public.sv_invoice_deductions
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_invoice_pdfs (append-only, storage_path hidden from clients)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_invoice_pdfs (
  invoice_id uuid primary key references public.sv_invoices (id) on delete restrict,
  storage_path text not null unique check (char_length(storage_path) <= 200),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  template_version text not null check (template_version ~ '^v[0-9]+$'),
  created_at timestamptz not null default now()
);
alter table public.sv_invoice_pdfs enable row level security;
revoke all on public.sv_invoice_pdfs from anon, authenticated, service_role;
grant select (invoice_id, sha256, size_bytes, template_version, created_at)
  on public.sv_invoice_pdfs to authenticated;
grant select on public.sv_invoice_pdfs to service_role;

drop policy if exists sv_invoice_pdfs_read on public.sv_invoice_pdfs;
create policy sv_invoice_pdfs_read on public.sv_invoice_pdfs
  for select to authenticated
  using (
    exists (
      select 1 from public.sv_invoices i
      where i.id = invoice_id
        and ((select sv_private.is_admin()) or i.project_id in (select sv_private.project_ids()))
    )
  );

drop trigger if exists sv_invoice_pdfs_no_upd_del on public.sv_invoice_pdfs;
create trigger sv_invoice_pdfs_no_upd_del
  before update or delete on public.sv_invoice_pdfs
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_invoice_pdfs_no_truncate on public.sv_invoice_pdfs;
create trigger sv_invoice_pdfs_no_truncate
  before truncate on public.sv_invoice_pdfs
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- Outbox closed lists: add the six payment events (constraint names never trusted)
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
      and pg_get_constraintdef(c.oid) ilike '%document_issued%'
  loop
    execute format('alter table public.sv_mail_outbox drop constraint %I', v_name);
  end loop;
  alter table public.sv_mail_outbox
    add constraint sv_mail_outbox_event_type_check check (event_type in ('client_invited', 'step_changed', 'onboarding_completed', 'document_issued', 'document_signed', 'document_signed_admin', 'acceptance_refused', 'payment_requested', 'payment_received', 'payment_reminder', 'payment_reminder_admin', 'payment_anomaly_admin', 'credit_note_issued'));
  alter table public.sv_mail_outbox
    add constraint sv_mail_outbox_template_check check (template in ('invite', 'step_changed', 'onboarding_completed', 'document_issued', 'document_signed', 'document_signed_admin', 'acceptance_refused', 'payment_requested', 'payment_received', 'payment_reminder', 'payment_reminder_admin', 'payment_anomaly_admin', 'credit_note_issued'));
end;
$$;

-- ===== fin partie 1 (15-03 Task 1) : tables, compteurs, RLS, listes outbox =====
