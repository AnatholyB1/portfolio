/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const S = vi.hoisted(() => ({
  inserts: [] as any[],
  updates: [] as any[],
  signedUpload: vi.fn(),
  signedUrl: vi.fn(),
  list: vi.fn(),
  adminCalls: 0,
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => {
    S.adminCalls++;
    return {
      from: () => ({
        insert: async (r: any) => (S.inserts.push(r), { error: null }),
        update: (r: any) => (S.updates.push(r), { eq: async () => ({ error: null }) }),
      }),
      storage: {
        from: () => ({
          createSignedUploadUrl: S.signedUpload,
          createSignedUrl: S.signedUrl,
          list: S.list,
        }),
      },
    };
  },
}));

import { confirmUpload, createDownloadUrl, requestUpload } from './files';

const PID = '11111111-1111-4111-8111-111111111111';
function rls(data: any) {
  const b: any = {};
  b.select = () => b;
  b.eq = () => b;
  b.maybeSingle = async () => ({ data, error: null });
  return { from: () => b } as any;
}
const proj = { id: PID, client_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' };
const base = {
  projectId: PID,
  uploaderKind: 'client' as const,
  uploaderId: 'u1',
  filename: 'a.pdf',
  size: 100,
  mime: 'application/pdf',
};

beforeEach(() => {
  vi.clearAllMocks();
  S.inserts = [];
  S.updates = [];
  S.adminCalls = 0;
  S.signedUpload.mockResolvedValue({ data: { signedUrl: 'https://u', token: 't', path: 'p' }, error: null });
  S.signedUrl.mockResolvedValue({ data: { signedUrl: 'https://d' }, error: null });
  S.list.mockResolvedValue({ data: [], error: null });
});

describe('requestUpload', () => {
  it('not visible -> not_found without service_role', async () => {
    expect(await requestUpload(rls(null), base)).toEqual({ ok: false, code: 'not_found' });
    expect(S.adminCalls).toBe(0);
  });
  it('too large', async () => {
    const r = await requestUpload(rls(proj), { ...base, size: 26214401 });
    expect(r).toEqual({ ok: false, code: 'too_large' });
    expect(S.inserts).toHaveLength(0);
  });
  it('bad type', async () => {
    const r = await requestUpload(rls(proj), { ...base, filename: 'a.exe', mime: 'application/octet-stream' });
    expect(r).toEqual({ ok: false, code: 'bad_type' });
    expect(S.inserts).toHaveLength(0);
  });
  it('valid request inserts pending row and signs path', async () => {
    const r: any = await requestUpload(rls(proj), base);
    expect(r.ok).toBe(true);
    expect(r.path).toMatch(
      /^cccccccc-cccc-4ccc-8ccc-cccccccccccc\/11111111-1111-4111-8111-111111111111\/[0-9a-f-]{36}-[A-Za-z0-9._-]+$/,
    );
    expect(S.inserts[0]).toMatchObject({ status: 'pending', uploaded_by_kind: 'client', uploaded_by: 'u1' });
    expect(S.signedUpload).toHaveBeenCalledWith(r.path);
  });
  it('traversal filename stays safe', async () => {
    const r: any = await requestUpload(rls(proj), { ...base, filename: '../../x.pdf' });
    expect(r.ok).toBe(true);
    const name = r.path.split('/').slice(2).join('/');
    expect(name).not.toContain('..');
    expect(r.path.split('/')).toHaveLength(3);
  });
  it('signed url failure -> error', async () => {
    S.signedUpload.mockResolvedValue({ data: null, error: { message: 'x' } });
    expect(await requestUpload(rls(proj), base)).toEqual({ ok: false, code: 'error' });
  });
});

describe('confirmUpload', () => {
  const row = { id: 'f1', storage_path: 'c/p/uuid-a.pdf', status: 'pending' };
  it('not visible -> not_found', async () => {
    expect(await confirmUpload(rls(null), 'f1')).toEqual({ ok: false, code: 'not_found' });
  });
  it('missing object', async () => {
    expect(await confirmUpload(rls(row), 'f1')).toEqual({ ok: false, code: 'missing' });
    expect(S.updates).toHaveLength(0);
  });
  it('present -> ready with ready_at', async () => {
    S.list.mockResolvedValue({ data: [{ name: 'uuid-a.pdf' }], error: null });
    expect(await confirmUpload(rls(row), 'f1')).toEqual({ ok: true });
    expect(S.updates[0].status).toBe('ready');
    expect(S.updates[0].ready_at).toBeTruthy();
  });
});

describe('createDownloadUrl', () => {
  it('ready -> signed 120s with download', async () => {
    const r = await createDownloadUrl(
      rls({ id: 'f1', storage_path: 'c/p/x.pdf', filename: 'x.pdf', status: 'ready' }),
      'f1',
    );
    expect(r).toEqual({ ok: true, url: 'https://d' });
    expect(S.signedUrl).toHaveBeenCalledWith('c/p/x.pdf', 120, { download: 'x.pdf' });
  });
  it('pending -> not_found', async () => {
    const r = await createDownloadUrl(rls({ id: 'f1', storage_path: 'x', filename: 'x', status: 'pending' }), 'f1');
    expect(r).toEqual({ ok: false, code: 'not_found' });
    expect(S.signedUrl).not.toHaveBeenCalled();
  });
});
