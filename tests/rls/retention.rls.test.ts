import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { backdateLead, cleanup, makeClient, makeLeadViaRpc, svc } from './helpers';

afterAll(cleanup);

/**
 * Owner-rights SQL on the throwaway branch through the Supabase CLI. Single statement,
 * no double quotes. Never include the exception message: it echoes the DB URL.
 */
function runSql(sql: string): Record<string, any>[] {
  const dbUrl = process.env.SV_TEST_DB_URL as string;
  expect(dbUrl, 'SV_TEST_DB_URL required').toBeTruthy();
  expect(dbUrl).not.toContain('ubxllsvanurkwkohzxau');
  let out = '';
  try {
    out = execFileSync(
      'supabase',
      ['db', 'query', '--db-url', `"${dbUrl}"`, '--output-format', 'json', `"${sql}"`],
      { encoding: 'utf8', stdio: 'pipe', shell: true },
    );
  } catch (e: any) {
    throw new Error(`runSql failed: ${`${e.stdout ?? ''}${e.stderr ?? ''}`.replace(dbUrl, '<db-url>').slice(0, 500)}`);
  }
  const start = out.indexOf('{');
  const end = out.lastIndexOf('}');
  if (start < 0 || end < start) return [];
  const parsed = JSON.parse(out.slice(start, end + 1));
  return (parsed.rows ?? []) as Record<string, any>[];
}

async function getLead(id: string) {
  const { data, error } = await svc().from('sv_leads').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as Record<string, any>;
}

describe('LEAD-06 backfill', () => {
  it('is idempotent: a re-run inserts nothing, a new prospect is picked up once', async () => {
    expect(runSql('select sv_private.backfill_legacy_prospects() as n')[0].n).toBe(0);

    const tag = randomUUID();
    runSql(
      `insert into public.prospects (nom, email, telephone, reponses_diagnostic, services_recommandes, consentement_rgpd) values ('RLS backfill', 'rls-backfill-${tag}@example.test', '0612345678', '{}'::jsonb, '[]'::jsonb, true)`,
    );
    expect(runSql('select sv_private.backfill_legacy_prospects() as n')[0].n).toBe(1);
    expect(runSql('select sv_private.backfill_legacy_prospects() as n')[0].n).toBe(0);

    const { data } = await svc().from('sv_lead_contacts').select('lead_id').eq('email_norm', `rls-backfill-${tag}@example.test`);
    expect(data).toHaveLength(1);
    const lead = await getLead(data![0].lead_id);
    expect(lead.source_kind).toBe('legacy');
  });
});

describe('LEAD-06 purge', () => {
  it('tombstones an old non-converted lead, spares signed and converted, purges old counters and consent rows', async () => {
    const a = await makeLeadViaRpc();
    await backdateLead(a.lead_id, 13);

    const b = await makeLeadViaRpc();
    const signed = await svc().rpc('sv_set_lead_status', {
      p_lead_id: b.lead_id,
      p_status: 'signed',
      p_actor: null,
      p_lost_reason: null,
      p_note: null,
    });
    expect(signed.error).toBeNull();
    expect((await getLead(b.lead_id)).status).toBe('signed');
    await backdateLead(b.lead_id, 13);

    const c = await makeLeadViaRpc();
    const client = await makeClient('RLS Purge Client');
    const upd = await svc().from('sv_leads').update({ converted_client_id: client.id }).eq('id', c.lead_id);
    expect(upd.error).toBeNull();
    await backdateLead(c.lead_id, 13);

    const eventsBefore = await svc().from('sv_lead_events').select('id').eq('lead_id', a.lead_id);

    const oldSource = `rls-old-${randomUUID()}`;
    runSql(
      `insert into public.sv_visit_counts (day, source, medium, campaign, landing, visits) values ((now() - interval '26 months')::date, '${oldSource}', 'cpc', '', '/', 5)`,
    );
    const consentTag = randomUUID();
    runSql(
      `insert into public.sv_consent_log (anon_id, choice, version, locale, ip_hash, created_at) values ('${consentTag}', 'accepted', '2026-10-v1', 'fr', 'rls-old', now() - interval '26 months')`,
    );

    const res = runSql('select sv_private.purge_leads() as r')[0].r;
    expect(res.erased).toBeGreaterThanOrEqual(1);

    const la = await getLead(a.lead_id);
    expect(la.erased_at).not.toBeNull();
    const contactsA = await svc().from('sv_lead_contacts').select('id').eq('lead_id', a.lead_id);
    expect(contactsA.data).toHaveLength(0);

    expect((await getLead(b.lead_id)).erased_at).toBeNull();
    expect((await getLead(c.lead_id)).erased_at).toBeNull();
    const contactsB = await svc().from('sv_lead_contacts').select('id').eq('lead_id', b.lead_id);
    expect((contactsB.data ?? []).length).toBeGreaterThanOrEqual(1);

    const visits = await svc().from('sv_visit_counts').select('source').eq('source', oldSource);
    expect(visits.data).toHaveLength(0);
    const consent = await svc().from('sv_consent_log').select('id').eq('anon_id', consentTag);
    expect(consent.data).toHaveLength(0);

    const eventsAfter = await svc().from('sv_lead_events').select('id').eq('lead_id', a.lead_id);
    expect((eventsAfter.data ?? []).length).toBeGreaterThanOrEqual((eventsBefore.data ?? []).length);
    expect((eventsAfter.data ?? []).length).toBeGreaterThan(0);
  });
});
