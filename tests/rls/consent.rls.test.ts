import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anonClient, cleanup, makeAdmin, makeGeckoAdmin, makeUser, svc, type TestUser } from './helpers';

const VERSION = '2026-10-v1';

let adminUser: TestUser;
let plainUser: TestUser;
let geckoUser: TestUser;

beforeAll(async () => {
  adminUser = await makeUser('consentadmin');
  await makeAdmin(adminUser);
  plainUser = await makeUser('consentplain');
  geckoUser = await makeUser('consentgecko');
  await makeGeckoAdmin(geckoUser);
});

afterAll(cleanup);

const logConsent = (version: string, locale: string, choice = 'accepted', anon = randomUUID()) =>
  svc().rpc('sv_log_consent', {
    p_anon_id: anon,
    p_choice: choice,
    p_version: version,
    p_locale: locale,
    p_ip_hash: 'rls-test-hash',
  });

describe('LEAD-09 consent log', () => {
  it('writes a row for a seeded version and locale', async () => {
    const { data, error } = await logConsent(VERSION, 'fr');
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it('seeds the three locales for the version', async () => {
    const { data, error } = await svc().from('sv_consent_versions').select('locale').eq('version', VERSION);
    expect(error).toBeNull();
    expect((data ?? []).map((r) => r.locale).sort()).toEqual(['en', 'fr', 'th']);
  });

  it('rejects an unknown version', async () => {
    const { error } = await logConsent('nope', 'fr');
    expect(error?.message).toContain('sv_unknown_consent_version');
  });

  it('withdrawal appends a new row for the same anon id', async () => {
    const anon = randomUUID();
    expect((await logConsent(VERSION, 'en', 'accepted', anon)).error).toBeNull();
    expect((await logConsent(VERSION, 'en', 'refused', anon)).error).toBeNull();
    const { data } = await svc().from('sv_consent_log').select('choice').eq('anon_id', anon).order('id');
    expect((data ?? []).map((r) => r.choice)).toEqual(['accepted', 'refused']);
  });

  it('consent log rows cannot be updated or deleted by the service role', async () => {
    const anon = randomUUID();
    await logConsent(VERSION, 'fr', 'accepted', anon);
    const upd = await svc().from('sv_consent_log').update({ choice: 'refused' }).eq('anon_id', anon);
    expect(upd.error).not.toBeNull();
    const del = await svc().from('sv_consent_log').delete().eq('anon_id', anon);
    expect(del.error?.message ?? '').toContain('permission denied');
    const { data } = await svc().from('sv_consent_log').select('choice').eq('anon_id', anon);
    expect(data).toEqual([{ choice: 'accepted' }]);
  });

  it('anon, plain authenticated and Gecko admin read nothing', async () => {
    await logConsent(VERSION, 'fr');
    const readers: [string, any][] = [
      ['anon', anonClient()],
      ['plain', plainUser.client],
      ['gecko', geckoUser.client],
    ];
    for (const [label, c] of readers) {
      for (const t of ['sv_consent_log', 'sv_consent_versions']) {
        const { data } = await c.from(t).select('*').limit(5);
        expect(data ?? [], `${label} on ${t}`).toEqual([]);
      }
    }
  });

  it('anon and authenticated cannot execute sv_log_consent', async () => {
    const args = { p_anon_id: randomUUID(), p_choice: 'accepted', p_version: VERSION, p_locale: 'fr', p_ip_hash: null };
    for (const c of [anonClient(), plainUser.client]) {
      const r = await c.rpc('sv_log_consent', args);
      expect(r.error).not.toBeNull();
    }
  });

  it('an sv_admins member reads the journal and the versions', async () => {
    await logConsent(VERSION, 'th');
    const log = await adminUser.client.from('sv_consent_log').select('id').limit(1);
    expect((log.data ?? []).length).toBe(1);
    const v = await adminUser.client.from('sv_consent_versions').select('locale').eq('version', VERSION);
    expect((v.data ?? []).length).toBe(3);
  });
});
