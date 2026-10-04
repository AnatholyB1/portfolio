/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { createHash, randomBytes } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument, PDFArray, PDFRawStream, PDFRef, decodePDFRawStream } from 'pdf-lib';
import { extractText, getDocumentProxy } from 'unpdf';

const S = vi.hoisted(() => ({
  tables: {} as Record<string, { data: any; error: any }>,
  download: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
  send: vi.fn(),
  after: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    storage: { from: () => ({ download: S.download, upload: S.upload, remove: S.remove }) },
    from: (t: string) => {
      const b: any = {};
      for (const m of ['select', 'eq', 'order']) b[m] = () => b;
      b.maybeSingle = async () => S.tables[t] ?? { data: null, error: null };
      b.then = (res: any, rej: any) => Promise.resolve(S.tables[t] ?? { data: [], error: null }).then(res, rej);
      return b;
    },
  }),
}));
vi.mock('@/lib/server/rpc', () => ({ callRpc: S.rpc }));
vi.mock('@/lib/server/mail/outbox', () => ({ sendOutboxRow: S.send }));
vi.mock('@/lib/server/projects/facts', () => ({ afterFactPosted: S.after }));

import { renderDocument } from '@/lib/server/documents/render';
import { sampleAcceptanceSnapshot, sampleQuoteSnapshot } from '@/lib/documents/fixtures';
import { buildCertificateData, type CertificateInput } from '@/lib/signature/certificate';
import { buildSealedPdf, finalizeSignature } from './seal';

const DID = '22222222-2222-4222-8222-222222222222';
const PID = '11111111-1111-4111-8111-111111111111';
const HASH = 'a'.repeat(31) + 'b' + 'c'.repeat(31) + 'd';
const LINK = '0123456789abcdef'.repeat(4);
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

let quote: Buffer;
let acceptance: Buffer;

beforeAll(async () => {
  quote = (await renderDocument(sampleQuoteSnapshot())).buffer;
  acceptance = (await renderDocument(sampleAcceptanceSnapshot())).buffer;
}, 60000);

function input(
  original: Uint8Array,
  acc: CertificateInput['acceptance'] = null,
  docType: 'quote' | 'acceptance' = 'quote',
): CertificateInput {
  return {
    document: {
      docType,
      reference: 'DEV-2026-001',
      revision: 1,
      templateVersion: 'v1',
      issuedAt: '2026-10-01T10:00:00Z',
      sha256: sha(original),
    },
    signature: {
      signerName: 'Claire Martin',
      signerRole: 'Gérante',
      signerEmail: 'claire@example.fr',
      signedAt: '2026-10-04T12:05:00Z',
      signedAtUtc: '2026-10-04 12:05:00 UTC',
      ip: '203.0.113.7',
      consentVersion: 'v1',
      signedEventSeq: 7,
      signedLinkHash: LINK,
    },
    acceptance: acc,
  };
}

function contentBytes(pdf: PDFDocument, i: number): Buffer[] {
  const contents = pdf.getPage(i).node.Contents();
  const arr =
    contents instanceof PDFArray
      ? contents.asArray().map((r) => (r instanceof PDFRef ? pdf.context.lookup(r) : r))
      : [contents];
  return arr.map((s: any) =>
    s instanceof PDFRawStream ? Buffer.from(decodePDFRawStream(s).decode()) : Buffer.from(s.getContents()),
  );
}

async function textOf(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).join('\n').replace(/\s+/g, ' ');
}

