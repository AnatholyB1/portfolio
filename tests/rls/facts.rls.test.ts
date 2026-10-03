import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, makeClient, makeProject, makeUser, postFact, svc, type TestUser } from './helpers';

let admin: TestUser;
let clientId: string;

async function factRows(projectId: string, type?: string) {
  let q = svc().from('sv_project_facts').select('*').eq('project_id', projectId).order('id', { ascending: true });
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, any>[];
}

async function newProject() {
  return makeProject(clientId, { title: 'Projet faits' });
}

async function revoke(projectId: string, target: number | null, reason: string | null) {
  return svc().rpc('sv_post_project_fact', {
    p_project_id: projectId,
    p_type: 'fact_revoked',
    p_actor_kind: 'admin',
    p_actor_id: admin.id,
    p_target_fact_id: target,
    p_reason: reason,
  });
}

beforeAll(async () => {
  admin = await makeUser('factadmin');
  clientId = (await makeClient('RLS Facts Client')).id;
});

afterAll(cleanup);

describe('fact idempotence', () => {
  it('posting an effective fact twice returns changed=false and keeps one row', async () => {
    const p = await newProject();
    const first = await postFact(p, 'quote_accepted', { actorKind: 'admin', actorId: admin.id });
    expect(first.changed).toBe(true);
    const second = await postFact(p, 'quote_accepted', { actorKind: 'admin', actorId: admin.id });
    expect(second.changed).toBe(false);
    expect(await factRows(p, 'quote_accepted')).toHaveLength(1);
  });

  it('two concurrent posts of the same fact create exactly one row', async () => {
    const p = await newProject();
    const [a, b] = await Promise.all([postFact(p, 'production_completed'), postFact(p, 'production_completed')]);
    expect([a.changed, b.changed].filter(Boolean)).toHaveLength(1);
    expect(await factRows(p, 'production_completed')).toHaveLength(1);
  });
});

describe('revocation', () => {
  it('a 9-character reason fails with sv_reason_required, 10 characters passes', async () => {
    const p = await newProject();
    const f = await postFact(p, 'contract_signed', { actorKind: 'admin', actorId: admin.id });
    const short = await revoke(p, f.fact_id, 'neuf cars');
    expect('neuf cars'.length).toBe(9);
    expect(short.error?.message).toContain('sv_reason_required');
    const ok = await revoke(p, f.fact_id, 'trop court');
    expect('trop court'.length).toBe(10);
    expect(ok.error).toBeNull();
    expect(ok.data.changed).toBe(true);
  });

  it('revoking twice fails with sv_fact_already_revoked', async () => {
    const p = await newProject();
    const f = await postFact(p, 'deposit_received', { actorKind: 'admin', actorId: admin.id });
    expect((await revoke(p, f.fact_id, 'erreur de saisie')).error).toBeNull();
    const again = await revoke(p, f.fact_id, 'erreur de saisie bis');
    expect(again.error?.message).toContain('sv_fact_already_revoked');
  });

  it('a target from another project fails with sv_invalid_target', async () => {
    const p1 = await newProject();
    const p2 = await newProject();
    const f = await postFact(p1, 'contract_signed', { actorKind: 'admin', actorId: admin.id });
    const r = await revoke(p2, f.fact_id, 'mauvais projet cible');
    expect(r.error?.message).toContain('sv_invalid_target');
  });

  it('the reason is stored in the notes table, not in the fact row', async () => {
    const p = await newProject();
    const f = await postFact(p, 'acceptance_signed', { actorKind: 'admin', actorId: admin.id });
    const r = await revoke(p, f.fact_id, 'raison detaillee ici');
    const note = await svc().from('sv_project_fact_notes').select('body').eq('fact_id', r.data.fact_id).single();
    expect(note.data?.body).toBe('raison detaillee ici');
  });

  it('after a revocation a re-post of the same type creates a new fact', async () => {
    const p = await newProject();
    const f = await postFact(p, 'balance_received', { actorKind: 'admin', actorId: admin.id });
    expect((await revoke(p, f.fact_id, 'paiement annule')).error).toBeNull();
    const again = await postFact(p, 'balance_received', { actorKind: 'admin', actorId: admin.id });
    expect(again.changed).toBe(true);
    expect(again.fact_id).not.toBe(f.fact_id);
  });
});

