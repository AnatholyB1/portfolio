import { execFileSync } from 'node:child_process';
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
  svc,
  type TestUser,
} from './helpers';

let adminUser: TestUser;
let userA: TestUser;
let userB: TestUser;
let geckoUser: TestUser;
let projectA: string;

async function consent(granted: boolean) {
  const r = await svc()
    .from('sv_project_consents')
    .insert({
      project_id: projectA,
      granted,
      text_version: 'v1',
      text_snapshot: 'Je consens a la publication de ma realisation.',
      actor_id: userA.id,
    })
    .select('id')
    .single();
  if (r.error) throw new Error(r.error.message);
  return r.data.id as number;
}

beforeAll(async () => {
  adminUser = await makeUser('consadmin');
  await makeAdmin(adminUser);
  userA = await makeUser('consa');
  userB = await makeUser('consb');
  geckoUser = await makeUser('consgecko');
  await makeGeckoAdmin(geckoUser);
  const a = await makeClient('RLS Consents A');
  const b = await makeClient('RLS Consents B');
  await addMember(a.id, userA);
  await addMember(b.id, userB);
  projectA = await makeProject(a.id, { title: 'Projet consent' });
});

afterAll(cleanup);

describe('consent journal', () => {
  it('client A reads grant and revoke; the latest row says granted=false', async () => {
    await consent(true);
    await consent(false);
    const r = await userA.client
      .from('sv_project_consents')
      .select('id, granted')
      .eq('project_id', projectA)
      .order('id', { ascending: true });
    expect(r.error).toBeNull();
    expect(r.data!.length).toBeGreaterThanOrEqual(2);
    expect(r.data![r.data!.length - 1].granted).toBe(false);
  });

  it('admin reads the journal; B, anon and Gecko read none', async () => {
    const a = await adminUser.client.from('sv_project_consents').select('id').eq('project_id', projectA);
    expect(a.data!.length).toBeGreaterThanOrEqual(2);
    for (const [label, c] of [
      ['b', userB.client],
      ['anon', anonClient()],
      ['gecko', geckoUser.client],
    ] as [string, any][]) {
      const r = await c.from('sv_project_consents').select('id').eq('project_id', projectA);
      expect((r.data ?? []).length, label).toBe(0);
    }
  });

  it('service_role update and delete fail with sv_immutable_table', async () => {
    const id = await consent(true);
    const upd = await svc().from('sv_project_consents').update({ granted: false }).eq('id', id);
    expect(upd.error?.message).toMatch(/sv_immutable_table|permission denied/);
    const del = await svc().from('sv_project_consents').delete().eq('id', id);
    expect(del.error?.message).toMatch(/sv_immutable_table|permission denied/);
  });

  it('a client cannot insert, update or delete consents', async () => {
    const ins = await userA.client
      .from('sv_project_consents')
      .insert({ project_id: projectA, granted: true, text_version: 'v1', text_snapshot: 'forged', actor_id: userA.id })
      .select();
    expect(ins.error !== null || (ins.data ?? []).length === 0).toBe(true);
    const upd = await userA.client.from('sv_project_consents').update({ granted: true }).eq('project_id', projectA).select();
    expect(upd.error !== null || (upd.data ?? []).length === 0).toBe(true);
    const del = await userA.client.from('sv_project_consents').delete().eq('project_id', projectA).select();
    expect(del.error !== null || (del.data ?? []).length === 0).toBe(true);
    const rows = await svc().from('sv_project_consents').select('text_snapshot').eq('project_id', projectA);
    expect(rows.data!.some((r) => r.text_snapshot === 'forged')).toBe(false);
  });

  it('TRUNCATE on sv_project_consents is denied', () => {
    const dbUrl = process.env.SV_TEST_DB_URL;
    expect(dbUrl, 'SV_TEST_DB_URL required for the truncate check').toBeTruthy();
    expect(dbUrl).not.toContain('ubxllsvanurkwkohzxau');
    let out = '';
    let failed = false;
    try {
      out = execFileSync('supabase', ['db', 'query', '--db-url', `"${dbUrl}"`, '"truncate public.sv_project_consents"'], {
        encoding: 'utf8',
        stdio: 'pipe',
        shell: true,
      });
    } catch (e: any) {
      failed = true;
      out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    }
    expect(out).toMatch(/sv_immutable_table|cannot truncate a table referenced in a foreign key/);
    expect(failed || out.includes('Error') || out.includes('error')).toBe(true);
  });
});
