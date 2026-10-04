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

-- ---------------------------------------------------------------------------
-- Effective fact helper
-- ---------------------------------------------------------------------------

create or replace function sv_private.has_effective_fact(p_project_id uuid, p_type text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sv_project_facts f
    where f.project_id = p_project_id
      and f.type = p_type
      and not exists (
        select 1 from public.sv_project_facts r
        where r.type = 'fact_revoked' and r.target_fact_id = f.id
      )
  );
$$;
revoke all on function sv_private.has_effective_fact(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Issuing an invoice (deposit / period / final)
-- ---------------------------------------------------------------------------

create or replace function sv_private.issue_invoice_at(
  p_id uuid,
  p_issue_key text,
  p_project_id uuid,
  p_kind text,
  p_header jsonb,
  p_lines jsonb,
  p_deductions jsonb,
  p_admin_email text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_client_id uuid;
  v_client_name text;
  v_is_test boolean;
  v_existing public.sv_invoices%rowtype;
  v_series text;
  v_year integer;
  v_issued_on date;
  v_seq integer;
  v_number text;
  v_due date;
  v_total_excl bigint;
  v_prepaid bigint;
  v_vat bigint;
  v_incl bigint;
  v_net bigint;
  v_type_code smallint;
  v_line jsonb;
  v_pos bigint;
  v_qty integer;
  v_price bigint;
  v_line_total bigint;
  v_lines_sum bigint := 0;
  v_ded jsonb;
  v_ded_sum bigint := 0;
  v_ref public.sv_invoices%rowtype;
  v_email text;
  v_outbox_id uuid;
  v_ids uuid[] := '{}';
  v_period_start text;
  v_period_end text;
begin
  select p.title, p.client_id into v_title, v_client_id
  from public.sv_projects p
  where p.id = p_project_id
  for update;
  if not found then
    raise exception 'sv_project_not_found' using errcode = 'P0001';
  end if;

  select * into v_existing from public.sv_invoices i where i.issue_key = p_issue_key;
  if found then
    return jsonb_build_object(
      'invoice_id', v_existing.id, 'number', v_existing.number, 'issued_on', v_existing.issued_on,
      'due_date', v_existing.due_date, 'already', true, 'outbox_ids', '[]'::jsonb
    );
  end if;

  if exists (select 1 from public.sv_invoices i where i.id = p_id) then
    raise exception 'sv_invoice_id_conflict' using errcode = 'P0001';
  end if;

  if p_kind is null or p_kind not in ('deposit', 'period', 'final') then
    raise exception 'sv_invoice_kind_invalid' using errcode = 'P0001';
  end if;

  v_total_excl := (p_header ->> 'total_excl_tax_cents')::bigint;
  v_prepaid := coalesce((p_header ->> 'prepaid_cents')::bigint, 0);
  v_vat := case when p_header ->> 'vat_regime' = 'franchise'
    then 0 else coalesce((p_header ->> 'vat_total_cents')::bigint, 0) end;
  v_incl := v_total_excl + v_vat;
  v_net := v_incl - v_prepaid;

  -- Nothing to pay: an unpayable invoice could never post deposit_received / balance_received.
  -- The admin posts the fact manually instead. Checked before the counter is touched.
  if v_net <= 0 then
    raise exception 'sv_invoice_nothing_to_pay' using errcode = 'P0001';
  end if;

  if p_kind in ('deposit', 'period') and not sv_private.has_effective_fact(p_project_id, 'contract_signed') then
    raise exception 'sv_invoice_contract_not_signed' using errcode = 'P0001';
  end if;
  if p_kind = 'final' and not sv_private.has_effective_fact(p_project_id, 'acceptance_signed') then
    raise exception 'sv_invoice_acceptance_not_signed' using errcode = 'P0001';
  end if;

  if p_kind in ('deposit', 'final') and exists (
    select 1 from public.sv_invoices i
    where i.project_id = p_project_id
      and i.kind = p_kind
      and coalesce((select sum(c.total_incl_tax_cents) from public.sv_invoices c where c.credits_invoice_id = i.id), 0)
          < i.total_incl_tax_cents
  ) then
    raise exception 'sv_invoice_kind_exists' using errcode = 'P0001';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0 or jsonb_array_length(p_lines) > 30 then
    raise exception 'sv_invoice_lines_invalid' using errcode = 'P0001';
  end if;

  select c.is_test, c.name into v_is_test, v_client_name
  from public.sv_clients c where c.id = v_client_id;

  v_series := case when v_is_test then 'TFA' else 'FA' end;
  v_year := extract(year from (p_now at time zone 'Europe/Paris'))::int;
  v_issued_on := (p_now at time zone 'Europe/Paris')::date;
  v_seq := sv_private.next_invoice_seq(v_series, v_year);
  v_number := v_series || '-' || v_year::text || '-' || lpad(v_seq::text, 4, '0');
  v_due := coalesce((p_header ->> 'due_date')::date, v_issued_on + (p_header ->> 'payment_terms_days')::int);
  if v_due is null then
    raise exception 'sv_invoice_due_missing' using errcode = 'P0001';
  end if;
  v_type_code := case p_kind when 'deposit' then 386 else 380 end;

  insert into public.sv_invoices (
    id, issue_key, project_id, client_id, kind, series, year, seq, number, is_test, en16931_type_code,
    issued_on, issued_at, due_date, payment_terms_days, service_period_start, service_period_end,
    seller_legal_name, seller_trade_name, seller_siret, seller_address_line, seller_postal_code, seller_city,
    seller_vat_number, seller_iban, seller_bic, seller_email,
    buyer_name, buyer_siret, buyer_siren, buyer_address_line, buyer_postal_code, buyer_city, buyer_vat_number,
    vat_regime, vat_exemption_code, vat_exemption_text, payment_terms_text, late_penalty_text, recovery_indemnity_text,
    total_excl_tax_cents, vat_total_cents, total_incl_tax_cents, prepaid_cents, net_to_pay_cents, deposit_percent,
    quote_document_id, order_reference, customer_order_number, contract_reference, template_version,
    snapshot, created_by
  ) values (
    p_id, p_issue_key, p_project_id, v_client_id, p_kind, v_series, v_year, v_seq, v_number, v_is_test, v_type_code,
    v_issued_on, p_now, v_due, (p_header ->> 'payment_terms_days')::int,
    (p_header ->> 'service_period_start')::date, (p_header ->> 'service_period_end')::date,
    p_header ->> 'seller_legal_name', p_header ->> 'seller_trade_name', p_header ->> 'seller_siret',
    p_header ->> 'seller_address_line', p_header ->> 'seller_postal_code', p_header ->> 'seller_city',
    p_header ->> 'seller_vat_number', p_header ->> 'seller_iban', p_header ->> 'seller_bic', p_header ->> 'seller_email',
    p_header ->> 'buyer_name', p_header ->> 'buyer_siret', p_header ->> 'buyer_siren',
    p_header ->> 'buyer_address_line', p_header ->> 'buyer_postal_code', p_header ->> 'buyer_city',
    p_header ->> 'buyer_vat_number',
    p_header ->> 'vat_regime', p_header ->> 'vat_exemption_code', p_header ->> 'vat_exemption_text',
    p_header ->> 'payment_terms_text', p_header ->> 'late_penalty_text', p_header ->> 'recovery_indemnity_text',
    v_total_excl, v_vat, v_incl, v_prepaid, v_net, (p_header ->> 'deposit_percent')::numeric,
    (p_header ->> 'quote_document_id')::uuid, p_header ->> 'order_reference', p_header ->> 'customer_order_number',
    p_header ->> 'contract_reference', p_header ->> 'template_version',
    coalesce(p_header -> 'snapshot', '{}'::jsonb)
      || jsonb_build_object('number', v_number, 'issuedOn', v_issued_on, 'dueDate', v_due, 'isTest', v_is_test),
    (p_header ->> 'created_by')::uuid
  );

  for v_line, v_pos in
    select e.value, e.ordinality from jsonb_array_elements(p_lines) with ordinality as e(value, ordinality)
  loop
    v_qty := (v_line ->> 'quantity_milli')::int;
    v_price := (v_line ->> 'unit_price_cents')::bigint;
    v_line_total := (v_line ->> 'line_total_cents')::bigint;
    if v_line_total is distinct from div(v_qty::numeric * v_price + 500, 1000) then
      raise exception 'sv_invoice_line_mismatch' using errcode = 'P0001';
    end if;
    insert into public.sv_invoice_lines (
      invoice_id, position, designation, quantity_milli, unit_code, unit_price_cents, line_total_cents
    ) values (
      p_id, v_pos::smallint, v_line ->> 'designation', v_qty, v_line ->> 'unit_code', v_price, v_line_total
    );
    v_lines_sum := v_lines_sum + v_line_total;
  end loop;

  if p_deductions is not null and jsonb_typeof(p_deductions) = 'array' then
    for v_ded, v_pos in
      select e.value, e.ordinality from jsonb_array_elements(p_deductions) with ordinality as e(value, ordinality)
    loop
      select * into v_ref from public.sv_invoices r
      where r.id = (v_ded ->> 'ref_invoice_id')::uuid and r.project_id = p_project_id;
      if not found then
        raise exception 'sv_invoice_deduction_invalid' using errcode = 'P0001';
      end if;
      insert into public.sv_invoice_deductions (
        invoice_id, position, label, ref_invoice_id, ref_number, ref_date, amount_cents
      ) values (
        p_id, v_pos::smallint, v_ded ->> 'label', v_ref.id, v_ded ->> 'ref_number',
        (v_ded ->> 'ref_date')::date, (v_ded ->> 'amount_cents')::bigint
      );
      v_ded_sum := v_ded_sum + (v_ded ->> 'amount_cents')::bigint;
    end loop;
  end if;

  if v_lines_sum <> v_total_excl or v_ded_sum <> v_prepaid then
    raise exception 'sv_invoice_total_mismatch' using errcode = 'P0001';
  end if;

  v_period_start := p_header ->> 'service_period_start';
  v_period_end := p_header ->> 'service_period_end';

  for v_email in
    select distinct lower(m.invited_email)
    from public.sv_client_members m
    where m.client_id = v_client_id
  loop
    v_outbox_id := null;
    insert into public.sv_mail_outbox (
      event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id
    ) values (
      'payment_requested', 'payment_requested', v_email, 'client',
      'payment_requested:' || p_id::text || ':' || v_email,
      jsonb_build_object(
        'invoiceNumber', v_number, 'kind', p_kind, 'amountCents', v_net, 'projectTitle', v_title,
        'periodStart', v_period_start, 'periodEnd', v_period_end
      ),
      v_client_id, p_project_id
    )
    on conflict (dedupe_key) do nothing
    returning id into v_outbox_id;
    if v_outbox_id is not null then
      v_ids := v_ids || v_outbox_id;
    end if;

    if p_kind = 'deposit' then
      -- reminders stay pending: the cron sends them once send_after is due
      insert into public.sv_mail_outbox (
        event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id, send_after
      ) values (
        'payment_reminder', 'payment_reminder', v_email, 'client',
        'payment_reminder:' || p_id::text || ':d3:' || v_email,
        jsonb_build_object('invoiceNumber', v_number, 'amountCents', v_net, 'projectTitle', v_title, 'stage', 'd3'),
        v_client_id, p_project_id, p_now + interval '3 days'
      )
      on conflict (dedupe_key) do nothing;
      insert into public.sv_mail_outbox (
        event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id, send_after
      ) values (
        'payment_reminder', 'payment_reminder', v_email, 'client',
        'payment_reminder:' || p_id::text || ':d7:' || v_email,
        jsonb_build_object('invoiceNumber', v_number, 'amountCents', v_net, 'projectTitle', v_title, 'stage', 'd7'),
        v_client_id, p_project_id, p_now + interval '7 days'
      )
      on conflict (dedupe_key) do nothing;
    end if;
  end loop;

  if p_kind = 'deposit' and p_admin_email is not null and char_length(trim(p_admin_email)) > 0 then
    insert into public.sv_mail_outbox (
      event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id, send_after
    ) values (
      'payment_reminder_admin', 'payment_reminder_admin', lower(trim(p_admin_email)), 'admin',
      'payment_reminder_admin:' || p_id::text || ':d14',
      jsonb_build_object(
        'invoiceNumber', v_number, 'amountCents', v_net, 'projectTitle', v_title,
        'clientName', v_client_name, 'issuedOn', v_issued_on, 'projectId', p_project_id
      ),
      v_client_id, p_project_id, p_now + interval '14 days'
    )
    on conflict (dedupe_key) do nothing;
  end if;

  return jsonb_build_object(
    'invoice_id', p_id, 'number', v_number, 'issued_on', v_issued_on, 'due_date', v_due,
    'already', false, 'outbox_ids', to_jsonb(v_ids)
  );
end;
$$;
revoke all on function sv_private.issue_invoice_at(uuid, text, uuid, text, jsonb, jsonb, jsonb, text, timestamptz) from public, anon, authenticated, service_role;

create or replace function public.sv_issue_invoice(
  p_id uuid,
  p_issue_key text,
  p_project_id uuid,
  p_kind text,
  p_header jsonb,
  p_lines jsonb,
  p_deductions jsonb,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return sv_private.issue_invoice_at(
    p_id, p_issue_key, p_project_id, p_kind, p_header, p_lines, p_deductions, p_admin_email, now()
  );
end;
$$;
revoke all on function public.sv_issue_invoice(uuid, text, uuid, text, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.sv_issue_invoice(uuid, text, uuid, text, jsonb, jsonb, jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- Credit notes (D-14)
-- ---------------------------------------------------------------------------

create or replace function sv_private.issue_credit_note_at(
  p_id uuid,
  p_issue_key text,
  p_origin_invoice_id uuid,
  p_scope text,
  p_amount_cents bigint,
  p_reason text,
  p_refund_requested boolean,
  p_lines jsonb,
  p_snapshot jsonb,
  p_created_by uuid,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.sv_invoices%rowtype;
  v_origin public.sv_invoices%rowtype;
  v_project_id uuid;
  v_title text;
  v_credited bigint;
  v_series text;
  v_year integer;
  v_issued_on date;
  v_seq integer;
  v_number text;
  v_line jsonb;
  v_pos bigint;
  v_qty integer;
  v_price bigint;
  v_line_total bigint;
  v_lines_sum bigint := 0;
  v_fully boolean;
  v_email text;
  v_outbox_id uuid;
  v_ids uuid[] := '{}';
  v_reason text := trim(coalesce(p_reason, ''));
begin
  select * into v_existing from public.sv_invoices i where i.issue_key = p_issue_key;
  if found then
    select coalesce(sum(c.total_incl_tax_cents), 0) into v_credited
    from public.sv_invoices c where c.credits_invoice_id = v_existing.credits_invoice_id;
    return jsonb_build_object(
      'credit_note_id', v_existing.id, 'number', v_existing.number, 'issued_on', v_existing.issued_on,
      'already', true, 'outbox_ids', '[]'::jsonb,
      'fully_credited', v_credited >= (select o.total_incl_tax_cents from public.sv_invoices o where o.id = v_existing.credits_invoice_id)
    );
  end if;

  if exists (select 1 from public.sv_invoices i where i.id = p_id) then
    raise exception 'sv_invoice_id_conflict' using errcode = 'P0001';
  end if;

  -- same lock order as issuing: project first, then the origin row
  select o.project_id into v_project_id from public.sv_invoices o where o.id = p_origin_invoice_id;
  if not found then
    raise exception 'sv_invoice_not_found' using errcode = 'P0001';
  end if;
  select p.title into v_title from public.sv_projects p where p.id = v_project_id for update;
  select * into v_origin from public.sv_invoices o where o.id = p_origin_invoice_id for update;

  if v_origin.kind = 'credit_note' then
    raise exception 'sv_cannot_credit_credit_note' using errcode = 'P0001';
  end if;
  if char_length(v_reason) not between 3 and 1000 then
    raise exception 'sv_credit_reason_invalid' using errcode = 'P0001';
  end if;
  if p_scope is null or p_scope not in ('total', 'partial') then
    raise exception 'sv_credit_scope_invalid' using errcode = 'P0001';
  end if;

  select coalesce(sum(c.total_incl_tax_cents), 0) into v_credited
  from public.sv_invoices c where c.credits_invoice_id = v_origin.id;

  if p_amount_cents is null or p_amount_cents <= 0
     or v_credited + p_amount_cents > v_origin.total_incl_tax_cents then
    raise exception 'sv_credit_exceeds_invoice' using errcode = 'P0001';
  end if;
  if p_scope = 'total' and p_amount_cents <> v_origin.total_incl_tax_cents - v_credited then
    raise exception 'sv_credit_exceeds_invoice' using errcode = 'P0001';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0 or jsonb_array_length(p_lines) > 30 then
    raise exception 'sv_invoice_lines_invalid' using errcode = 'P0001';
  end if;

  v_series := case when v_origin.is_test then 'TAV' else 'AV' end;
  v_year := extract(year from (p_now at time zone 'Europe/Paris'))::int;
  v_issued_on := (p_now at time zone 'Europe/Paris')::date;
  v_seq := sv_private.next_invoice_seq(v_series, v_year);
  v_number := v_series || '-' || v_year::text || '-' || lpad(v_seq::text, 4, '0');

  insert into public.sv_invoices (
    id, issue_key, project_id, client_id, kind, series, year, seq, number, is_test, en16931_type_code,
    issued_on, issued_at, due_date, payment_terms_days, service_period_start, service_period_end,
    seller_legal_name, seller_trade_name, seller_siret, seller_address_line, seller_postal_code, seller_city,
    seller_country, seller_vat_number, seller_iban, seller_bic, seller_email,
    buyer_name, buyer_siret, buyer_siren, buyer_address_line, buyer_postal_code, buyer_city, buyer_country,
    buyer_vat_number, vat_regime, vat_category, vat_exemption_code, vat_exemption_text,
    payment_terms_text, late_penalty_text, recovery_indemnity_text,
    total_excl_tax_cents, vat_total_cents, total_incl_tax_cents, prepaid_cents, net_to_pay_cents, deposit_percent,
    quote_document_id, order_reference, customer_order_number, contract_reference, template_version,
    credits_invoice_id, credit_scope, reason, refund_requested, snapshot, created_by
  ) values (
    p_id, p_issue_key, v_origin.project_id, v_origin.client_id, 'credit_note', v_series, v_year, v_seq, v_number,
    v_origin.is_test, 381,
    v_issued_on, p_now, null, null, null, null,
    v_origin.seller_legal_name, v_origin.seller_trade_name, v_origin.seller_siret, v_origin.seller_address_line,
    v_origin.seller_postal_code, v_origin.seller_city,
    v_origin.seller_country, v_origin.seller_vat_number, v_origin.seller_iban, v_origin.seller_bic, v_origin.seller_email,
    v_origin.buyer_name, v_origin.buyer_siret, v_origin.buyer_siren, v_origin.buyer_address_line,
    v_origin.buyer_postal_code, v_origin.buyer_city, v_origin.buyer_country,
    v_origin.buyer_vat_number, v_origin.vat_regime, v_origin.vat_category, v_origin.vat_exemption_code,
    v_origin.vat_exemption_text,
    v_origin.payment_terms_text, v_origin.late_penalty_text, v_origin.recovery_indemnity_text,
    p_amount_cents, 0, p_amount_cents, 0, 0, null,
    v_origin.quote_document_id, v_origin.order_reference, v_origin.customer_order_number,
    v_origin.contract_reference, v_origin.template_version,
    v_origin.id, p_scope, v_reason, coalesce(p_refund_requested, false),
    coalesce(p_snapshot, '{}'::jsonb)
      || jsonb_build_object('number', v_number, 'issuedOn', v_issued_on, 'isTest', v_origin.is_test),
    p_created_by
  );

  for v_line, v_pos in
    select e.value, e.ordinality from jsonb_array_elements(p_lines) with ordinality as e(value, ordinality)
  loop
    v_qty := (v_line ->> 'quantity_milli')::int;
    v_price := (v_line ->> 'unit_price_cents')::bigint;
    v_line_total := (v_line ->> 'line_total_cents')::bigint;
    if v_line_total is distinct from div(v_qty::numeric * v_price + 500, 1000) then
      raise exception 'sv_invoice_line_mismatch' using errcode = 'P0001';
    end if;
    insert into public.sv_invoice_lines (
      invoice_id, position, designation, quantity_milli, unit_code, unit_price_cents, line_total_cents
    ) values (
      p_id, v_pos::smallint, v_line ->> 'designation', v_qty, v_line ->> 'unit_code', v_price, v_line_total
    );
    v_lines_sum := v_lines_sum + v_line_total;
  end loop;

  if v_lines_sum <> p_amount_cents then
    raise exception 'sv_invoice_total_mismatch' using errcode = 'P0001';
  end if;

  v_fully := v_credited + p_amount_cents = v_origin.total_incl_tax_cents;
  if v_fully then
    update public.sv_mail_outbox
    set status = 'skipped'
    where status = 'pending'
      and (
        dedupe_key like 'payment_reminder:' || v_origin.id::text || ':%'
        or dedupe_key = 'payment_reminder_admin:' || v_origin.id::text || ':d14'
      );
  end if;

  for v_email in
    select distinct lower(m.invited_email)
    from public.sv_client_members m
    where m.client_id = v_origin.client_id
  loop
    v_outbox_id := null;
    insert into public.sv_mail_outbox (
      event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id
    ) values (
      'credit_note_issued', 'credit_note_issued', v_email, 'client',
      'credit_note_issued:' || p_id::text || ':' || v_email,
      jsonb_build_object(
        'creditNoteNumber', v_number, 'invoiceNumber', v_origin.number, 'amountCents', p_amount_cents,
        'projectTitle', v_title, 'refundRequested', coalesce(p_refund_requested, false)
      ),
      v_origin.client_id, v_origin.project_id
    )
    on conflict (dedupe_key) do nothing
    returning id into v_outbox_id;
    if v_outbox_id is not null then
      v_ids := v_ids || v_outbox_id;
    end if;
  end loop;

  return jsonb_build_object(
    'credit_note_id', p_id, 'number', v_number, 'issued_on', v_issued_on,
    'already', false, 'outbox_ids', to_jsonb(v_ids), 'fully_credited', v_fully
  );
end;
$$;
revoke all on function sv_private.issue_credit_note_at(uuid, text, uuid, text, bigint, text, boolean, jsonb, jsonb, uuid, timestamptz) from public, anon, authenticated, service_role;

create or replace function public.sv_issue_credit_note(
  p_id uuid,
  p_issue_key text,
  p_origin_invoice_id uuid,
  p_scope text,
  p_amount_cents bigint,
  p_reason text,
  p_refund_requested boolean,
  p_lines jsonb,
  p_snapshot jsonb,
  p_created_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return sv_private.issue_credit_note_at(
    p_id, p_issue_key, p_origin_invoice_id, p_scope, p_amount_cents, p_reason,
    p_refund_requested, p_lines, p_snapshot, p_created_by, now()
  );
end;
$$;
revoke all on function public.sv_issue_credit_note(uuid, text, uuid, text, bigint, text, boolean, jsonb, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.sv_issue_credit_note(uuid, text, uuid, text, bigint, text, boolean, jsonb, jsonb, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- PDF attachment (service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.sv_attach_invoice_pdf(
  p_invoice_id uuid,
  p_storage_path text,
  p_sha256 text,
  p_size integer,
  p_template_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_existing_sha text;
begin
  select i.project_id into v_project_id from public.sv_invoices i where i.id = p_invoice_id;
  if not found then
    raise exception 'sv_invoice_not_found' using errcode = 'P0001';
  end if;

  if p_storage_path is distinct from v_project_id::text || '/invoices/' || p_invoice_id::text || '.pdf' then
    raise exception 'sv_pdf_path_invalid' using errcode = 'P0001';
  end if;

  select d.sha256 into v_existing_sha from public.sv_invoice_pdfs d where d.invoice_id = p_invoice_id;
  if found then
    if v_existing_sha = p_sha256 then
      return jsonb_build_object('attached', false);
    end if;
    raise exception 'sv_pdf_already_attached' using errcode = 'P0001';
  end if;

  insert into public.sv_invoice_pdfs (invoice_id, storage_path, sha256, size_bytes, template_version)
  values (p_invoice_id, p_storage_path, p_sha256, p_size, p_template_version);

  return jsonb_build_object('attached', true);
end;
$$;
revoke all on function public.sv_attach_invoice_pdf(uuid, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.sv_attach_invoice_pdf(uuid, text, text, integer, text) to service_role;
