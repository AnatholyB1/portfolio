/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const S = vi.hoisted(() => ({
  adminCalls: 0,
  signedUrl: vi.fn(),
  download: vi.fn(),
  logOpened: vi.fn(),
  logSeal: vi.fn(),
  adminRows: {} as Record<string, any>,
}));

vi.mock('server-only', () => ({}));
vi.mock('./chain', () => ({ logDocumentOpened: S.logOpened, logSealDownloaded: S.logSeal }));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => {
    S.adminCalls++;
    return {
      from: (table: string) => {
        const b: any = {};
        b.select = () => b;
        b.eq = () => b;
        b.maybeSingle = async () => ({ data: S.adminRows[table] ?? null, error: null });
        return b;
      },
      storage: { from: () => ({ createSignedUrl: S.signedUrl, download: S.download }) },
    };
  },
}));

import { createPreviewUrl, createSealedDownloadUrl, PREVIEW_LINK_SECONDS } from './links';

function rls(rows: Record<string, any>) {
  return {
    from: (table: string) => {
      const b: any = {};
      b.select = () => b;
      b.eq = () => b;
      b.maybeSingle = async () => ({ data: rows[table] ?? null, error: null });
      return b;
    },
  } as any;
}

const actor = { kind: 'client' as const, id: 'u1', ip: '1.1.1.1' };
const bytes = new TextEncoder().encode('sealed-bytes');
const hex = createHash('sha256').update(bytes).digest('hex');

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  S.adminCalls = 0;
  S.adminRows = { sv_project_documents: { storage_path: 'p/doc.pdf' }, sv_document_seals: { storage_path: 'p/seal.pdf' } };
  S.signedUrl.mockResolvedValue({ data: { signedUrl: 'https://u' }, error: null });
  S.download.mockResolvedValue({ data: new Blob([bytes]), error: null });
});

describe('createPreviewUrl', () => {
  it('not_found without service_role when RLS hides the row', async () => {
    expect(await createPreviewUrl(rls({}), 'd1', actor)).toEqual({ ok: false, code: 'not_found' });
    expect(S.adminCalls).toBe(0);
    expect(S.logOpened).not.toHaveBeenCalled();
  });
  it('logs once and signs 300 s without download option', async () => {
    const res = await createPreviewUrl(rls({ sv_project_documents: { id: 'd1' } }), 'd1', actor);
    expect(res).toEqual({ ok: true, url: 'https://u' });
    expect(PREVIEW_LINK_SECONDS).toBe(300);
    expect(S.logOpened).toHaveBeenCalledTimes(1);
    expect(S.logOpened).toHaveBeenCalledWith('d1', actor);
    expect(S.signedUrl).toHaveBeenCalledTimes(1);
    expect(S.signedUrl.mock.calls[0]).toEqual(['p/doc.pdf', 300]);
  });
});

describe('createSealedDownloadUrl', () => {
  const rows = { sv_document_seals: { id: 's1', sha256: hex }, sv_project_documents: { id: 'd1', filename: 'devis.pdf' } };
  it('not_found when seal is hidden', async () => {
    expect(await createSealedDownloadUrl(rls({}), 'd1', actor)).toEqual({ ok: false, code: 'not_found' });
    expect(S.adminCalls).toBe(0);
  });
  it('hash_mismatch issues no url and no log', async () => {
    const bad = { ...rows, sv_document_seals: { id: 's1', sha256: 'f'.repeat(64) } };
    expect(await createSealedDownloadUrl(rls(bad), 'd1', actor)).toEqual({ ok: false, code: 'hash_mismatch' });
    expect(S.signedUrl).not.toHaveBeenCalled();
    expect(S.logSeal).not.toHaveBeenCalled();
  });
  it('match logs then signs 120 s with -signe filename', async () => {
    const res = await createSealedDownloadUrl(rls(rows), 'd1', actor);
    expect(res).toEqual({ ok: true, url: 'https://u' });
    expect(S.logSeal).toHaveBeenCalledWith('d1', actor);
    expect(S.signedUrl).toHaveBeenCalledWith('p/seal.pdf', 120, { download: 'devis-signe.pdf' });
  });
});
