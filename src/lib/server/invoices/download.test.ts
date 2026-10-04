import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const createSignedUrl = vi.fn();
const download = vi.fn();
let pdfRow: { storage_path: string; sha256: string } | null = { storage_path: 'invoices/a.pdf', sha256: 'x' };

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: pdfRow, error: null }) }) }),
    }),
    storage: { from: () => ({ createSignedUrl, download }) },
  }),
}));

const { createInvoiceDownloadUrl, verifyInvoiceHash } = await import('./download');

function rlsReturning(data: unknown) {
  return {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error: null }) }) }) }),
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  pdfRow = { storage_path: 'invoices/a.pdf', sha256: 'x' };
});

describe('createInvoiceDownloadUrl', () => {
  it('returns not_found when RLS hides the invoice', async () => {
    expect(await createInvoiceDownloadUrl(rlsReturning(null), 'i1')).toEqual({ ok: false, code: 'not_found' });
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('returns not_ready without a pdf row', async () => {
    pdfRow = null;
    expect(await createInvoiceDownloadUrl(rlsReturning({ id: 'i1', number: 'FA-2026-0001', kind: 'deposit' }), 'i1')).toEqual({
      ok: false,
      code: 'not_ready',
    });
  });

  it('signs a 60 second url with an invoice filename and no storage path', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed/x' }, error: null });
    const res = await createInvoiceDownloadUrl(rlsReturning({ id: 'i1', number: 'FA-2026-0001', kind: 'deposit' }), 'i1');
    expect(res).toEqual({ ok: true, url: 'https://signed/x' });
    expect(createSignedUrl).toHaveBeenCalledWith('invoices/a.pdf', 60, { download: 'Facture-FA-2026-0001.pdf' });
    expect(JSON.stringify(res)).not.toContain('invoices/a.pdf');
  });

  it('names credit notes Avoir-', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'u' }, error: null });
    await createInvoiceDownloadUrl(rlsReturning({ id: 'n1', number: 'AV-2026-0001', kind: 'credit_note' }), 'n1');
    expect(createSignedUrl.mock.calls[0][2]).toEqual({ download: 'Avoir-AV-2026-0001.pdf' });
  });

  it('maps a signing failure to error', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'x' } });
    expect(await createInvoiceDownloadUrl(rlsReturning({ id: 'i', number: 'n', kind: 'final' }), 'i')).toEqual({
      ok: false,
      code: 'error',
    });
  });
});

describe('verifyInvoiceHash', () => {
  const bytes = new TextEncoder().encode('pdf-bytes');
  const hex = createHash('sha256').update(Buffer.from(bytes)).digest('hex');
  const blob = { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };

  it('match', async () => {
    pdfRow = { storage_path: 'p', sha256: hex };
    download.mockResolvedValue({ data: blob, error: null });
    expect(await verifyInvoiceHash('i1')).toBe('match');
  });

  it('mismatch', async () => {
    pdfRow = { storage_path: 'p', sha256: 'f'.repeat(64) };
    download.mockResolvedValue({ data: blob, error: null });
    expect(await verifyInvoiceHash('i1')).toBe('mismatch');
  });

  it('missing when no row or no object', async () => {
    pdfRow = null;
    expect(await verifyInvoiceHash('i1')).toBe('missing');
    pdfRow = { storage_path: 'p', sha256: hex };
    download.mockResolvedValue({ data: null, error: { message: 'x' } });
    expect(await verifyInvoiceHash('i1')).toBe('missing');
  });
});
