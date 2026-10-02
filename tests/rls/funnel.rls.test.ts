import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  anonClient,
  cleanup,
  makeAdmin,
  makeGeckoAdmin,
  makeLeadViaRpc,
  makeUser,
  svc,
  uniqueEmail,
  type TestUser,
} from './helpers';

let adminUser: TestUser;
let plainUser: TestUser;
let geckoUser: TestUser;

beforeAll(async () => {
  adminUser = await makeUser('funneladmin');
  await makeAdmin(adminUser);
  plainUser = await makeUser('funnelplain');
  geckoUser = await makeUser('funnelgecko');
  await makeGeckoAdmin(geckoUser);
});

afterAll(cleanup);

const monthStart = () => {
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

describe('LEAD-08 funnel view', () => {
  it('counts every stage per source/campaign/month, survives erasure, shows cost per RDV', async () => {
    const source = `rls-src-${randomUUID()}`;
    const campaign = 'c1';
    const month = monthStart();
    const touch = { source, medium: 'cpc', campaign, kind: 'touch' };

    for (let i = 0; i < 3; i++) {
      const r = await svc().rpc('sv_record_visit', {
        p_source: source,
        p_medium: 'cpc',
        p_campaign: campaign,
        p_landing: '/',
      });
      expect(r.error).toBeNull();
    }

    const emailA = uniqueEmail('funnelA');
    const a = await makeLeadViaRpc({ p_email: emailA, p_email_norm: emailA, p_channel: 'simulateur', p_source: touch });
    const b = await makeLeadViaRpc({ p_channel: 'contact', p_source: touch });
    const back = await makeLeadViaRpc({ p_email: emailA, p_email_norm: emailA, p_channel: 'simulateur', p_source: touch });
    expect(back.lead_id).toBe(a.lead_id);

    const setStatus = (id: string, status: string) =>
      svc().rpc('sv_set_lead_status', {
        p_lead_id: id,
        p_status: status,
        p_actor: adminUser.id,
        p_lost_reason: null,
        p_note: null,
      });
    expect((await setStatus(a.lead_id, 'rdv')).error).toBeNull();
    expect((await setStatus(b.lead_id, 'signed')).error).toBeNull();

    const cost = await svc().rpc('sv_upsert_acquisition_cost', {
      p_source: source,
      p_campaign: campaign,
      p_month: month,
      p_cents: 4500,
      p_actor: adminUser.id,
    });
    expect(cost.error).toBeNull();

    const readRow = async () => {
      const { data, error } = await adminUser.client
        .from('sv_funnel_v')
        .select('*')
        .eq('source', source)
        .eq('campaign', campaign)
        .eq('month', month);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      return data![0];
    };

    const expected = {
      visits: 3,
      simulations: 2,
      leads: 2,
      qualified: 2,
      rdv: 2,
      signed: 1,
      cost_per_rdv_cents: 4500,
    };
    expect(await readRow()).toMatchObject(expected);

    const er = await svc().rpc('sv_erase_lead', {
      p_lead_id: b.lead_id,
      p_actor: adminUser.id,
      p_reason_code: 'demande_personne',
    });
    expect(er.error).toBeNull();
    expect(await readRow()).toMatchObject(expected);

    const adminRows = await adminUser.client.from('sv_funnel_v').select('source').eq('source', source);
    expect((adminRows.data ?? []).length).toBe(1);
  });

  it('anon, plain authenticated and Gecko admin see no funnel rows', async () => {
    const readers: [string, any][] = [
      ['anon', anonClient()],
      ['plain', plainUser.client],
      ['gecko', geckoUser.client],
    ];
    for (const [label, c] of readers) {
      const { data } = await c.from('sv_funnel_v').select('*').limit(5);
      expect(data ?? [], label).toEqual([]);
    }
  });
});