describe('buildSealedPdf', () => {
  it('quote: original pages untouched, certificate text complete', async () => {
    const data = buildCertificateData(input(quote));
    const r = await buildSealedPdf(quote, data);
    expect(r.sha256).toBe(sha(r.bytes));
    expect(r.size).toBe(r.bytes.length);
    const orig = await PDFDocument.load(quote, { updateMetadata: false });
    const sealed = await PDFDocument.load(r.bytes, { updateMetadata: false });
    const n = orig.getPageCount();
    expect(sealed.getPageCount()).toBeGreaterThanOrEqual(n + 1);
    for (let i = 0; i < n; i++) {
      const a = contentBytes(orig, i);
      const b = contentBytes(sealed, i);
      expect(b.length).toBe(a.length);
      b.forEach((x, k) => expect(x.equals(a[k])).toBe(true));
    }
    const t = await textOf(r.bytes);
    expect(t).toContain('Certificat de signature électronique');
    expect(t).toContain(data.originalSha256Lines[0]);
    expect(t).toContain(data.originalSha256Lines[1]);
    expect(t).toContain('Claire Martin');
    expect(t).toContain('Europe/Paris');
    expect(t).toContain(data.signedAtParis);
    expect(t).toContain('2026-10-04 12:05:00 UTC');
    expect(t).toContain('203.0.113.7');
    expect(t).toContain(data.lastLinkHashLines[0]);
    expect(t).toContain(data.lastLinkHashLines[1]);
  });

  it('acceptance with 2 reserves lists them', async () => {
    const data = buildCertificateData(
      input(
        acceptance,
        [
          { index: 1, status: 'delivered', note: null },
          { index: 2, status: 'reserved', note: 'Logo mal aligné' },
          { index: 3, status: 'reserved', note: 'Page contact lente' },
        ],
        'acceptance',
      ),
    );
    const r = await buildSealedPdf(acceptance, data);
    const t = await textOf(r.bytes);
    expect(t).toContain('Logo mal aligné');
    expect(t).toContain('Page contact lente');
    expect(t).toContain('Livré avec réserve');
  });

  it('40 long reserves span several certificate pages, each with the footer', async () => {
    const acc = Array.from({ length: 40 }, (_, i) => ({
      index: i + 1,
      status: 'reserved' as const,
      note: `Réserve numéro ${i + 1} : ` + 'texte long de la réserve '.repeat(12),
    }));
    const data = buildCertificateData(input(acceptance, acc, 'acceptance'));
    const r = await buildSealedPdf(acceptance, data);
    const orig = await PDFDocument.load(acceptance, { updateMetadata: false });
    const sealed = await PDFDocument.load(r.bytes, { updateMetadata: false });
    const added = sealed.getPageCount() - orig.getPageCount();
    expect(added).toBeGreaterThan(1);
    const pdf = await getDocumentProxy(new Uint8Array(r.bytes));
    const { text } = await extractText(pdf, { mergePages: false });
    const certPages = (text as string[]).slice(orig.getPageCount());
    expect(certPages).toHaveLength(added);
    certPages.forEach((p, i) => {
      const n = p.replace(/\s+/g, ' ');
      expect(n).toContain('Sèvalys · DEV-2026-001');
      expect(n).toContain(`Certificat · page ${i + 1} / ${added}`);
    });
  });
});

