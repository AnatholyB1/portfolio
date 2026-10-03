import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addMember,
  anonClient,
  cleanup,
  makeAdmin,
  makeClient,
  makeGeckoAdmin,
  makeProject,
  makeUser,
  postFact,
  svc,
  type TestUser,
} from './helpers';

let adminUser: TestUser;
let userA: TestUser;
let userB: TestUser;
let plainUser: TestUser;
let geckoUser: TestUser;
let clientA: { id: string };
let clientB: { id: string };
let projectA: string;
let projectB: string;
let factA: number;

const PHASE12_TABLES = [
  'sv_projects',
  'sv_project_facts',
  'sv_project_fact_notes',
  'sv_client_onboarding',
  'sv_project_files',
  'sv_project_links',
  'sv_project_consents',
  'sv_mail_outbox',
];

beforeAll(async () => {
  adminUser = await makeUser('projadmin');
  await makeAdmin(adminUser);
  userA = await makeUser('proja');
  userB = await makeUser('projb');
  plainUser = await makeUser('projplain');
  geckoUser = await makeUser('projgecko');
  await makeGeckoAdmin(geckoUser);

  clientA = await makeClient('RLS Projects A');
  clientB = await makeClient('RLS Projects B');
  await addMember(clientA.id, userA);
  await addMember(clientB.id, userB);

  projectA = await makeProject(clientA.id, { title: 'Projet A' });
  projectB = await makeProject(clientB.id, { title: 'Projet B' });

  const onb = await svc()
    .from('sv_client_onboarding')
    .upsert([
      { client_id: clientA.id, project_goal: 'Goal A' },
      { client_id: clientB.id, project_goal: 'Goal B' },
    ]);
  if (onb.error) throw new Error(onb.error.message);
  for (const projectId of [projectA, projectB]) {
    const l = await svc().from('sv_project_links').insert({ project_id: projectId, title: 'Lien', url: 'https://example.test/x' });
    if (l.error) throw new Error(l.error.message);
  }
  factA = (await postFact(projectA, 'quote_accepted', { actorKind: 'admin', actorId: adminUser.id, reason: 'note interne' }))
    .fact_id;
});

afterAll(cleanup);

describe('client A reads its own phase-12 data', () => {
  it('reads its project, onboarding, links and facts', async () => {
    const p = await userA.client.from('sv_projects').select('id').eq('id', projectA);
    expect(p.data).toHaveLength(1);
    const o = await userA.client.from('sv_client_onboarding').select('client_id').eq('client_id', clientA.id);
    expect(o.data).toHaveLength(1);
    const l = await userA.client.from('sv_project_links').select('id').eq('project_id', projectA);
    expect(l.data).toHaveLength(1);
    const f = await userA.client.from('sv_project_facts').select('id, type').eq('project_id', projectA);
    expect(f.data).toHaveLength(1);
  });

  it('does not see client B rows', async () => {
    expect((await userA.client.from('sv_projects').select('id').eq('id', projectB)).data).toHaveLength(0);
    expect(
      (await userA.client.from('sv_client_onboarding').select('client_id').eq('client_id', clientB.id)).data,
    ).toHaveLength(0);
    expect((await userA.client.from('sv_project_links').select('id').eq('project_id', projectB)).data).toHaveLength(0);
  });
});

describe('everyone else reads none of client A data', () => {
  it('client B, plain user, Gecko admin and anon read nothing', async () => {
    const readers: [string, any][] = [
      ['b', userB.client],
      ['plain', plainUser.client],
      ['gecko', geckoUser.client],
      ['anon', anonClient()],
    ];
    for (const [label, c] of readers) {
      const p = await c.from('sv_projects').select('id').eq('id', projectA);
      expect((p.data ?? []).length, `${label} projects`).toBe(0);
      const o = await c.from('sv_client_onboarding').select('client_id').eq('client_id', clientA.id);
      expect((o.data ?? []).length, `${label} onboarding`).toBe(0);
      const l = await c.from('sv_project_links').select('id').eq('project_id', projectA);
      expect((l.data ?? []).length, `${label} links`).toBe(0);
      const f = await c.from('sv_project_facts').select('id').eq('project_id', projectA);
      expect((f.data ?? []).length, `${label} facts`).toBe(0);
      const fl = await c.from('sv_project_files').select('id').eq('project_id', projectA);
      expect((fl.data ?? []).length, `${label} files`).toBe(0);
    }
  });

  it('an admin reads A and B', async () => {
    const p = await adminUser.client.from('sv_projects').select('id').in('id', [projectA, projectB]);
    expect(p.data).toHaveLength(2);
    const o = await adminUser.client.from('sv_client_onboarding').select('client_id').in('client_id', [clientA.id, clientB.id]);
    expect(o.data).toHaveLength(2);
    const l = await adminUser.client.from('sv_project_links').select('id').in('project_id', [projectA, projectB]);
    expect(l.data).toHaveLength(2);
  });
});

