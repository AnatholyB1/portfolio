/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const S = vi.hoisted(() => ({ inserts: [] as any[] }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (t: string) => {
      const r: any = {
        insert: (row: any) => {
          S.inserts.push({ t, row });
          return r;
        },
        select: () => r,
        single: async () => ({ data: { created_at: '2026-10-03T00:00:00Z' }, error: null }),
        then: (res: any, rej: any) => Promise.resolve({ error: null }).then(res, rej),
      };
      return r;
    },
  }),
}));

import { PRESENTATION_CONSENT } from '@/lib/projects/consent';
import { addProjectLink, setPresentationConsent } from './content';

const PID = '11111111-1111-4111-8111-111111111111';
function rls(data: any) {
  const b: any = {};
  b.select = () => b;
  b.eq = () => b;
  b.maybeSingle = async () => ({ data, error: null });
  return { from: () => b } as any;
}
const proj = { id: PID, client_id: 'c1' };

beforeEach(() => {
  S.inserts = [];
});

describe('addProjectLink', () => {
  it('rejects http', async () => {
    const r = await addProjectLink(rls(proj), { projectId: PID, title: 'T', url: 'http://x.fr', actorId: 'a' });
    expect(r).toEqual({ ok: false, code: 'invalid' });
    expect(S.inserts).toHaveLength(0);
  });
  it('not visible', async () => {
    const r = await addProjectLink(rls(null), { projectId: PID, title: 'T', url: 'https://x.fr', actorId: 'a' });
    expect(r).toEqual({ ok: false, code: 'not_found' });
  });
  it('inserts valid link', async () => {
    const r = await addProjectLink(rls(proj), { projectId: PID, title: 'T', url: 'https://x.fr', actorId: 'a' });
    expect(r).toEqual({ ok: true });
    expect(S.inserts[0].row).toEqual({ project_id: PID, title: 'T', url: 'https://x.fr', created_by: 'a' });
  });
});

describe('setPresentationConsent', () => {
  it('stale version refused', async () => {
    const r = await setPresentationConsent(rls(proj), { projectId: PID, granted: true, version: 'old', actorId: 'a' });
    expect(r).toEqual({ ok: false, code: 'stale_version' });
    expect(S.inserts).toHaveLength(0);
  });
  it('grant and revoke append snapshot rows', async () => {
    for (const granted of [true, false]) {
      const r = await setPresentationConsent(rls(proj), {
        projectId: PID,
        granted,
        version: PRESENTATION_CONSENT.version,
        actorId: 'a',
      });
      expect(r.ok).toBe(true);
    }
    const mk = (granted: boolean) => ({
      project_id: PID,
      granted,
      text_version: PRESENTATION_CONSENT.version,
      text_snapshot: PRESENTATION_CONSENT.text,
      actor_id: 'a',
    });
    expect(S.inserts.map((i) => i.row)).toEqual([mk(true), mk(false)]);
  });
  it('not visible', async () => {
    const r = await setPresentationConsent(rls(null), {
      projectId: PID,
      granted: true,
      version: PRESENTATION_CONSENT.version,
      actorId: 'a',
    });
    expect(r).toEqual({ ok: false, code: 'not_found' });
  });
});