describe('finalizeSignature', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  const sigRow = () => ({
    signer_email: 'claire@example.fr',
    signer_name: 'Claire Martin',
    signer_role: 'Gérante',
    ip: '203.0.113.7',
    consent_version: 'v1',
    signed_event_seq: 7,
    signed_link_hash: LINK,
    signed_at: '2026-10-04T12:05:00Z',
    signed_at_utc: '2026-10-04 12:05:00 UTC',
    acceptance_submission_id: null,
  });
  const docRow = (sha256: string) => ({
    project_id: PID,
    doc_type: 'quote',
    reference: 'DEV-2026-001',
    revision: 1,
    template_version: 'v1',
    issued_at: '2026-10-01T10:00:00Z',
    sha256,
    storage_path: `${PID}/${DID}.pdf`,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    S.tables = {
      sv_document_signatures: { data: sigRow(), error: null },
      sv_project_documents: { data: docRow(sha(quote)), error: null },
    };
    S.download.mockImplementation(async () => ({
      data: { arrayBuffer: async () => new Uint8Array(quote).buffer },
      error: null,
    }));
    S.upload.mockResolvedValue({ error: null });
    S.remove.mockResolvedValue({ error: null });
    S.rpc.mockResolvedValue({
      ok: true,
      data: { seal_id: 's', fact_id: 42, fact_changed: true, outbox_ids: ['o1'] },
    });
    S.send.mockResolvedValue('sent');
    S.after.mockResolvedValue({ stepBefore: 3, stepAfter: 4, done: false, mail: 'sent' });
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('not signed -> not_signed, no upload', async () => {
    S.tables.sv_document_signatures = { data: null, error: null };
    expect(await finalizeSignature(DID)).toEqual({ ok: false, code: 'not_signed' });
    expect(S.upload).not.toHaveBeenCalled();
  });

  it('hash mismatch -> no upload, no RPC', async () => {
    S.tables.sv_project_documents = { data: docRow('0'.repeat(64)), error: null };
    expect(await finalizeSignature(DID)).toEqual({ ok: false, code: 'hash_mismatch' });
    expect(S.upload).not.toHaveBeenCalled();
    expect(S.rpc).not.toHaveBeenCalled();
  });

  it('too large -> no upload', async () => {
    const bigPdf = await PDFDocument.load(quote, { updateMetadata: false });
    bigPdf.context.register(bigPdf.context.flateStream(randomBytes(10485760), {}));
    const big = Buffer.from(await bigPdf.save({ useObjectStreams: false }));
    S.download.mockImplementation(async () => ({
      data: { arrayBuffer: async () => new Uint8Array(big).buffer },
      error: null,
    }));
    S.tables.sv_project_documents = { data: docRow(sha(big)), error: null };
    const r = await finalizeSignature(DID);
    expect(r).toEqual({ ok: false, code: 'too_large' });
    expect(S.upload).not.toHaveBeenCalled();
  });

  it('upload error -> upload_failed, RPC never called (no fact)', async () => {
    S.upload.mockResolvedValue({ error: { message: 'x' } });
    expect(await finalizeSignature(DID)).toEqual({ ok: false, code: 'upload_failed' });
    expect(S.rpc).not.toHaveBeenCalled();
    expect(S.after).not.toHaveBeenCalled();
  });

  it('RPC failure -> orphan removed, seal_failed', async () => {
    S.rpc.mockResolvedValue({ ok: false, code: 'sv_signature_missing' });
    expect(await finalizeSignature(DID)).toEqual({ ok: false, code: 'seal_failed' });
    expect(S.remove).toHaveBeenCalledTimes(1);
    expect(S.after).not.toHaveBeenCalled();
  });

  it('sv_already_sealed -> orphan removed, idempotent success', async () => {
    S.rpc.mockResolvedValue({ ok: false, code: 'sv_already_sealed' });
    expect(await finalizeSignature(DID)).toEqual({ ok: true, outcome: 'already_sealed' });
    expect(S.remove).toHaveBeenCalledTimes(1);
    expect(S.after).not.toHaveBeenCalled();
  });

  it('success: path, hash of uploaded bytes, mails, step notification', async () => {
    const r = await finalizeSignature(DID);
    expect(r.ok).toBe(true);
    const [path, bytes] = S.upload.mock.calls[0];
    expect(path).toMatch(new RegExp(`^${PID}/sealed/[0-9a-f-]{36}\\.pdf$`));
    expect(S.upload.mock.calls[0][2]).toMatchObject({ upsert: false, contentType: 'application/pdf' });
    const args = S.rpc.mock.calls[0][2];
    expect(args.p_sha256).toBe(sha(bytes));
    expect(args.p_size).toBe(bytes.length);
    expect(args.p_storage_path).toBe(path);
    expect(r).toEqual({ ok: true, outcome: 'sealed', sealSha256: sha(bytes) });
    expect(S.send).toHaveBeenCalledWith('o1');
    expect(S.after).toHaveBeenCalledWith(PID, 42);
    expect(S.remove).not.toHaveBeenCalled();
  });

  it('fact_changed false -> afterFactPosted not called', async () => {
    S.rpc.mockResolvedValue({ ok: true, data: { seal_id: 's', fact_id: null, fact_changed: false, outbox_ids: [] } });
    const r = await finalizeSignature(DID);
    expect(r.ok).toBe(true);
    expect(S.after).not.toHaveBeenCalled();
    void errSpy;
  });
});
