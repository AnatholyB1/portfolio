import { afterAll, describe, expect, it } from 'vitest';
import { cleanup, makeAdmin, makeConvertibleLead, makeLeadViaRpc, makeUser, randomSiret, svc, trackUser } from './helpers';

void trackUser;

interface ConvertResult {
  client_id: string;
  project_id: string;
  client_reused: boolean;
  outbox_id: string | null;
}

async function convert(
  leadId: string,
  user: { id: string; email: string },
  over: Partial<{ siret: string; offer: string; title: string }> = {},
) {
  return svc().rpc('sv_convert_lead', {
    p_lead_id: leadId,
    p_actor: null,
    p_user_id: user.id,
    p_email: user.email,
    p_name: 'Client Converti',
    p_siret: over.siret ?? randomSiret(),
    p_company: { name: 'Client Converti' },
    p_company_source: 'manual',
    p_project_title: over.title ?? 'Projet converti',
    p_offer: over.offer ?? 'site-vitrine',
  });
}

const createdClientIds: string[] = [];

afterAll(async () => {
  // Converted clients carry projects/facts (immutable); cleanup tolerates FK failures.
  for (const id of createdClientIds) await svc().from('sv_clients').delete().eq('id', id);
  await cleanup();
});

describe('D-01..D-05 sv_convert_lead', () => {
  it('converts a qualified lead atomically', async () => {
    const lead = await makeConvertibleLead('qualified');
    const before = (await svc().from('sv_leads').select('*').eq('id', lead.lead_id).single()).data as Record<string, any>;
    const user = await makeUser('conv');
    const { data, error } = await convert(lead.lead_id, user);
    expect(error).toBeNull();
    const r = data as ConvertResult;
    createdClientIds.push(r.client_id);
    expect(r.client_reused).toBe(false);
    expect(r.project_id).toBeTruthy();
    expect(r.outbox_id).toBeTruthy();

    const after = (await svc().from('sv_leads').select('*').eq('id', lead.lead_id).single()).data as Record<string, any>;
    expect(after.converted_client_id).toBe(r.client_id);
    expect(after.status).toBe('qualified');
    for (const k of ['source_source', 'source_medium', 'source_campaign']) expect(after[k]).toBe(before[k]);

    const members = await svc().from('sv_client_members').select('user_id').eq('client_id', r.client_id);
    expect((members.data ?? []).map((m) => m.user_id)).toEqual([user.id]);
    const proj = await svc().from('sv_projects').select('id, lead_id').eq('id', r.project_id).single();
    expect(proj.data?.lead_id).toBe(lead.lead_id);

    const ev = await svc().from('sv_lead_events').select('id').eq('lead_id', lead.lead_id).eq('type', 'lead_converted');
    expect(ev.data).toHaveLength(1);
    const ob = await svc()
      .from('sv_mail_outbox')
      .select('dedupe_key, event_type')
      .eq('dedupe_key', `client_invited:${r.client_id}:${user.email.toLowerCase()}`);
    expect(ob.data).toHaveLength(1);
    expect(ob.data?.[0].event_type).toBe('client_invited');
  });

  it('second conversion fails with sv_lead_already_converted', async () => {
    const lead = await makeConvertibleLead('qualified');
    const user = await makeUser('conv2');
    const first = await convert(lead.lead_id, user);
    expect(first.error).toBeNull();
    createdClientIds.push((first.data as ConvertResult).client_id);
    const second = await convert(lead.lead_id, user);
    expect(second.error?.message).toMatch(/sv_lead_already_converted/);
  });

  it.each(['new', 'lost'])('lead in status %s fails with sv_lead_not_convertible', async (status) => {
    const lead = await makeConvertibleLead('qualified');
    const set = await svc().rpc('sv_set_lead_status', {
      p_lead_id: lead.lead_id,
      p_status: status,
      p_actor: null,
      p_lost_reason: status === 'lost' ? 'autre' : null,
      p_note: null,
    });
    // 'new' may be refused as a backwards transition; then use a fresh lead which is already 'new'.
    const target = set.error && status === 'new' ? (await makeLeadViaRpc()).lead_id : lead.lead_id;
    if (set.error && status !== 'new') throw new Error(set.error.message);
    const user = await makeUser('convnc');
    const res = await convert(target, user);
    expect(res.error?.message).toMatch(/sv_lead_not_convertible/);
  });

  it('existing SIRET reuses the client and adds a second project', async () => {
    const siret = randomSiret();
    const l1 = await makeConvertibleLead('qualified');
    const l2 = await makeConvertibleLead('qualified');
    const u1 = await makeUser('convr1');
    const u2 = await makeUser('convr2');
    const a = await convert(l1.lead_id, u1, { siret });
    expect(a.error).toBeNull();
    const ra = a.data as ConvertResult;
    createdClientIds.push(ra.client_id);
    const b = await convert(l2.lead_id, u2, { siret });
    expect(b.error).toBeNull();
    const rb = b.data as ConvertResult;
    expect(rb.client_reused).toBe(true);
    expect(rb.client_id).toBe(ra.client_id);
    expect(rb.project_id).not.toBe(ra.project_id);
    const projects = await svc().from('sv_projects').select('id').eq('client_id', ra.client_id);
    expect(projects.data).toHaveLength(2);
  });

  it('concurrent conversions of one lead yield exactly one project', async () => {
    const lead = await makeConvertibleLead('qualified');
    const u1 = await makeUser('convc1');
    const u2 = await makeUser('convc2');
    const [a, b] = await Promise.all([convert(lead.lead_id, u1), convert(lead.lead_id, u2)]);
    const oks = [a, b].filter((r) => !r.error);
    const kos = [a, b].filter((r) => r.error);
    expect(oks).toHaveLength(1);
    expect(kos).toHaveLength(1);
    expect(kos[0].error?.message).toMatch(/sv_lead_already_converted/);
    createdClientIds.push((oks[0].data as ConvertResult).client_id);
    const projects = await svc().from('sv_projects').select('id').eq('lead_id', lead.lead_id);
    expect(projects.data).toHaveLength(1);
  });

  it('user who is already an admin fails with sv_role_conflict and rolls back', async () => {
    const lead = await makeConvertibleLead('qualified');
    const adm = await makeUser('convadm');
    await makeAdmin(adm);
    const res = await convert(lead.lead_id, adm);
    expect(res.error?.message).toMatch(/sv_role_conflict/);
    const projects = await svc().from('sv_projects').select('id').eq('lead_id', lead.lead_id);
    expect(projects.data).toHaveLength(0);
    const l = (await svc().from('sv_leads').select('converted_client_id').eq('id', lead.lead_id).single()).data;
    expect(l?.converted_client_id).toBeNull();
  });
});
