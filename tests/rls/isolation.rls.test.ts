import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addMember,
  anonClient,
  cleanup,
  makeAdmin,
  makeClient,
  makeGeckoAdmin,
  makeUser,
  svc,
  type TestUser,
} from './helpers';

const SV_TABLES = ['sv_tenants', 'sv_admins', 'sv_clients', 'sv_client_members', 'sv_throttle'] as const;
const SV_RPCS: Array<[string, Record<string, unknown>]> = [
  ['sv_login_allowed', { p_email: 'x@example.test' }],
  ['sv_find_auth_user', { p_email: 'x@example.test' }],
  ['sv_session_age_ok', { p_session_id: '00000000-0000-4000-8000-000000000000', p_max_days: 30 }],
  ['sv_throttle_hit', { p_key: 'rls-test', p_window_seconds: 60, p_max: 5 }],
];

let a1: TestUser;
let b1: TestUser;
let admin: TestUser;
let geckoUser: TestUser;
let geckoAdmin: TestUser;
let clientA: { id: string };
let clientB: { id: string };

beforeAll(async () => {
  a1 = await makeUser('a1');
  b1 = await makeUser('b1');
  admin = await makeUser('svadmin');
  geckoUser = await makeUser('geckouser');
  geckoAdmin = await makeUser('geckoadmin');
  clientA = await makeClient('RLS Client A');
  clientB = await makeClient('RLS Client B');
  await addMember(clientA.id, a1);
  await addMember(clientB.id, b1);
  await makeAdmin(admin);
  await makeGeckoAdmin(geckoAdmin);
});

afterAll(async () => {
  await svc().from('gecko_admins').delete().eq('id', geckoAdmin.id);
  await cleanup();
});

async function rowsOf(c: TestUser['client'], table: string) {
  const { data, error } = await c.from(table).select('*');
  // permission denied is as good as zero rows
  if (error) return [] as unknown[];
  return (data ?? []) as unknown[];
}

describe('client isolation (FOUND-04)', () => {
  it('client A user sees exactly client A in sv_clients (positive control)', async () => {
    const { data, error } = await a1.client.from('sv_clients').select('id');
    expect(error).toBeNull();
    expect(data?.map((r) => r.id)).toEqual([clientA.id]);
  });

  it('client A user sees only its own membership row (positive control)', async () => {
    const { data, error } = await a1.client.from('sv_client_members').select('user_id');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].user_id).toBe(a1.id);
  });

  it('client A user cannot read client B by id', async () => {
    const { data } = await a1.client.from('sv_clients').select('id').eq('id', clientB.id);
    expect(data ?? []).toEqual([]);
  });

  it('client B user cannot read client A by id (symmetric)', async () => {
    const { data } = await b1.client.from('sv_clients').select('id').eq('id', clientA.id);
    expect(data ?? []).toEqual([]);
  });

  it('client A user cannot read client B memberships', async () => {
    const { data } = await a1.client.from('sv_client_members').select('user_id').eq('client_id', clientB.id);
    expect(data ?? []).toEqual([]);
  });

  it('sv admin sees both clients and all members', async () => {
    const { data: cs } = await admin.client.from('sv_clients').select('id').in('id', [clientA.id, clientB.id]);
    expect(cs?.map((r) => r.id).sort()).toEqual([clientA.id, clientB.id].sort());
    const { data: ms } = await admin.client
      .from('sv_client_members')
      .select('user_id')
      .in('user_id', [a1.id, b1.id]);
    expect(ms).toHaveLength(2);
  });
});

describe('anonymous access', () => {
  for (const table of SV_TABLES) {
    it(`anon reads zero rows from ${table}`, async () => {
      expect(await rowsOf(anonClient(), table)).toEqual([]);
    });
  }

  for (const [fn, args] of SV_RPCS) {
    it(`anon cannot call rpc ${fn}`, async () => {
      const { error } = await anonClient().rpc(fn, args);
      expect(error).not.toBeNull();
    });
  }
});

describe('Gecko users have no sv_* access', () => {
  for (const table of SV_TABLES) {
    it(`plain Gecko user reads zero rows from ${table}`, async () => {
      expect(await rowsOf(geckoUser.client, table)).toEqual([]);
    });
    it(`gecko_admins user reads zero rows from ${table}`, async () => {
      expect(await rowsOf(geckoAdmin.client, table)).toEqual([]);
    });
  }

  for (const [fn, args] of SV_RPCS) {
    it(`Gecko user cannot call rpc ${fn}`, async () => {
      const { error } = await geckoUser.client.rpc(fn, args);
      expect(error).not.toBeNull();
    });
    it(`gecko_admins user cannot call rpc ${fn}`, async () => {
      const { error } = await geckoAdmin.client.rpc(fn, args);
      expect(error).not.toBeNull();
    });
  }

  it('sv admin reading gecko_reservations gets zero rows (not a gecko_admins member)', async () => {
    const { data } = await admin.client.from('gecko_reservations').select('id');
    expect(data ?? []).toEqual([]);
  });
});

describe('writes are denied to authenticated users', () => {
  it('client A user cannot insert/update/delete sv_clients', async () => {
    const before = await svc().from('sv_clients').select('id,name').eq('id', clientA.id).single();
    await a1.client.from('sv_clients').insert({ name: 'evil', siret: '99999999999999' });
    await a1.client.from('sv_clients').update({ name: 'pwned' }).eq('id', clientA.id);
    await a1.client.from('sv_clients').delete().eq('id', clientA.id);
    const after = await svc().from('sv_clients').select('id,name').eq('id', clientA.id).single();
    expect(after.data).toEqual(before.data);
    const evil = await svc().from('sv_clients').select('id').eq('siret', '99999999999999');
    expect(evil.data ?? []).toEqual([]);
  });

  it('client A user cannot insert/update/delete sv_client_members', async () => {
    await a1.client.from('sv_client_members').insert({ client_id: clientB.id, user_id: a1.id, invited_email: a1.email });
    await a1.client.from('sv_client_members').update({ client_id: clientB.id }).eq('user_id', a1.id);
    await a1.client.from('sv_client_members').delete().eq('user_id', a1.id);
    const { data } = await svc().from('sv_client_members').select('client_id').eq('user_id', a1.id);
    expect(data).toEqual([{ client_id: clientA.id }]);
  });

  it('client A user cannot insert/update/delete sv_admins', async () => {
    await a1.client.from('sv_admins').insert({ user_id: a1.id, email: a1.email });
    await a1.client.from('sv_admins').delete().eq('user_id', admin.id);
    const { data } = await svc().from('sv_admins').select('user_id').in('user_id', [a1.id, admin.id]);
    expect(data?.map((r) => r.user_id)).toEqual([admin.id]);
  });
});
