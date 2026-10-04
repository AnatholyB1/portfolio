-- supabase/migrations/20261006000000_sv_signature.sql
--
-- Sevalys - Phase 14 (Signature electronique) - SIGN-01 a SIGN-05.
-- A appliquer d'abord sur la branche Supabase de test (14-05), jamais en production
-- avant 14-18.
--
-- Decisions implementees :
--   D-10  une chaine de hachage par document (sv_signature_events), sans contention globale.
--   D-12  ajout seul garanti en base : triggers deny_mutation (UPDATE/DELETE/TRUNCATE, y compris
--         pour service_role), aucun grant d'insertion, insertion uniquement par la fonction
--         security definer sv_private.append_signature_event qui calcule le hachage et verrouille
--         la fin de chaine par document (verrou advisory, cles prefixees sv_sig).
--   D-16  le scellement (ligne de scelle, maillon 'sealed', fait projet, lignes d'outbox) se fait
--         dans UNE transaction : jamais de fait sans scelle.
--   D-17  un document signe est gele : sv_issue_document refuse de le remplacer.
-- Le bucket sv-documents existe deja (phase 13) : aucune politique de stockage n'est creee ni
-- modifiee ici, les politiques de l'autre application du projet partage ne sont pas touchees.
-- Les tables de piste n'ont aucune cle etrangere vers auth.users et toutes les cles etrangeres
-- sortantes sont on delete restrict.
--
-- CONTRAT DE HACHAGE (identique a 14-02, verifyChainExport) :
--   genese = sha256('sv-genesis:' || document_id)
--   maillon = sha256(concat_ws(chr(31), 'v1', document_id, seq, event_type, actor_kind,
--             coalesce(actor_id, ''), coalesce(ip, ''), doc_sha256, template_version,
--             occurred_at_utc, payload, prev_hash))
--   occurred_at_utc est une chaine UTC a la microseconde, stockee telle quelle, jamais recalculee.

-- ---------------------------------------------------------------------------
-- sv_signature_events (append-only, insertion par fonction uniquement)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_signature_events (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.sv_project_documents (id) on delete restrict,
  seq integer not null check (seq >= 1),
  event_type text not null check (event_type in ('document_opened', 'acceptance_response', 'acceptance_refused', 'consent_given', 'code_sent', 'code_send_failed', 'code_failed', 'code_locked', 'code_expired', 'signed', 'sealed', 'seal_downloaded')),
  actor_kind text not null check (actor_kind in ('client', 'admin', 'system')),
  actor_id uuid null,
  ip text null check (char_length(ip) <= 45),
  doc_sha256 text not null check (doc_sha256 ~ '^[0-9a-f]{64}$'),
  template_version text not null check (template_version ~ '^v[0-9]+$'),
  payload text not null check (char_length(payload) <= 20000),
  occurred_at timestamptz not null,
  occurred_at_utc text not null,
  prev_hash text not null check (prev_hash ~ '^[0-9a-f]{64}$'),
  link_hash text not null check (link_hash ~ '^[0-9a-f]{64}$'),
  unique (document_id, seq),
  unique (document_id, prev_hash)
);
alter table public.sv_signature_events enable row level security;
revoke all on public.sv_signature_events from anon, authenticated, service_role;
grant select on public.sv_signature_events to authenticated;
grant select on public.sv_signature_events to service_role;

drop policy if exists sv_signature_events_read on public.sv_signature_events;
create policy sv_signature_events_read on public.sv_signature_events
  for select to authenticated
  using (
    (select sv_private.is_admin())
    or document_id in (
      select d.id from public.sv_project_documents d
      where d.project_id in (select sv_private.project_ids())
    )
  );

drop trigger if exists sv_signature_events_no_upd_del on public.sv_signature_events;
create trigger sv_signature_events_no_upd_del
  before update or delete on public.sv_signature_events
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_signature_events_no_truncate on public.sv_signature_events;
create trigger sv_signature_events_no_truncate
  before truncate on public.sv_signature_events
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_signature_codes (la seule table modifiable : compteur d'essais et invalidation)
-- Le code n'est jamais stocke : seulement son HMAC. Aucun acces client.
-- ---------------------------------------------------------------------------

create table if not exists public.sv_signature_codes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.sv_project_documents (id) on delete restrict,
  user_id uuid not null,
  code_hmac text not null check (code_hmac ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  consumed_at timestamptz null,
  invalidated_at timestamptz null,
  invalid_reason text null check (invalid_reason in ('superseded', 'locked', 'expired', 'send_failed'))
);
alter table public.sv_signature_codes enable row level security;
revoke all on public.sv_signature_codes from anon, authenticated, service_role;
grant select on public.sv_signature_codes to service_role;

create index if not exists sv_signature_codes_document_idx
  on public.sv_signature_codes (document_id, created_at);

-- ---------------------------------------------------------------------------
-- sv_acceptance_submissions / sv_acceptance_responses (PV de recette, append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_acceptance_submissions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.sv_project_documents (id) on delete restrict,
  actor_id uuid not null,
  criteria_count integer not null check (criteria_count between 1 and 100),
  delivered_count integer not null check (delivered_count >= 0),
  reserved_count integer not null check (reserved_count >= 0),
  refused_count integer not null check (refused_count >= 0),
  created_at timestamptz not null default now()
);
alter table public.sv_acceptance_submissions enable row level security;
revoke all on public.sv_acceptance_submissions from anon, authenticated, service_role;
grant select on public.sv_acceptance_submissions to authenticated;
grant select on public.sv_acceptance_submissions to service_role;

create index if not exists sv_acceptance_submissions_document_idx
  on public.sv_acceptance_submissions (document_id, created_at);

drop policy if exists sv_acceptance_submissions_read on public.sv_acceptance_submissions;
create policy sv_acceptance_submissions_read on public.sv_acceptance_submissions
  for select to authenticated
  using (
    (select sv_private.is_admin())
    or document_id in (
      select d.id from public.sv_project_documents d
      where d.project_id in (select sv_private.project_ids())
    )
  );

drop trigger if exists sv_acceptance_submissions_no_upd_del on public.sv_acceptance_submissions;
create trigger sv_acceptance_submissions_no_upd_del
  before update or delete on public.sv_acceptance_submissions
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_acceptance_submissions_no_truncate on public.sv_acceptance_submissions;
create trigger sv_acceptance_submissions_no_truncate
  before truncate on public.sv_acceptance_submissions
  for each statement execute function sv_private.deny_mutation();

create table if not exists public.sv_acceptance_responses (
  submission_id uuid not null references public.sv_acceptance_submissions (id) on delete restrict,
  criterion_index integer not null check (criterion_index >= 1),
  status text not null check (status in ('delivered', 'reserved', 'refused')),
  note text null check (char_length(note) <= 1000),
  primary key (submission_id, criterion_index),
  check ((status = 'delivered') = (note is null))
);
alter table public.sv_acceptance_responses enable row level security;
revoke all on public.sv_acceptance_responses from anon, authenticated, service_role;
grant select on public.sv_acceptance_responses to authenticated;
grant select on public.sv_acceptance_responses to service_role;

drop policy if exists sv_acceptance_responses_read on public.sv_acceptance_responses;
create policy sv_acceptance_responses_read on public.sv_acceptance_responses
  for select to authenticated
  using (
    (select sv_private.is_admin())
    or submission_id in (
      select s.id from public.sv_acceptance_submissions s
      where s.document_id in (
        select d.id from public.sv_project_documents d
        where d.project_id in (select sv_private.project_ids())
      )
    )
  );

drop trigger if exists sv_acceptance_responses_no_upd_del on public.sv_acceptance_responses;
create trigger sv_acceptance_responses_no_upd_del
  before update or delete on public.sv_acceptance_responses
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_acceptance_responses_no_truncate on public.sv_acceptance_responses;
create trigger sv_acceptance_responses_no_truncate
  before truncate on public.sv_acceptance_responses
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_document_signatures (une signature par document, append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_document_signatures (
  document_id uuid primary key references public.sv_project_documents (id) on delete restrict,
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  signer_user_id uuid not null,
  signer_email text not null check (char_length(signer_email) <= 320),
  signer_name text not null check (char_length(signer_name) <= 120),
  signer_role text not null check (char_length(signer_role) <= 120),
  ip text null check (char_length(ip) <= 45),
  consent_version text not null check (consent_version ~ '^v[0-9]+$'),
  acceptance_submission_id uuid null references public.sv_acceptance_submissions (id) on delete restrict,
  code_id uuid not null references public.sv_signature_codes (id) on delete restrict,
  signed_event_seq integer not null check (signed_event_seq >= 1),
  signed_link_hash text not null check (signed_link_hash ~ '^[0-9a-f]{64}$'),
  signed_at timestamptz not null,
  signed_at_utc text not null
);
alter table public.sv_document_signatures enable row level security;
revoke all on public.sv_document_signatures from anon, authenticated, service_role;
grant select on public.sv_document_signatures to authenticated;
grant select on public.sv_document_signatures to service_role;

create index if not exists sv_document_signatures_project_idx
  on public.sv_document_signatures (project_id);

drop policy if exists sv_document_signatures_read on public.sv_document_signatures;
create policy sv_document_signatures_read on public.sv_document_signatures
  for select to authenticated
  using ((select sv_private.is_admin()) or project_id in (select sv_private.project_ids()));

drop trigger if exists sv_document_signatures_no_upd_del on public.sv_document_signatures;
create trigger sv_document_signatures_no_upd_del
  before update or delete on public.sv_document_signatures
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_document_signatures_no_truncate on public.sv_document_signatures;
create trigger sv_document_signatures_no_truncate
  before truncate on public.sv_document_signatures
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- sv_document_seals (un scelle par document, append-only, chemin de stockage masque)
-- ---------------------------------------------------------------------------

create table if not exists public.sv_document_seals (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.sv_document_signatures (document_id) on delete restrict,
  storage_path text not null unique check (char_length(storage_path) <= 200),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  sealed_at timestamptz not null default now()
);
alter table public.sv_document_seals enable row level security;
revoke all on public.sv_document_seals from anon, authenticated, service_role;
grant select (id, document_id, sha256, size_bytes, sealed_at) on public.sv_document_seals to authenticated;
grant select on public.sv_document_seals to service_role;

drop policy if exists sv_document_seals_read on public.sv_document_seals;
create policy sv_document_seals_read on public.sv_document_seals
  for select to authenticated
  using (
    (select sv_private.is_admin())
    or document_id in (
      select d.id from public.sv_project_documents d
      where d.project_id in (select sv_private.project_ids())
    )
  );

drop trigger if exists sv_document_seals_no_upd_del on public.sv_document_seals;
create trigger sv_document_seals_no_upd_del
  before update or delete on public.sv_document_seals
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_document_seals_no_truncate on public.sv_document_seals;
create trigger sv_document_seals_no_truncate
  before truncate on public.sv_document_seals
  for each statement execute function sv_private.deny_mutation();

-- ---------------------------------------------------------------------------
-- Fonctions de hachage (immuables, partagees par l'ajout, la verification et l'export)
-- ---------------------------------------------------------------------------

create or replace function sv_private.signature_genesis_hash(p_document_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to('sv-genesis:' || p_document_id::text, 'UTF8')), 'hex');
$$;
revoke all on function sv_private.signature_genesis_hash(uuid) from public, anon, authenticated;

create or replace function sv_private.signature_link_hash(
  p_document_id uuid,
  p_seq integer,
  p_event text,
  p_actor_kind text,
  p_actor_id uuid,
  p_ip text,
  p_doc_sha256 text,
  p_template_version text,
  p_occurred_at_utc text,
  p_payload text,
  p_prev_hash text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    sha256(
      convert_to(
        concat_ws(
          chr(31),
          'v1',
          p_document_id::text,
          p_seq::text,
          p_event,
          p_actor_kind,
          coalesce(p_actor_id::text, ''),
          coalesce(p_ip, ''),
          p_doc_sha256,
          p_template_version,
          p_occurred_at_utc,
          p_payload,
          p_prev_hash
        ),
        'UTF8'
      )
    ),
    'hex'
  );
$$;
revoke all on function sv_private.signature_link_hash(uuid, integer, text, text, uuid, text, text, text, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ajout d'un maillon (interne, jamais expose). Appelant : verrou projet deja pris.
-- ---------------------------------------------------------------------------

create or replace function sv_private.append_signature_event(
  p_document_id uuid,
  p_event text,
  p_actor_kind text,
  p_actor_id uuid,
  p_ip text,
  p_payload text
)
returns public.sv_signature_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.sv_project_documents%rowtype;
  v_prev public.sv_signature_events%rowtype;
  v_seq integer;
  v_prev_hash text;
  v_at timestamptz := clock_timestamp();
  v_utc text;
  v_ip text := nullif(btrim(coalesce(p_ip, '')), '');
  v_payload text := coalesce(p_payload, '{}');
  v_hash text;
  v_row public.sv_signature_events;
begin
  perform pg_advisory_xact_lock(hashtext('sv_sig_chain'), hashtext(p_document_id::text));

  select * into v_doc from public.sv_project_documents where id = p_document_id;
  if not found then
    raise exception 'sv_document_not_found' using errcode = 'P0001';
  end if;

  begin
    perform v_payload::jsonb;
  exception when others then
    raise exception 'sv_invalid_payload' using errcode = 'P0001';
  end;
  if position(chr(31) in v_payload) > 0 then
    raise exception 'sv_invalid_payload' using errcode = 'P0001';
  end if;

  if v_ip is not null then
    begin
      perform v_ip::inet;
    exception when others then
      raise exception 'sv_invalid_ip' using errcode = 'P0001';
    end;
    if position('/' in v_ip) > 0 or char_length(v_ip) > 45 then
      raise exception 'sv_invalid_ip' using errcode = 'P0001';
    end if;
  end if;

  select * into v_prev
  from public.sv_signature_events e
  where e.document_id = p_document_id
  order by e.seq desc
  limit 1;

  v_seq := coalesce(v_prev.seq, 0) + 1;
  v_prev_hash := coalesce(v_prev.link_hash, sv_private.signature_genesis_hash(p_document_id));
  v_utc := to_char(v_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');

  v_hash := sv_private.signature_link_hash(
    p_document_id, v_seq, p_event, p_actor_kind, p_actor_id, v_ip,
    v_doc.sha256, v_doc.template_version, v_utc, v_payload, v_prev_hash
  );

  insert into public.sv_signature_events (
    document_id, seq, event_type, actor_kind, actor_id, ip, doc_sha256, template_version,
    payload, occurred_at, occurred_at_utc, prev_hash, link_hash
  ) values (
    p_document_id, v_seq, p_event, p_actor_kind, p_actor_id, v_ip, v_doc.sha256, v_doc.template_version,
    v_payload, v_at, v_utc, v_prev_hash, v_hash
  )
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function sv_private.append_signature_event(uuid, text, text, uuid, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Gardes internes
-- ---------------------------------------------------------------------------

-- Verrouille la ligne projet du document (toujours en premier : projet puis verrou advisory).
create or replace function sv_private.lock_document_project(p_document_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
begin
  select d.project_id into v_project_id
  from public.sv_project_documents d
  where d.id = p_document_id;
  if not found then
    raise exception 'sv_document_not_found' using errcode = 'P0001';
  end if;
  perform 1 from public.sv_projects p where p.id = v_project_id for update;
  if not found then
    raise exception 'sv_project_not_found' using errcode = 'P0001';
  end if;
  return v_project_id;
end;
$$;
revoke all on function sv_private.lock_document_project(uuid) from public, anon, authenticated;

create or replace function sv_private.assert_client_member(p_project_id uuid, p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null or not exists (
    select 1
    from public.sv_projects p
    join public.sv_client_members m on m.client_id = p.client_id
    where p.id = p_project_id and m.user_id = p_actor_id
  ) then
    raise exception 'sv_not_client_member' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function sv_private.assert_client_member(uuid, uuid) from public, anon, authenticated;

create or replace function sv_private.assert_signing_member(p_project_id uuid, p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
begin
  perform sv_private.assert_client_member(p_project_id, p_actor_id);

  select p.client_id into v_client_id from public.sv_projects p where p.id = p_project_id;

  if not exists (
    select 1
    from public.sv_client_onboarding o
    where o.client_id = v_client_id
      and nullif(btrim(coalesce(o.signatory_name, '')), '') is not null
      and nullif(btrim(coalesce(o.signatory_role, '')), '') is not null
  ) then
    raise exception 'sv_signatory_incomplete' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function sv_private.assert_signing_member(uuid, uuid) from public, anon, authenticated;

create or replace function sv_private.assert_signable_head(p_document_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text;
begin
  select d.doc_type into v_type from public.sv_project_documents d where d.id = p_document_id;
  if not found then
    raise exception 'sv_document_not_found' using errcode = 'P0001';
  end if;
  if v_type not in ('quote', 'contract', 'acceptance') then
    raise exception 'sv_document_not_signable' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.sv_project_documents r where r.replaces_document_id = p_document_id) then
    raise exception 'sv_document_superseded' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.sv_document_signatures s where s.document_id = p_document_id) then
    raise exception 'sv_document_signed' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function sv_private.assert_signable_head(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC de piste (service_role uniquement)
-- ---------------------------------------------------------------------------

create or replace function public.sv_log_document_opened(
  p_document_id uuid,
  p_actor_kind text,
  p_actor_id uuid,
  p_ip text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_type text;
  v_row public.sv_signature_events;
begin
  v_project_id := sv_private.lock_document_project(p_document_id);

  select d.doc_type into v_type from public.sv_project_documents d where d.id = p_document_id;
  if v_type not in ('quote', 'contract', 'acceptance') then
    raise exception 'sv_document_not_signable' using errcode = 'P0001';
  end if;

  if p_actor_kind is null or p_actor_kind not in ('client', 'admin') then
    raise exception 'sv_invalid_actor' using errcode = 'P0001';
  end if;
  if p_actor_kind = 'client' then
    perform sv_private.assert_client_member(v_project_id, p_actor_id);
  end if;

  if exists (
    select 1
    from public.sv_signature_events e
    where e.document_id = p_document_id
      and e.event_type = 'document_opened'
      and e.actor_kind = p_actor_kind
      and e.actor_id is not distinct from p_actor_id
      and e.occurred_at > clock_timestamp() - interval '5 minutes'
  ) then
    return jsonb_build_object('logged', false, 'seq', null);
  end if;

  v_row := sv_private.append_signature_event(p_document_id, 'document_opened', p_actor_kind, p_actor_id, p_ip, '{}');
  return jsonb_build_object('logged', true, 'seq', v_row.seq);
end;
$$;
revoke all on function public.sv_log_document_opened(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.sv_log_document_opened(uuid, text, uuid, text) to service_role;

create or replace function public.sv_record_signature_consent(
  p_document_id uuid,
  p_actor_id uuid,
  p_ip text,
  p_consent_version text,
  p_payload text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_payload_version text;
  v_row public.sv_signature_events;
begin
  v_project_id := sv_private.lock_document_project(p_document_id);
  perform sv_private.assert_signable_head(p_document_id);
  perform sv_private.assert_signing_member(v_project_id, p_actor_id);

  if p_consent_version is null or p_consent_version !~ '^v[0-9]+$' then
    raise exception 'sv_invalid_payload' using errcode = 'P0001';
  end if;

  begin
    v_payload_version := (p_payload::jsonb) ->> 'version';
  exception when others then
    raise exception 'sv_invalid_payload' using errcode = 'P0001';
  end;
  if v_payload_version is distinct from p_consent_version then
    raise exception 'sv_invalid_payload' using errcode = 'P0001';
  end if;

  v_row := sv_private.append_signature_event(p_document_id, 'consent_given', 'client', p_actor_id, p_ip, p_payload);
  return jsonb_build_object('seq', v_row.seq);
end;
$$;
revoke all on function public.sv_record_signature_consent(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.sv_record_signature_consent(uuid, uuid, text, text, text) to service_role;

create or replace function public.sv_log_seal_downloaded(
  p_document_id uuid,
  p_actor_kind text,
  p_actor_id uuid,
  p_ip text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_seal_id uuid;
  v_row public.sv_signature_events;
begin
  v_project_id := sv_private.lock_document_project(p_document_id);

  select s.id into v_seal_id from public.sv_document_seals s where s.document_id = p_document_id;
  if not found then
    raise exception 'sv_seal_missing' using errcode = 'P0001';
  end if;

  if p_actor_kind is null or p_actor_kind not in ('client', 'admin') then
    raise exception 'sv_invalid_actor' using errcode = 'P0001';
  end if;
  if p_actor_kind = 'client' then
    perform sv_private.assert_client_member(v_project_id, p_actor_id);
  end if;

  v_row := sv_private.append_signature_event(
    p_document_id, 'seal_downloaded', p_actor_kind, p_actor_id, p_ip,
    jsonb_build_object('sealId', v_seal_id)::text
  );
  return jsonb_build_object('seq', v_row.seq);
end;
$$;
revoke all on function public.sv_log_seal_downloaded(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.sv_log_seal_downloaded(uuid, text, uuid, text) to service_role;

create or replace function public.sv_export_signature_chain(p_document_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.sv_project_documents%rowtype;
  v_seal_sha text;
  v_events jsonb;
  v_head text;
begin
  select * into v_doc from public.sv_project_documents d where d.id = p_document_id;
  if not found then
    raise exception 'sv_document_not_found' using errcode = 'P0001';
  end if;

  select s.sha256 into v_seal_sha from public.sv_document_seals s where s.document_id = p_document_id;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'seq', e.seq,
          'eventType', e.event_type,
          'actorKind', e.actor_kind,
          'actorId', e.actor_id,
          'ip', e.ip,
          'docSha256', e.doc_sha256,
          'templateVersion', e.template_version,
          'occurredAtUtc', e.occurred_at_utc,
          'payload', e.payload,
          'prevHash', e.prev_hash,
          'linkHash', e.link_hash
        )
        order by e.seq
      ),
      '[]'::jsonb
    ),
    (array_agg(e.link_hash order by e.seq desc))[1]
  into v_events, v_head
  from public.sv_signature_events e
  where e.document_id = p_document_id;

  return jsonb_build_object(
    'formatVersion', 1,
    'document', jsonb_build_object(
      'id', v_doc.id,
      'reference', v_doc.reference,
      'docType', v_doc.doc_type,
      'revision', v_doc.revision,
      'templateVersion', v_doc.template_version,
      'originalSha256', v_doc.sha256,
      'sealSha256', v_seal_sha
    ),
    'genesisHash', sv_private.signature_genesis_hash(p_document_id),
    'events', v_events,
    'headHash', v_head,
    'exportedAt', to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  );
end;
$$;
revoke all on function public.sv_export_signature_chain(uuid) from public, anon, authenticated;
grant execute on function public.sv_export_signature_chain(uuid) to service_role;

create or replace function public.sv_verify_signature_chain(p_document_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.sv_signature_events%rowtype;
  v_expected_prev text := sv_private.signature_genesis_hash(p_document_id);
  v_expected_seq integer := 1;
  v_count integer := 0;
begin
  if not exists (select 1 from public.sv_project_documents d where d.id = p_document_id) then
    raise exception 'sv_document_not_found' using errcode = 'P0001';
  end if;

  for v_row in
    select * from public.sv_signature_events e
    where e.document_id = p_document_id
    order by e.seq
  loop
    if v_row.seq <> v_expected_seq
       or v_row.prev_hash <> v_expected_prev
       or v_row.link_hash <> sv_private.signature_link_hash(
            v_row.document_id, v_row.seq, v_row.event_type, v_row.actor_kind, v_row.actor_id, v_row.ip,
            v_row.doc_sha256, v_row.template_version, v_row.occurred_at_utc, v_row.payload, v_row.prev_hash
          )
    then
      return jsonb_build_object('ok', false, 'count', v_count, 'broken_at', v_row.seq, 'head_hash', v_expected_prev);
    end if;
    v_count := v_count + 1;
    v_expected_seq := v_expected_seq + 1;
    v_expected_prev := v_row.link_hash;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'count', v_count,
    'broken_at', null,
    'head_hash', case when v_count = 0 then null else v_expected_prev end
  );
end;
$$;
revoke all on function public.sv_verify_signature_chain(uuid) from public, anon, authenticated;
grant execute on function public.sv_verify_signature_chain(uuid) to service_role;

-- ===== fin partie 1 (14-04 Task 1) : tables, chaîne, RPC de piste =====

-- ---------------------------------------------------------------------------
-- Partie 2 : extension de l'outbox (liste fermee, noms de contraintes jamais fiables)
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
    add constraint sv_mail_outbox_event_type_check check (event_type in ('client_invited', 'step_changed', 'onboarding_completed', 'document_issued', 'document_signed', 'document_signed_admin', 'acceptance_refused'));
  alter table public.sv_mail_outbox
    add constraint sv_mail_outbox_template_check check (template in ('invite', 'step_changed', 'onboarding_completed', 'document_issued', 'document_signed', 'document_signed_admin', 'acceptance_refused'));
end;
$$;

-- ---------------------------------------------------------------------------
-- PV de recette : reponses critere par critere (service_role uniquement)
-- ---------------------------------------------------------------------------

create or replace function public.sv_submit_acceptance(
  p_document_id uuid,
  p_actor_id uuid,
  p_ip text,
  p_answers jsonb,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_type text;
  v_reference text;
  v_criteria jsonb;
  v_n integer;
  v_el jsonb;
  v_ord bigint;
  v_idx integer;
  v_seen integer[] := '{}';
  v_status text;
  v_note_json jsonb;
  v_note text;
  v_delivered integer := 0;
  v_reserved integer := 0;
  v_refused integer := 0;
  v_submission_id uuid;
  v_refused_list jsonb := '[]'::jsonb;
  v_refused_idx jsonb := '[]'::jsonb;
  v_title text;
  v_client_name text;
  v_client_id uuid;
  v_admin text := lower(nullif(btrim(coalesce(p_admin_email, '')), ''));
  v_outbox_id uuid;
  v_ids uuid[] := '{}';
begin
  v_project_id := sv_private.lock_document_project(p_document_id);

  select d.doc_type, d.reference into v_type, v_reference
  from public.sv_project_documents d
  where d.id = p_document_id;
  if v_type <> 'acceptance' then
    raise exception 'sv_document_not_signable' using errcode = 'P0001';
  end if;

  perform sv_private.assert_signable_head(p_document_id);
  perform sv_private.assert_signing_member(v_project_id, p_actor_id);

  if exists (
    select 1 from public.sv_acceptance_submissions s
    where s.document_id = p_document_id and s.refused_count > 0
  ) then
    raise exception 'sv_acceptance_refused' using errcode = 'P0001';
  end if;

  if (select count(*) from public.sv_acceptance_submissions s where s.document_id = p_document_id) >= 20 then
    raise exception 'sv_too_many_submissions' using errcode = 'P0001';
  end if;

  select sn.data -> 'acceptanceCriteria' into v_criteria
  from public.sv_document_snapshots sn
  where sn.document_id = p_document_id;

  if v_criteria is null or jsonb_typeof(v_criteria) <> 'array' then
    raise exception 'sv_acceptance_mismatch' using errcode = 'P0001';
  end if;
  v_n := jsonb_array_length(v_criteria);
  if v_n < 1 or v_n > 100
     or p_answers is null
     or jsonb_typeof(p_answers) <> 'array'
     or jsonb_array_length(p_answers) <> v_n then
    raise exception 'sv_acceptance_mismatch' using errcode = 'P0001';
  end if;

  -- first pass: validate every answer and count
  for v_el, v_ord in
    select t.el, t.ord from jsonb_array_elements(p_answers) with ordinality as t(el, ord)
  loop
    if jsonb_typeof(v_el) <> 'object' then
      raise exception 'sv_invalid_answer' using errcode = 'P0001';
    end if;
    if coalesce(v_el ->> 'index', '') !~ '^[0-9]{1,3}$' then
      raise exception 'sv_invalid_answer' using errcode = 'P0001';
    end if;
    v_idx := (v_el ->> 'index')::integer;
    if v_idx < 1 or v_idx > v_n or v_idx = any (v_seen) then
      raise exception 'sv_invalid_answer' using errcode = 'P0001';
    end if;
    v_seen := v_seen || v_idx;

    v_status := v_el ->> 'status';
    if v_status is null or v_status not in ('delivered', 'reserved', 'refused') then
      raise exception 'sv_invalid_answer' using errcode = 'P0001';
    end if;

    v_note_json := v_el -> 'note';
    if v_note_json is null or jsonb_typeof(v_note_json) = 'null' then
      v_note := null;
    elsif jsonb_typeof(v_note_json) = 'string' then
      v_note := btrim(v_note_json #>> '{}');
    else
      raise exception 'sv_invalid_answer' using errcode = 'P0001';
    end if;

    if v_status = 'delivered' then
      if v_note is not null then
        raise exception 'sv_invalid_answer' using errcode = 'P0001';
      end if;
      v_delivered := v_delivered + 1;
    else
      if v_note is null or char_length(v_note) < 3 or char_length(v_note) > 1000 then
        raise exception 'sv_invalid_answer' using errcode = 'P0001';
      end if;
      if v_status = 'reserved' then
        v_reserved := v_reserved + 1;
      else
        v_refused := v_refused + 1;
      end if;
    end if;
  end loop;

  insert into public.sv_acceptance_submissions (
    document_id, actor_id, criteria_count, delivered_count, reserved_count, refused_count
  ) values (
    p_document_id, p_actor_id, v_n, v_delivered, v_reserved, v_refused
  )
  returning id into v_submission_id;

  -- second pass: rows and one trail link per criterion
  for v_el, v_ord in
    select t.el, t.ord from jsonb_array_elements(p_answers) with ordinality as t(el, ord)
  loop
    v_idx := (v_el ->> 'index')::integer;
    v_status := v_el ->> 'status';
    v_note_json := v_el -> 'note';
    if v_note_json is null or jsonb_typeof(v_note_json) = 'null' then
      v_note := null;
    else
      v_note := btrim(v_note_json #>> '{}');
    end if;

    insert into public.sv_acceptance_responses (submission_id, criterion_index, status, note)
    values (v_submission_id, v_idx, v_status, v_note);

    perform sv_private.append_signature_event(
      p_document_id, 'acceptance_response', 'client', p_actor_id, p_ip,
      jsonb_build_object('submissionId', v_submission_id, 'index', v_idx, 'status', v_status, 'note', v_note)::text
    );

    if v_status = 'refused' then
      v_refused_idx := v_refused_idx || to_jsonb(v_idx);
      v_refused_list := v_refused_list || jsonb_build_object(
        'index', v_idx,
        'criterion', v_criteria ->> (v_idx - 1),
        'note', v_note
      );
    end if;
  end loop;

  if v_refused > 0 then
    perform sv_private.append_signature_event(
      p_document_id, 'acceptance_refused', 'client', p_actor_id, p_ip,
      jsonb_build_object('submissionId', v_submission_id, 'refusedIndexes', v_refused_idx)::text
    );

    if v_admin is null then
      raise exception 'sv_invalid_admin_email' using errcode = 'P0001';
    end if;

    select p.title, p.client_id, c.name into v_title, v_client_id, v_client_name
    from public.sv_projects p
    join public.sv_clients c on c.id = p.client_id
    where p.id = v_project_id;

    insert into public.sv_mail_outbox (
      event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id
    ) values (
      'acceptance_refused', 'acceptance_refused', v_admin, 'admin',
      'acceptance_refused:' || v_submission_id::text,
      jsonb_build_object(
        'projectTitle', v_title,
        'clientName', v_client_name,
        'reference', v_reference,
        'refusedCount', v_refused,
        'refused', v_refused_list
      ),
      v_client_id, v_project_id
    )
    on conflict (dedupe_key) do nothing
    returning id into v_outbox_id;
    if v_outbox_id is not null then
      v_ids := v_ids || v_outbox_id;
    end if;
  end if;

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'delivered_count', v_delivered,
    'reserved_count', v_reserved,
    'refused_count', v_refused,
    'outbox_ids', to_jsonb(v_ids)
  );
end;
$$;
revoke all on function public.sv_submit_acceptance(uuid, uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.sv_submit_acceptance(uuid, uuid, text, jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- Code a usage unique : demande (HMAC uniquement, jamais le code)
-- ---------------------------------------------------------------------------

create or replace function public.sv_request_signature_code(
  p_document_id uuid,
  p_actor_id uuid,
  p_ip text,
  p_code_hmac text,
  p_consent_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_type text;
  v_last timestamptz;
  v_hour_count integer;
  v_refused integer;
  v_has_submission boolean;
  v_code_id uuid;
  v_expires timestamptz;
begin
  v_project_id := sv_private.lock_document_project(p_document_id);
  perform sv_private.assert_signable_head(p_document_id);
  perform sv_private.assert_signing_member(v_project_id, p_actor_id);

  if p_code_hmac is null or p_code_hmac !~ '^[0-9a-f]{64}$' then
    raise exception 'sv_invalid_hmac' using errcode = 'P0001';
  end if;

  if p_consent_version is null or not exists (
    select 1
    from public.sv_signature_events e
    where e.document_id = p_document_id
      and e.event_type = 'consent_given'
      and e.actor_id = p_actor_id
      and (e.payload::jsonb) ->> 'version' = p_consent_version
  ) then
    raise exception 'sv_consent_missing' using errcode = 'P0001';
  end if;

  select d.doc_type into v_type from public.sv_project_documents d where d.id = p_document_id;
  if v_type = 'acceptance' then
    select true, s.refused_count into v_has_submission, v_refused
    from public.sv_acceptance_submissions s
    where s.document_id = p_document_id
    order by s.created_at desc, s.id desc
    limit 1;
    if v_has_submission is not true then
      raise exception 'sv_acceptance_missing' using errcode = 'P0001';
    end if;
    if v_refused > 0 then
      raise exception 'sv_acceptance_refused' using errcode = 'P0001';
    end if;
  end if;

  select max(c.created_at) into v_last
  from public.sv_signature_codes c
  where c.document_id = p_document_id;
  if v_last is not null and v_last > now() - interval '60 seconds' then
    return jsonb_build_object(
      'ok', false,
      'reason', 'too_soon',
      'retry_after_s', greatest(1, ceil(extract(epoch from (v_last + interval '60 seconds' - now())))::integer)
    );
  end if;

  select count(*) into v_hour_count
  from public.sv_signature_codes c
  where c.document_id = p_document_id
    and c.created_at > now() - interval '1 hour';
  if v_hour_count >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'hourly_cap');
  end if;

  update public.sv_signature_codes c
  set invalidated_at = now(), invalid_reason = 'superseded'
  where c.document_id = p_document_id
    and c.user_id = p_actor_id
    and c.consumed_at is null
    and c.invalidated_at is null;

  insert into public.sv_signature_codes (document_id, user_id, code_hmac, expires_at)
  values (p_document_id, p_actor_id, p_code_hmac, now() + interval '10 minutes')
  returning id, expires_at into v_code_id, v_expires;

  perform sv_private.append_signature_event(
    p_document_id, 'code_sent', 'client', p_actor_id, p_ip,
    jsonb_build_object(
      'codeId', v_code_id,
      'expiresAtUtc', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    )::text
  );

  return jsonb_build_object(
    'ok', true,
    'code_id', v_code_id,
    'expires_at', v_expires,
    'sends_left', 5 - (v_hour_count + 1)
  );
end;
$$;
revoke all on function public.sv_request_signature_code(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.sv_request_signature_code(uuid, uuid, text, text, text) to service_role;

-- L'envoi echoue compte quand meme dans le quota horaire (la ligne reste, invalidee).
create or replace function public.sv_log_code_send_failed(
  p_code_id uuid,
  p_ip text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_id uuid;
  v_code public.sv_signature_codes%rowtype;
begin
  select c.document_id into v_document_id from public.sv_signature_codes c where c.id = p_code_id;
  if not found then
    raise exception 'sv_code_not_found' using errcode = 'P0001';
  end if;

  perform sv_private.lock_document_project(v_document_id);

  select * into v_code from public.sv_signature_codes c where c.id = p_code_id for update;
  if v_code.consumed_at is not null or v_code.invalidated_at is not null then
    return jsonb_build_object('logged', false);
  end if;

  update public.sv_signature_codes c
  set invalidated_at = now(), invalid_reason = 'send_failed'
  where c.id = p_code_id;

  perform sv_private.append_signature_event(
    v_document_id, 'code_send_failed', 'system', null, p_ip,
    jsonb_build_object('codeId', p_code_id)::text
  );
  return jsonb_build_object('logged', true);
end;
$$;
revoke all on function public.sv_log_code_send_failed(uuid, text) from public, anon, authenticated;
grant execute on function public.sv_log_code_send_failed(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Verification du code : une erreur de code est RETOURNEE, jamais levee, pour que
-- le compteur d'essais et le maillon soient valides par la transaction.
-- ---------------------------------------------------------------------------

create or replace function public.sv_verify_signature_code(
  p_document_id uuid,
  p_actor_id uuid,
  p_ip text,
  p_code_hmac text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_client_id uuid;
  v_type text;
  v_sig public.sv_document_signatures%rowtype;
  v_code public.sv_signature_codes%rowtype;
  v_attempts integer;
  v_email text;
  v_name text;
  v_role text;
  v_consent_version text;
  v_submission_id uuid;
  v_submission_refused integer;
  v_event public.sv_signature_events;
begin
  v_project_id := sv_private.lock_document_project(p_document_id);

  select * into v_sig from public.sv_document_signatures s where s.document_id = p_document_id;
  if found then
    if v_sig.signer_user_id = p_actor_id then
      return jsonb_build_object('ok', true, 'already_signed', true);
    end if;
    raise exception 'sv_document_signed' using errcode = 'P0001';
  end if;

  perform sv_private.assert_signable_head(p_document_id);
  perform sv_private.assert_signing_member(v_project_id, p_actor_id);

  if p_code_hmac is null or p_code_hmac !~ '^[0-9a-f]{64}$' then
    raise exception 'sv_invalid_hmac' using errcode = 'P0001';
  end if;

  select * into v_code
  from public.sv_signature_codes c
  where c.document_id = p_document_id
    and c.user_id = p_actor_id
    and c.consumed_at is null
    and c.invalidated_at is null
  order by c.created_at desc
  limit 1
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_code');
  end if;

  if v_code.expires_at <= now() then
    update public.sv_signature_codes c
    set invalidated_at = now(), invalid_reason = 'expired'
    where c.id = v_code.id;
    perform sv_private.append_signature_event(
      p_document_id, 'code_expired', 'client', p_actor_id, p_ip,
      jsonb_build_object('codeId', v_code.id)::text
    );
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  if v_code.code_hmac <> p_code_hmac then
    v_attempts := v_code.attempts + 1;
    update public.sv_signature_codes c
    set attempts = v_attempts
    where c.id = v_code.id;
    perform sv_private.append_signature_event(
      p_document_id, 'code_failed', 'client', p_actor_id, p_ip,
      jsonb_build_object('codeId', v_code.id, 'attempt', v_attempts)::text
    );
    if v_attempts >= 5 then
      update public.sv_signature_codes c
      set invalidated_at = now(), invalid_reason = 'locked'
      where c.id = v_code.id;
      perform sv_private.append_signature_event(
        p_document_id, 'code_locked', 'client', p_actor_id, p_ip,
        jsonb_build_object('codeId', v_code.id)::text
      );
      return jsonb_build_object('ok', false, 'reason', 'locked', 'remaining', 0);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'invalid', 'remaining', 5 - v_attempts);
  end if;

  -- matching code: gather the signer identity before consuming anything
  select p.client_id into v_client_id from public.sv_projects p where p.id = v_project_id;

  select u.email into v_email from auth.users u where u.id = p_actor_id;
  if v_email is null then
    raise exception 'sv_signer_email_missing' using errcode = 'P0001';
  end if;

  select o.signatory_name, o.signatory_role into v_name, v_role
  from public.sv_client_onboarding o
  where o.client_id = v_client_id;

  select (e.payload::jsonb) ->> 'version' into v_consent_version
  from public.sv_signature_events e
  where e.document_id = p_document_id
    and e.event_type = 'consent_given'
    and e.actor_id = p_actor_id
  order by e.seq desc
  limit 1;
  if v_consent_version is null then
    raise exception 'sv_consent_missing' using errcode = 'P0001';
  end if;

  select d.doc_type into v_type from public.sv_project_documents d where d.id = p_document_id;
  if v_type = 'acceptance' then
    select s.id, s.refused_count into v_submission_id, v_submission_refused
    from public.sv_acceptance_submissions s
    where s.document_id = p_document_id
    order by s.created_at desc, s.id desc
    limit 1;
    if v_submission_id is null then
      raise exception 'sv_acceptance_missing' using errcode = 'P0001';
    end if;
    if v_submission_refused > 0 then
      raise exception 'sv_acceptance_refused' using errcode = 'P0001';
    end if;
  end if;

  update public.sv_signature_codes c
  set consumed_at = now()
  where c.id = v_code.id;

  v_event := sv_private.append_signature_event(
    p_document_id, 'signed', 'client', p_actor_id, p_ip,
    jsonb_build_object(
      'codeId', v_code.id,
      'consentVersion', v_consent_version,
      'signerName', v_name,
      'signerRole', v_role,
      'signerEmail', v_email,
      'acceptanceSubmissionId', v_submission_id
    )::text
  );

  insert into public.sv_document_signatures (
    document_id, project_id, signer_user_id, signer_email, signer_name, signer_role, ip,
    consent_version, acceptance_submission_id, code_id,
    signed_event_seq, signed_link_hash, signed_at, signed_at_utc
  ) values (
    p_document_id, v_project_id, p_actor_id, v_email, v_name, v_role, v_event.ip,
    v_consent_version, v_submission_id, v_code.id,
    v_event.seq, v_event.link_hash, v_event.occurred_at, v_event.occurred_at_utc
  );

  return jsonb_build_object(
    'ok', true,
    'already_signed', false,
    'signed_at_utc', v_event.occurred_at_utc,
    'link_hash', v_event.link_hash
  );
end;
$$;
revoke all on function public.sv_verify_signature_code(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.sv_verify_signature_code(uuid, uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Scellement : scelle, maillon, fait projet et outbox dans UNE transaction (D-16)
-- ---------------------------------------------------------------------------

create or replace function public.sv_seal_document(
  p_document_id uuid,
  p_storage_path text,
  p_sha256 text,
  p_size integer,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_client_id uuid;
  v_doc public.sv_project_documents%rowtype;
  v_sig public.sv_document_signatures%rowtype;
  v_seal_id uuid;
  v_fact jsonb;
  v_fact_type text;
  v_label text;
  v_title text;
  v_client_name text;
  v_reserved integer := 0;
  v_admin text := lower(nullif(btrim(coalesce(p_admin_email, '')), ''));
  v_email text;
  v_payload jsonb;
  v_outbox_id uuid;
  v_ids uuid[] := '{}';
begin
  v_project_id := sv_private.lock_document_project(p_document_id);

  select * into v_doc from public.sv_project_documents d where d.id = p_document_id;

  select * into v_sig from public.sv_document_signatures s where s.document_id = p_document_id;
  if not found then
    raise exception 'sv_signature_missing' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.sv_document_seals z where z.document_id = p_document_id) then
    raise exception 'sv_already_sealed' using errcode = 'P0001';
  end if;

  if p_storage_path is null or p_storage_path !~ ('^' || v_project_id::text || '/sealed/[0-9a-f-]{36}\.pdf$') then
    raise exception 'sv_invalid_path' using errcode = 'P0001';
  end if;
  if v_admin is null then
    raise exception 'sv_invalid_admin_email' using errcode = 'P0001';
  end if;

  insert into public.sv_document_seals (document_id, storage_path, sha256, size_bytes)
  values (p_document_id, p_storage_path, p_sha256, p_size)
  returning id into v_seal_id;

  perform sv_private.append_signature_event(
    p_document_id, 'sealed', 'system', null, null,
    jsonb_build_object('sealSha256', p_sha256, 'sizeBytes', p_size, 'originalSha256', v_doc.sha256)::text
  );

  v_fact_type := case v_doc.doc_type
    when 'quote' then 'quote_accepted'
    when 'contract' then 'contract_signed'
    when 'acceptance' then 'acceptance_signed'
  end;
  v_label := case v_doc.doc_type
    when 'quote' then 'le devis'
    when 'contract' then 'le contrat'
    when 'acceptance' then 'le procès-verbal de recette'
  end;
  if v_fact_type is null then
    raise exception 'sv_document_not_signable' using errcode = 'P0001';
  end if;

  v_fact := public.sv_post_project_fact(v_project_id, v_fact_type, 'client', v_sig.signer_user_id, null, v_doc.reference);

  select p.title, p.client_id, c.name into v_title, v_client_id, v_client_name
  from public.sv_projects p
  join public.sv_clients c on c.id = p.client_id
  where p.id = v_project_id;

  if v_sig.acceptance_submission_id is not null then
    select s.reserved_count into v_reserved
    from public.sv_acceptance_submissions s
    where s.id = v_sig.acceptance_submission_id;
  end if;

  v_payload := jsonb_build_object(
    'documentLabel', v_label,
    'projectTitle', v_title,
    'clientName', v_client_name,
    'reference', v_doc.reference,
    'signedDate', to_char(v_sig.signed_at at time zone 'Europe/Paris', 'DD/MM/YYYY'),
    'signedTime', to_char(v_sig.signed_at at time zone 'Europe/Paris', 'HH24:MI'),
    'reservedCount', coalesce(v_reserved, 0)
  );

  for v_email in
    select distinct lower(m.invited_email)
    from public.sv_client_members m
    where m.client_id = v_client_id
  loop
    v_outbox_id := null;
    insert into public.sv_mail_outbox (
      event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id
    ) values (
      'document_signed', 'document_signed', v_email, 'client',
      'document_signed:' || p_document_id::text || ':' || lower(v_email),
      v_payload, v_client_id, v_project_id
    )
    on conflict (dedupe_key) do nothing
    returning id into v_outbox_id;
    if v_outbox_id is not null then
      v_ids := v_ids || v_outbox_id;
    end if;
  end loop;

  v_outbox_id := null;
  insert into public.sv_mail_outbox (
    event_type, template, recipient_email, recipient_kind, dedupe_key, payload, client_id, project_id
  ) values (
    'document_signed_admin', 'document_signed_admin', v_admin, 'admin',
    'document_signed_admin:' || p_document_id::text,
    v_payload, v_client_id, v_project_id
  )
  on conflict (dedupe_key) do nothing
  returning id into v_outbox_id;
  if v_outbox_id is not null then
    v_ids := v_ids || v_outbox_id;
  end if;

  return jsonb_build_object(
    'seal_id', v_seal_id,
    'fact_id', v_fact -> 'fact_id',
    'fact_changed', v_fact -> 'changed',
    'outbox_ids', to_jsonb(v_ids)
  );
end;
$$;
revoke all on function public.sv_seal_document(uuid, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.sv_seal_document(uuid, text, text, integer, text) to service_role;

-- ---------------------------------------------------------------------------
-- Garde document signe (D-17, ferme 13-REVIEW WR-08) : meme signature a 14 arguments que
-- la phase 13, corps identique plus le refus de remplacer un document signe.
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

  if p_replaces is not null and exists (
    select 1 from public.sv_document_signatures s where s.document_id = p_replaces
  ) then
    raise exception 'sv_document_signed' using errcode = 'P0001';
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
