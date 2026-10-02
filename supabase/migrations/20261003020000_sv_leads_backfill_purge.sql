-- supabase/migrations/20261003020000_sv_leads_backfill_purge.sql
--
-- Sèvalys — Phase 11 (Lead attribution pipeline) — LEAD-06, D-16.
-- NOT applied by plan 11-05: application happens on the branch in 11-10, prod in 11-17.
--
-- TABLE DE RÉTENTION UNIQUE (résout le blocage STATE.md "table de rétention unique")
-- ----------------------------------------------------------------------------------
-- Donnée                                   | Durée                 | Mécanisme
-- Contacts PII d'un lead non converti      | 12 mois après         | tombstone (sv_erase_lead) par
--                                          | last_contact_at       | sv_private.purge_leads, cron
-- Lead converti ou statut 'signed'         | épargné               | converted_client_id / status
-- Fenêtre de dédoublonnage                 | 9 mois glissants (A4) | sv_ingest_lead
-- sv_leads + sv_lead_events (sans PII)     | indéfinie             | aucune purge
-- Documents comptables                     | 10 ans                | jamais référencés ici (phases ultérieures)
-- sv_visit_counts                          | 25 mois               | purge_leads
-- sv_consent_log                           | 25 mois (A6)          | purge_leads
-- Cookie de consentement                   | 13 mois               | navigateur
-- Cookies d'attribution                    | 30 jours              | navigateur
-- Table gelée public.prospects             | 12 mois (règle héritée)| purge_leads
--
-- Rétro-remplissage : une ligne sv_leads par ligne prospects (pas de fusion), source_kind
-- 'legacy', dates d'origine conservées. Fonction relançable (plan 11-18 la rejoue après le
-- déploiement pour rattraper les lignes écrites par l'ancien code). prospects n'est pas
-- supprimée.

create or replace function sv_private.backfill_legacy_prospects()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_lead_id uuid;
  v_phone text;
  v_count integer := 0;
begin
  for r in
    select p.*
    from public.prospects p
    where not exists (
      select 1 from public.sv_leads l where l.legacy_prospect_id = p.id
    )
    order by p.created_at
  loop
    -- Équivalent SQL de normalisePhone.
    v_phone := regexp_replace(coalesce(r.telephone, ''), '[^0-9+]', '', 'g');
    if v_phone like '00%' then
      v_phone := '+' || substr(v_phone, 3);
    elsif v_phone ~ '^0[0-9]{9}$' then
      v_phone := '+33' || substr(v_phone, 2);
    end if;
    if v_phone !~ '^\+?[0-9]{6,15}$' then
      v_phone := null;
    end if;

    insert into public.sv_leads (
      source_kind, source_source, source_medium, channel,
      created_at, last_contact_at, legacy_prospect_id
    ) values (
      'legacy', 'legacy', '(none)', 'simulateur',
      r.created_at, r.created_at, r.id
    )
    on conflict (legacy_prospect_id) do nothing
    returning id into v_lead_id;

    if v_lead_id is null then
      continue;
    end if;

    insert into public.sv_lead_contacts (
      lead_id, channel, nom, email, telephone, email_norm, phone_norm,
      payload, consent_rgpd, ip_hash, created_at
    ) values (
      v_lead_id, 'simulateur', r.nom, r.email, r.telephone,
      lower(trim(r.email)), v_phone,
      jsonb_build_object(
        'reponsesDiagnostic', r.reponses_diagnostic,
        'servicesRecommandes', r.services_recommandes
      ),
      r.consentement_rgpd, r.ip_hash, r.created_at
    );

    insert into public.sv_lead_events (lead_id, type, actor, channel, detail, created_at)
    values (v_lead_id, 'lead_created', 'system', 'simulateur',
      jsonb_build_object('legacy', true), r.created_at);

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function sv_private.backfill_legacy_prospects() from public, anon, authenticated;

select sv_private.backfill_legacy_prospects();

-- ---------------------------------------------------------------------------
-- Purge de rétention
-- ---------------------------------------------------------------------------

create or replace function sv_private.purge_leads()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_erased integer := 0;
  v_visits integer := 0;
  v_consent integer := 0;
  v_prospects integer := 0;
begin
  for r in
    select id from public.sv_leads
    where erased_at is null
      and converted_client_id is null
      and status <> 'signed'
      and last_contact_at < now() - interval '12 months'
  loop
    perform public.sv_erase_lead(r.id, 'system', 'fin_conservation');
    v_erased := v_erased + 1;
  end loop;

  delete from public.sv_visit_counts where day < (now() - interval '25 months')::date;
  get diagnostics v_visits = row_count;

  delete from public.sv_consent_log where created_at < now() - interval '25 months';
  get diagnostics v_consent = row_count;

  delete from public.prospects where created_at < now() - interval '12 months';
  get diagnostics v_prospects = row_count;

  return jsonb_build_object(
    'erased', v_erased,
    'visits_deleted', v_visits,
    'consent_deleted', v_consent,
    'prospects_deleted', v_prospects
  );
end;
$$;
revoke all on function sv_private.purge_leads() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Remplacement du job cron
-- ---------------------------------------------------------------------------

select cron.unschedule(jobid) from cron.job where jobname = 'purge-prospects-12mo';

select cron.schedule(
  'sv-purge-leads',
  '0 3 * * *',
  $$ select sv_private.purge_leads() $$
);