describe('client column and table restrictions', () => {
  it('a client cannot select actor_id from sv_project_facts', async () => {
    const r = await userA.client.from('sv_project_facts').select('actor_id').eq('project_id', projectA);
    expect(r.error !== null || (r.data ?? []).every((row: any) => row.actor_id === undefined)).toBe(true);
    expect(r.error).not.toBeNull();
    const star = await userA.client.from('sv_project_facts').select('*').eq('project_id', projectA);
    expect(star.error !== null || (star.data ?? []).every((row: any) => !('actor_id' in row))).toBe(true);
  });

  it('a client reads nothing from sv_project_fact_notes and sv_mail_outbox', async () => {
    const n = await userA.client.from('sv_project_fact_notes').select('*');
    expect((n.data ?? []).length).toBe(0);
    const m = await userA.client.from('sv_mail_outbox').select('*');
    expect((m.data ?? []).length).toBe(0);
  });

  it('an admin reads the fact notes', async () => {
    const n = await adminUser.client.from('sv_project_fact_notes').select('body').eq('fact_id', factA);
    expect(n.data).toHaveLength(1);
    expect(n.data![0].body).toBe('note interne');
  });

  it('a client cannot write any phase-12 table', async () => {
    const ins = await userA.client
      .from('sv_projects')
      .insert({ client_id: clientA.id, title: 'forged', offer: 'branding' })
      .select();
    expect(ins.error !== null || (ins.data ?? []).length === 0).toBe(true);

    const upd = await userA.client
      .from('sv_client_onboarding')
      .update({ project_goal: 'forged' })
      .eq('client_id', clientA.id)
      .select();
    expect(upd.error !== null || (upd.data ?? []).length === 0).toBe(true);

    const del = await userA.client.from('sv_project_links').delete().eq('project_id', projectA).select();
    expect(del.error !== null || (del.data ?? []).length === 0).toBe(true);

    for (const t of PHASE12_TABLES) {
      const i = await userA.client.from(t).insert({}).select();
      expect(i.error !== null || (i.data ?? []).length === 0, `insert ${t}`).toBe(true);
      const u = await userA.client.from(t).update({ created_at: new Date().toISOString() }).neq('created_at', '1970-01-01').select();
      expect(u.error !== null || (u.data ?? []).length === 0, `update ${t}`).toBe(true);
      const d = await userA.client.from(t).delete().neq('created_at', '1970-01-01').select();
      expect(d.error !== null || (d.data ?? []).length === 0, `delete ${t}`).toBe(true);
    }

    const { data } = await svc().from('sv_project_links').select('id').eq('project_id', projectA);
    expect(data).toHaveLength(1);
    const onb = await svc().from('sv_client_onboarding').select('project_goal').eq('client_id', clientA.id).single();
    expect(onb.data?.project_goal).toBe('Goal A');
  });

  it('authenticated users cannot execute the service RPCs', async () => {
    const calls: [string, object][] = [
      [
        'sv_post_project_fact',
        { p_project_id: projectA, p_type: 'contract_signed', p_actor_kind: 'system', p_actor_id: null, p_target_fact_id: null, p_reason: null },
      ],
      [
        'sv_convert_lead',
        {
          p_lead_id: projectA,
          p_actor: null,
          p_user_id: userA.id,
          p_email: 'x@example.test',
          p_name: 'X',
          p_siret: '12345678901234',
          p_company: {},
          p_company_source: 'api',
          p_project_title: 'x',
          p_offer: 'branding',
        },
      ],
      ['sv_claim_due_mail', { p_limit: 1 }],
      ['sv_client_last_sign_in', { p_client_ids: [clientA.id] }],
    ];
    for (const c of [userA.client, adminUser.client, anonClient()]) {
      for (const [fn, args] of calls) {
        const r = await c.rpc(fn, args);
        expect(r.error, fn).not.toBeNull();
      }
    }
    const facts = await svc().from('sv_project_facts').select('id').eq('project_id', projectA).eq('type', 'contract_signed');
    expect(facts.data).toHaveLength(0);
  });
});
