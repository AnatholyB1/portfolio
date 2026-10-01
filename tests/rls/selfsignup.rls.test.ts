import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PASSWORD,
  addMember,
  anonClient,
  cleanup,
  makeClient,
  makeUser,
  svc,
  trackUser,
  type TestUser,
} from './helpers';

const SV_TABLES = ['sv_tenants', 'sv_admins', 'sv_clients', 'sv_client_members', 'sv_throttle'] as const;

let signedUp: { id: string; email: string; client: ReturnType<typeof anonClient> };
let member: TestUser;

beforeAll(async () => {
  const email = `rls-selfsignup-${randomUUID()}@example.test`;
  const client = anonClient();
  const { data, error } = await client.auth.signUp({ email, password: PASSWORD });
  if (error || !data.user) throw new Error(`signUp failed: ${error?.message}`);
  trackUser(data.user.id);
  if (!data.session) {
    // confirm-email is on: confirm via admin, then sign in
    await svc().auth.admin.updateUserById(data.user.id, { email_confirm: true });
    const res = await client.auth.signInWithPassword({ email, password: PASSWORD });
    if (res.error) throw new Error(`signIn failed: ${res.error.message}`);
  }
  signedUp = { id: data.user.id, email, client };

  member = await makeUser('selfsignup-member');
  const c = await makeClient('RLS Selfsignup Client');
  await addMember(c.id, member);
});

afterAll(cleanup);

describe('self-registered user has no access (FOUND-02)', () => {
  for (const table of SV_TABLES) {
    it(`self-signup user reads zero rows from ${table}`, async () => {
      const { data, error } = await signedUp.client.from(table).select('*');
      if (!error) expect(data).toEqual([]);
    });
  }

  it('sv_login_allowed is false for the self-registered email', async () => {
    const { data, error } = await svc().rpc('sv_login_allowed', { p_email: signedUp.email });
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it('sv_login_allowed is true for a seeded member', async () => {
    const { data, error } = await svc().rpc('sv_login_allowed', { p_email: member.email });
    expect(error).toBeNull();
    expect(data).toBe(true);
  });
});
