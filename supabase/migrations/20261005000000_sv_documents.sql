-- supabase/migrations/20261005000000_sv_documents.sql
--
-- Sevalys - Phase 13 (Document generation) - DOC-01, DOC-02, DOC-03.
-- NOT applied by plan 13-02: application happens on the branch in 13-07, prod in 13-16.
--
-- Decisions implemented:
--   D-02, D-05  one transaction (sv_issue_document) inserts the document row, its snapshot
--               and one document_issued outbox row per client member; one active document
--               per (project, doc_type), the head of the replacement chain.
--   D-03, D-14  no status column and no UPDATE ever: a replacement is a new row pointing to
--               the previous head through replaces_document_id. Two partial unique indexes
--               guarantee a single root and a single successor per document.
--   D-04        the outbox payload carries label, project title and revision, never an amount.
--   D-10        doc_type is quote, contract, spec, acceptance. The invoice type joins in
--               phase 15 through a later migration.
--   D-17        tables, RLS, revoke-then-grant, deny_mutation triggers, private bucket and
--               RPC live in this one file.
-- Append-only tables have no FK to auth.users and every FK out of them is on delete
-- restrict, so deleting a test user is never blocked by a journal.

-- ---------------------------------------------------------------------------
-- sv_project_documents (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_project_documents (
  id uuid primary key,
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  doc_type text not null check (doc_type in ('quote', 'contract', 'spec', 'acceptance')),
  revision integer not null check (revision >= 1),
  template_version text not null check (template_version ~ '^v[0-9]+$'),
  reference text not null check (char_length(reference) between 1 and 80),
  filename text not null check (char_length(filename) between 1 and 200),
  storage_path text not null unique check (char_length(storage_path) <= 200),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  replaces_document_id uuid null references public.sv_project_documents (id) on delete restrict,
  issued_by uuid null,
  issued_at timestamptz not null default now(),
  unique (project_id, doc_type, revision)
);
alter table public.sv_project_documents enable row level security;
revoke all on public.sv_project_documents from anon, authenticated, service_role;
grant select (id, project_id, doc_type, revision, template_version, reference, filename, sha256, size_bytes, replaces_document_id, issued_by, issued_at)
  on public.sv_project_documents to authenticated;
grant select, insert on public.sv_project_documents to service_role;

create index if not exists sv_project_documents_project_idx
  on public.sv_project_documents (project_id);
create unique index if not exists sv_project_documents_one_root_idx
  on public.sv_project_documents (project_id, doc_type) where replaces_document_id is null;
create unique index if not exists sv_project_documents_replaced_once_idx
  on public.sv_project_documents (replaces_document_id) where replaces_document_id is not null;

drop policy if exists sv_project_documents_read on public.sv_project_documents;
create policy sv_project_documents_read on public.sv_project_documents
  for select to authenticated
  using ((select sv_private.is_admin()) or project_id in (select sv_private.project_ids()));

drop trigger if exists sv_project_documents_no_upd_del on public.sv_project_documents;
create trigger sv_project_documents_no_upd_del
  before update or delete on public.sv_project_documents
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_project_documents_no_truncate on public.sv_project_documents;
create trigger sv_project_documents_no_truncate
  before truncate on public.sv_project_documents
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_document_snapshots (append-only, admin-only read: amounts and client identity)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_document_snapshots (
  document_id uuid primary key references public.sv_project_documents (id) on delete restrict,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now()
);
alter table public.sv_document_snapshots enable row level security;
revoke all on public.sv_document_snapshots from anon, authenticated, service_role;
grant select on public.sv_document_snapshots to authenticated;
grant select, insert on public.sv_document_snapshots to service_role;

drop policy if exists sv_document_snapshots_admin_read on public.sv_document_snapshots;
create policy sv_document_snapshots_admin_read on public.sv_document_snapshots
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_document_snapshots_no_upd_del on public.sv_document_snapshots;
create trigger sv_document_snapshots_no_upd_del
  before update or delete on public.sv_document_snapshots
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_document_snapshots_no_truncate on public.sv_document_snapshots;
create trigger sv_document_snapshots_no_truncate
  before truncate on public.sv_document_snapshots
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- Outbox closed lists: add document_issued (constraint names never trusted)
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
      and pg_get_constraintdef(c.oid) ilike '%step_changed%'
      and pg_get_constraintdef(c.oid) ilike '%onboarding_completed%'
  loop
    execute format('alter table public.sv_mail_outbox drop constraint %I', v_name);
  end loop;
  alter table public.sv_mail_outbox
    add constraint sv_mail_outbox_event_type_check check (event_type in ('client_invited', 'step_changed', 'onboarding_completed', 'document_issued'));
  alter table public.sv_mail_outbox
    add constraint sv_mail_outbox_template_check check (template in ('invite', 'step_changed', 'onboarding_completed', 'document_issued'));
end;
$$;

-- ---------------------------------------------------------------------------
-- Private bucket. No storage policy is created on purpose: every access goes through
-- service_role signed URLs. Gecko policies are filtered by bucket_id and are not touched.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sv-documents', 'sv-documents', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RPC (service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.sv_issue_document(
  p_id uuid,
  p_project_id uuid,
  p_doc_type text,
  p_revision integer,
  p_template_version text,
  p_reference text,
  p_filename text,
  p_storage_path text,
  p_sha256 text,
  p_size integer,
  p_snapshot jsonb,
  p_replaces uuid,
  p_actor uuid,
  p_document_label text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_client_id uuid;
  v_head_id uuid;
  v_head_revision integer;
  v_email text;
  v_outbox_id uuid;
  v_ids uuid[] := '{}';
begin
  select p.title, p.client_id into v_title, v_client_id
  from public.sv_projects p
  where p.id = p_project_id
  for update;
  if not found then
    raise exception 'sv_project_not_found' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.sv_project_documents d where d.id = p_id) then
    raise exception 'sv_document_already_issued' using errcode = 'P0001';
  end if;

  if p_storage_path <> p_project_id::text || '/' || p_id::text || '.pdf' then
    raise exception 'sv_document_path_mismatch' using errcode = 'P0001';
  end if;

  select d.id, d.revision into v_head_id, v_head_revision
  from public.sv_project_documents d
  where d.project_id = p_project_id
    and d.doc_type = p_doc_type
    and not exists (
      select 1 from public.sv_project_documents r where r.replaces_document_id = d.id
    );

  -- null-safe: no head and no replaces is valid; otherwise replaces must be the head
  if v_head_id is distinct from p_replaces then
    raise exception 'sv_document_replaces_mismatch' using errcode = 'P0001';
  end if;

  if p_revision <> coalesce(v_head_revision, 0) + 1 then
    raise exception 'sv_document_revision_mismatch' using errcode = 'P0001';
  end if;

  insert into public.sv_project_documents (
    id, project_id, doc_type, revision, template_version, reference, filename,
    storage_path, sha256, size_bytes, replaces_document_id, issued_by
  ) values (
    p_id, p_project_id, p_doc_type, p_revision, p_template_version, p_reference, p_filename,
    p_storage_path, p_sha256, p_size, p_replaces, p_actor
  );

  insert into public.sv_document_snapshots (document_id, data)
  values (p_id, p_snapshot);

  for v_email in
    select distinct lower(m.invited_email)
    from public.sv_client_members m
    where m.client_id = v_client_id
  loop
    v_outbox_id := null;
    insert into public.sv_mail_outbox (
      event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id
    ) values (
      'document_issued', 'document_issued', v_email, 'client',
      'document_issued:' || p_id::text || ':' || v_email,
      jsonb_build_object('documentLabel', p_document_label, 'projectTitle', v_title, 'revision', p_revision),
      v_client_id, p_project_id
    )
    on conflict (dedupe_key) do nothing
    returning id into v_outbox_id;
    if v_outbox_id is not null then
      v_ids := v_ids || v_outbox_id;
    end if;
  end loop;

  return jsonb_build_object('document_id', p_id, 'revision', p_revision, 'outbox_ids', to_jsonb(v_ids));
end;
$$;
revoke all on function public.sv_issue_document(uuid, uuid, text, integer, text, text, text, text, text, integer, jsonb, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.sv_issue_document(uuid, uuid, text, integer, text, text, text, text, text, integer, jsonb, uuid, uuid, text) to service_role;
