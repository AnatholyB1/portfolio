/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const S = vi.hoisted(() => ({
  adminCalls: 0,
  signedUrl: vi.fn(),
  download: vi.fn(),
  path: 'p1/doc.pdf' as string | null,
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => {
    S.adminCalls++;
    const b: any = {};
    b.select = () => b;
    b.eq = () => b;
    b.maybeSingle = async () => ({ data: S.path ? { storage_path: S.path } : null, error: null });
    return {
      from: () => b,
      storage: { from: () => ({ createSignedUrl: S.signedUrl, download: S.download }) },
    };
  },
}));

import { createDocumentDownloadUrl, verifyDocumentHash } from './download';

function rls(data: any) {
  const b: any = {};
  b.select = () => b;
  b.eq = () => b;
  b.maybeSingle = async () => ({ data, error: null });
  return { from: () => b } as any;
}

const bytes = new TextEncoder().encode('pdf-bytes');
const hex = createHash('sha256').update(bytes).digest('hex');

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  S.adminCalls = 0;
  S.path = 'p1/doc.pdf';
  S.signedUrl.mockResolvedValue({ data: { signedUrl: 'https://d' }, error: null });
  S.download.mockResolvedValue({ data: new Blob([bytes]), error: null });
});

describe('createDocumentDownloadUrl', () => {
  it('not_found when RLS hides the row, admin never created', async () => {
    expect(await createDocumentDownloadUrl(rls(null), 'd1')).toEqual({ ok: false, code: 'not_found' });
    expect(S.adminCalls).toBe(0);
  });
  it('signs a 120 s url with download filename', async () => {
    const res = await createDocumentDownloadUrl(rls({ id: 'd1', filename: 'a.pdf' }), 'd1');
    expect(res).toEqual({ ok: true, url: 'https://d' });
    expect(S.signedUrl).toHaveBeenCalledWith('p1/doc.pdf', 120, { download: 'a.pdf' });
  });
  it('error with generic log on signed url failure', async () => {
    S.signedUrl.mockResolvedValue({ data: null, error: { message: 'boom p1/doc.pdf' } });
    const res = await createDocumentDownloadUrl(rls({ id: 'd1', filename: 'a.pdf' }), 'd1');
    expect(res).toEqual({ ok: false, code: 'error' });
    const logged = (console.error as any).mock.calls.flat().join(' ');
    expect(logged).not.toContain('p1/doc.pdf');
    expect(logged).not.toContain('d1');
  });
});

describe('verifyDocumentHash', () => {
  it('not_found when RLS hides the row', async () => {
    expect(await verifyDocumentHash(rls(null), 'd1')).toEqual({ ok: false, code: 'not_found' });
  });
  it('match true when hashes are equal', async () => {
    expect(await verifyDocumentHash(rls({ id: 'd1', sha256: hex }), 'd1')).toEqual({ ok: true, match: true });
  });
  it('match false when different', async () => {
    expect(await verifyDocumentHash(rls({ id: 'd1', sha256: 'deadbeef' }), 'd1')).toEqual({ ok: true, match: false });
  });
  it('error when download fails', async () => {
    S.download.mockResolvedValue({ data: null, error: { message: 'x' } });
    expect(await verifyDocumentHash(rls({ id: 'd1', sha256: hex }), 'd1')).toEqual({ ok: false, code: 'error' });
  });
});