describe('actor rules', () => {
  it('onboarding_completed by actor admin fails with sv_invalid_actor', async () => {
    const p = await newProject();
    await expect(postFact(p, 'onboarding_completed', { actorKind: 'admin', actorId: admin.id })).rejects.toThrow(
      /sv_invalid_actor/,
    );
  });

  it('onboarding_completed by system succeeds', async () => {
    const p = await newProject();
    const r = await postFact(p, 'onboarding_completed', { actorKind: 'system' });
    expect(r.changed).toBe(true);
  });
});

describe('immutability', () => {
  it('service_role update and delete on facts and notes fail with sv_immutable_table', async () => {
    const p = await newProject();
    const f = await postFact(p, 'quote_accepted', { actorKind: 'admin', actorId: admin.id, reason: 'une note' });
    const upd = await svc().from('sv_project_facts').update({ actor_kind: 'client' }).eq('id', f.fact_id);
    expect(upd.error?.message).toMatch(/sv_immutable_table|permission denied/);
    const del = await svc().from('sv_project_facts').delete().eq('id', f.fact_id);
    expect(del.error?.message).toMatch(/sv_immutable_table|permission denied/);

    const nupd = await svc().from('sv_project_fact_notes').update({ body: 'hack' }).eq('fact_id', f.fact_id);
    expect(nupd.error?.message).toMatch(/sv_immutable_table|permission denied/);
    const ndel = await svc().from('sv_project_fact_notes').delete().eq('fact_id', f.fact_id);
    expect(ndel.error?.message).toMatch(/sv_immutable_table|permission denied/);

    expect((await factRows(p, 'quote_accepted'))[0].actor_kind).toBe('admin');
  });

  it('authenticated and anon cannot update or delete facts', async () => {
    const p = await newProject();
    const f = await postFact(p, 'contract_signed', { actorKind: 'admin', actorId: admin.id });
    const upd = await admin.client.from('sv_project_facts').update({ actor_kind: 'client' }).eq('id', f.fact_id).select();
    expect(upd.error !== null || (upd.data ?? []).length === 0).toBe(true);
    const del = await admin.client.from('sv_project_facts').delete().eq('id', f.fact_id).select();
    expect(del.error !== null || (del.data ?? []).length === 0).toBe(true);
    expect((await factRows(p, 'contract_signed'))[0].actor_kind).toBe('admin');
  });

  it('TRUNCATE on facts and notes is denied', () => {
    const dbUrl = process.env.SV_TEST_DB_URL;
    expect(dbUrl, 'SV_TEST_DB_URL required for the truncate check').toBeTruthy();
    expect(dbUrl).not.toContain('ubxllsvanurkwkohzxau');
    const sets: Record<string, string> = {
      sv_project_fact_notes: 'public.sv_project_fact_notes',
      sv_project_facts: 'public.sv_project_facts, public.sv_project_fact_notes',
    };
    for (const [table, tableList] of Object.entries(sets)) {
      let out = '';
      let failed = false;
      try {
        out = execFileSync('supabase', ['db', 'query', '--db-url', `"${dbUrl}"`, `"truncate ${tableList}"`], {
          encoding: 'utf8',
          stdio: 'pipe',
          shell: true,
        });
      } catch (e: any) {
        failed = true;
        out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
      }
      expect(out, `${table}: ${out}`).toMatch(/sv_immutable_table|cannot truncate a table referenced in a foreign key/);
      expect(failed || out.includes('Error') || out.includes('error')).toBe(true);
    }
  });
});
