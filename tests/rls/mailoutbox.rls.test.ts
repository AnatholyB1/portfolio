import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addMember, anonClient, cleanup, makeAdmin, makeClient, makeGeckoAdmin, makeUser, svc, type TestUser } from './helpers';

let adminUser: TestUser;
let userA: TestUser;
let userB: TestUser;
let geckoUser: TestUser;

function row(extra: Record<string, unknown> = {}) {
  return {
    event_type: 'step_changed',
    template: 'step_changed',
    recipient_email: `rls-mail-${randomUUID()}@example.test`,
    recipient_kind: 'client',
    dedupe_key: `rls-test:${randomUUID()}`,
    ...extra,
  };
}

async function insert(extra: Record<string, unknown> = {}) {
  const r = row(extra);
  const { data, error } = await svc().from('sv_mail_outbox').insert(r).select('*').single();
  if (error) throw new Error(error.message);
  return data as Record<string, any>;
}

async function claim(limit = 50) {
  const { data, error } = await svc().rpc('sv_claim_due_mail', { p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, any>[];
}

beforeAll(async () => {
  adminUser = await makeUser('mailadmin');
  await makeAdmin(adminUser);
  userA = await makeUser('mailA');
  userB = await makeUser('mailB');
  geckoUser = await makeUser('mailgecko');
  await makeGeckoAdmin(geckoUser);
  const c = await makeClient('RLS Mail Client');
  await addMember(c.id, userA);
});

afterAll(cleanup);

describe('dedupe_key uniqueness', () => {
  it('upsert with ignoreDuplicates leaves one row; a plain insert violates the unique key', async () => {
    const r = row();
    const first = await svc().from('sv_mail_outbox').insert(r);
    expect(first.error).toBeNull();
    const dup = await svc().from('sv_mail_outbox').upsert(row({ dedupe_key: r.dedupe_key }), {
      onConflict: 'dedupe_key',
      ignoreDuplicates: true,
    });
    expect(dup.error).toBeNull();
    const plain = await svc().from('sv_mail_outbox').insert(row({ dedupe_key: r.dedupe_key }));
    expect(plain.error).not.toBeNull();
    expect(plain.error?.code).toBe('23505');
    const { data } = await svc().from('sv_mail_outbox').select('id').eq('dedupe_key', r.dedupe_key);
    expect(data).toHaveLength(1);
  });
});

describe('sv_claim_due_mail', () => {
  it('claims a due pending row once and skips future send_after rows', async () => {
    const due = await insert();
    const future = await insert({ send_after: new Date(Date.now() + 86_400_000).toISOString() });

    const first = await claim();
    const mine = first.find((r) => r.id === due.id);
    expect(mine).toBeTruthy();
    expect(mine!.status).toBe('sending');
    expect(mine!.attempts).toBe(1);
    expect(first.find((r) => r.id === future.id)).toBeUndefined();

    const second = await claim();
    expect(second.find((r) => r.id === due.id)).toBeUndefined();
    expect(second.find((r) => r.id === future.id)).toBeUndefined();

    const { data } = await svc().from('sv_mail_outbox').select('status, attempts').eq('id', future.id).single();
    expect(data).toEqual({ status: 'pending', attempts: 0 });
  });

  it('does not claim a failed row that reached 3 attempts', async () => {
    const exhausted = await insert({ status: 'failed', attempts: 3, last_error: 'smtp' });
    const retryable = await insert({ status: 'failed', attempts: 1, last_error: 'smtp' });
    const claimed = await claim();
    expect(claimed.find((r) => r.id === exhausted.id)).toBeUndefined();
    expect(claimed.find((r) => r.id === retryable.id)?.attempts).toBe(2);
  });
});

describe('outbox read access', () => {
  it('only an admin reads the outbox', async () => {
    const r = await insert();
    const a = await adminUser.client.from('sv_mail_outbox').select('id').eq('id', r.id);
    expect(a.data).toHaveLength(1);
    for (const [label, c] of [
      ['a', userA.client],
      ['b', userB.client],
      ['anon', anonClient()],
      ['gecko', geckoUser.client],
    ] as [string, any][]) {
      const res = await c.from('sv_mail_outbox').select('id').eq('id', r.id);
      expect((res.data ?? []).length, label).toBe(0);
    }
  });

  it('a client cannot execute sv_claim_due_mail', async () => {
    const r = await userA.client.rpc('sv_claim_due_mail', { p_limit: 1 });
    expect(r.error).not.toBeNull();
  });
});
