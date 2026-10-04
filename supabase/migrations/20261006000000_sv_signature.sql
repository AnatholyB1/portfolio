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
