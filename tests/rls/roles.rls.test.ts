import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addMember, cleanup, makeAdmin, makeClient, makeUser, svc, type TestUser } from './helpers';

let memberUser: TestUser;
let adminUser: TestUser;
let forged: TestUser;
let client: { id: string };

beforeAll(async () => {
  memberUser = await makeUser('rolemember');
  adminUser = await makeUser('roleadmin');
  client = await makeClient('RLS Roles Client');
  await addMember(client.id, memberUser);
  await makeAdmin(adminUser);
  forged = await makeUser('forged');
  await svc().auth.admin.updateUserById(forged.id, {
    user_metadata: { role: 'admin' },
    app_metadata: { role: 'admin' },
  });
  await forged.client.auth.refreshSession();
});

afterAll(cleanup);

describe('role exclusivity (D-04)', () => {
  it('inserting an sv_admin who is a client member fails with sv_role_conflict', async () => {
    const { error } = await svc().from('sv_admins').insert({ user_id: memberUser.id, email: memberUser.email });
    expect(error?.message).toContain('sv_role_conflict');
  });

  it('inserting a client member who is an sv_admin fails with sv_role_conflict', async () => {
    const { error } = await svc()
      .from('sv_client_members')
      .insert({ client_id: client.id, user_id: adminUser.id, invited_email: adminUser.email });
    expect(error?.message).toContain('sv_role_conflict');
  });
});

describe('roles never come from metadata (D-06)', () => {
  it('user with role=admin in user_metadata and app_metadata reads zero admin data', async () => {
    const admins = await forged.client.from('sv_admins').select('user_id');
    expect(admins.data ?? []).toEqual([]);
    const clients = await forged.client.from('sv_clients').select('id');
    expect(clients.data ?? []).toEqual([]);
    const members = await forged.client.from('sv_client_members').select('user_id');
    expect(members.data ?? []).toEqual([]);
  });

  it('a member cannot insert itself into sv_admins', async () => {
    const { error } = await memberUser.client
      .from('sv_admins')
      .insert({ user_id: memberUser.id, email: memberUser.email });
    expect(error).not.toBeNull();
    const { data } = await svc().from('sv_admins').select('user_id').eq('user_id', memberUser.id);
    expect(data ?? []).toEqual([]);
  });
});
