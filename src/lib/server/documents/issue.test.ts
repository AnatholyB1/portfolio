/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const S = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  existing: { data: null as any, error: null as any },
  render: vi.fn(),
  rpc: vi.fn(),
  send: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    storage: { from: () => ({ upload: S.upload, remove: S.remove }) },
    from: () => {
      const b: any = {};
      b.select = () => b;
      b.eq = () => b;
      b.maybeSingle = async () => S.existing;
      return b;
    },
  }),
}));
vi.mock('./render', () => ({ renderDocument: S.render }));
vi.mock('@/lib/server/rpc', () => ({ callRpc: S.rpc }));
vi.mock('@/lib/server/mail/outbox', () => ({ sendOutboxRow: S.send }));

import { sampleInvoiceSnapshot, sampleQuoteSnapshot, sampleSeller } from '@/lib/documents/fixtures';
import { buildFilename, DOC_LABELS } from '@/lib/documents/types';
import { aggregateMail, issueDocument } from './issue';

const PID = '11111111-1111-4111-8111-111111111111';
const DID = '22222222-2222-4222-8222-222222222222';
const ACTOR = '33333333-3333-4333-8333-333333333333';
const BUF = Buffer.from('%PDF-fake');

function args(over: Record<string, unknown> = {}) {
  return {
    documentId: DID,
    projectId: PID,
    snapshot: sampleQuoteSnapshot(),
    replaces: null,
    actorId: ACTOR,
    ...over,
  } as any;
}

let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  S.existing = { data: null, error: null };
  S.render.mockResolvedValue({ buffer: BUF, sha256: 'abc123', size: BUF.length });
  S.upload.mockResolvedValue({ error: null });
  S.remove.mockResolvedValue({ error: null });
  S.rpc.mockResolvedValue({ ok: true, data: { outbox_ids: [] } });
  S.send.mockResolvedValue('sent');
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('aggregateMail', () => {
  it('aggregates', () => {
    expect(aggregateMail([])).toBe('none');
    expect(aggregateMail(['sent', 'sent'])).toBe('sent');
    expect(aggregateMail(['sent', 'failed', 'not_claimed'])).toBe('failed');
    expect(aggregateMail(['sent', 'not_claimed'])).toBe('pending');
  });
});

describe('issueDocument refusals', () => {
  it('refuses invoices before rendering', async () => {
    const r = await issueDocument(args({ snapshot: sampleInvoiceSnapshot() }));
    expect(r).toEqual({ ok: false, code: 'invoice_not_issuable' });
    expect(S.render).not.toHaveBeenCalled();
    expect(S.upload).not.toHaveBeenCalled();
  });
  it('refuses an unconfigured seller', async () => {
    const snap = sampleQuoteSnapshot({ seller: { ...sampleSeller, configured: false } });
    const r = await issueDocument(args({ snapshot: snap }));
    expect(r).toEqual({ ok: false, code: 'seller_not_configured' });
    expect(S.render).not.toHaveBeenCalled();
    expect(S.upload).not.toHaveBeenCalled();
  });
  it('refuses a seller with problems', async () => {
    const snap = sampleQuoteSnapshot({ seller: { ...sampleSeller, iban: 'À COMPLÉTER' } });
    const r = await issueDocument(args({ snapshot: snap }));
    expect(r).toEqual({ ok: false, code: 'seller_not_configured' });
  });
});

describe('issueDocument happy path', () => {
  it('uploads the exact buffer write-once then calls the RPC once', async () => {
    const snap = sampleQuoteSnapshot();
    const r = await issueDocument(args({ snapshot: snap, replaces: 'old-id' }));
    expect(r).toEqual({ ok: true, outcome: 'issued', documentId: DID, mail: 'none' });
    expect(S.upload).toHaveBeenCalledTimes(1);
    const [path, body, opts] = S.upload.mock.calls[0];
    expect(path).toBe(`${PID}/${DID}.pdf`);
    expect(body).toBe(BUF);
    expect(opts).toEqual({ contentType: 'application/pdf', upsert: false, cacheControl: '31536000' });
    expect(S.rpc).toHaveBeenCalledTimes(1);
    const [scope, fn, rpcArgs] = S.rpc.mock.calls[0];
    expect(scope).toBe('documents/issue');
    expect(fn).toBe('sv_issue_document');
    expect(rpcArgs).toEqual({
      p_id: DID,
      p_project_id: PID,
      p_doc_type: 'quote',
      p_revision: snap.revision,
      p_template_version: snap.templateVersion,
      p_reference: snap.reference,
      p_filename: buildFilename('quote', snap.reference),
      p_storage_path: `${PID}/${DID}.pdf`,
      p_sha256: 'abc123',
      p_size: BUF.length,
      p_snapshot: snap,
      p_replaces: 'old-id',
      p_actor: ACTOR,
      p_document_label: DOC_LABELS.quote,
    });
    expect(S.render).toHaveBeenCalledTimes(1);
  });
});

describe('issueDocument mail', () => {
  beforeEach(() => {
    S.rpc.mockResolvedValue({ ok: true, data: { outbox_ids: ['o1', 'o2'] } });
  });
  it('sent', async () => {
    const r = await issueDocument(args());
    expect(S.send).toHaveBeenCalledTimes(2);
    expect(r).toMatchObject({ ok: true, mail: 'sent' });
  });
  it('failed', async () => {
    S.send.mockResolvedValueOnce('sent').mockResolvedValueOnce('failed');
    expect(await issueDocument(args())).toMatchObject({ ok: true, mail: 'failed' });
  });
  it('pending', async () => {
    S.send.mockResolvedValueOnce('sent').mockResolvedValueOnce('not_claimed');
    expect(await issueDocument(args())).toMatchObject({ ok: true, mail: 'pending' });
  });
  it('throwing send never fails the issue', async () => {
    S.send.mockRejectedValue(new Error('boom'));
    expect(await issueDocument(args())).toEqual({ ok: true, outcome: 'issued', documentId: DID, mail: 'failed' });
  });
});

describe('issueDocument failures', () => {
  it('upload error with existing row is idempotent', async () => {
    S.upload.mockResolvedValue({ error: { message: 'Duplicate' } });
    S.existing = { data: { id: DID }, error: null };
    const r = await issueDocument(args());
    expect(r).toEqual({ ok: true, outcome: 'already_issued', documentId: DID, mail: 'none' });
    expect(S.rpc).not.toHaveBeenCalled();
  });
  it('upload error without row is upload_failed', async () => {
    S.upload.mockResolvedValue({ error: { message: 'x' } });
    const r = await issueDocument(args());
    expect(r).toEqual({ ok: false, code: 'upload_failed' });
    expect(S.rpc).not.toHaveBeenCalled();
    expect(S.upload).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['sv_document_already_issued', { ok: true, outcome: 'already_issued', documentId: DID, mail: 'none' }],
    ['sv_document_replaces_mismatch', { ok: false, code: 'replaces_mismatch' }],
    ['sv_document_revision_mismatch', { ok: false, code: 'revision_mismatch' }],
    ['sv_other', { ok: false, code: 'error' }],
    ['unknown', { ok: false, code: 'error' }],
  ])('maps rpc code %s', async (code, expected) => {
    S.rpc.mockResolvedValue({ ok: false, code });
    expect(await issueDocument(args())).toEqual(expected);
    expect(S.upload).toHaveBeenCalledTimes(1);
  });
  it('render failure maps to error', async () => {
    S.render.mockRejectedValue(new Error('render'));
    expect(await issueDocument(args())).toEqual({ ok: false, code: 'error' });
    expect(S.upload).not.toHaveBeenCalled();
  });
  it('logs only generic codes', async () => {
    S.upload.mockResolvedValue({ error: { message: `fail ${PID} a@b.fr 1234,00` } });
    await issueDocument(args());
    for (const call of errSpy.mock.calls) {
      const text = call.join(' ');
      expect(text).toMatch(/^\[documents\/issue\] [a-z_ ]+$/);
      expect(text).not.toContain(PID);
      expect(text).not.toContain('@');
    }
    expect(errSpy).toHaveBeenCalled();
  });
});

describe('issueDocument orphan cleanup (CR-01)', () => {
  it.each(['sv_document_replaces_mismatch', 'sv_document_revision_mismatch', 'sv_other'])(
    'removes the uploaded object when the rpc fails with %s',
    async (code) => {
      S.rpc.mockResolvedValue({ ok: false, code });
      const r = await issueDocument(args());
      expect(r.ok).toBe(false);
      expect(S.remove).toHaveBeenCalledTimes(1);
      expect(S.remove).toHaveBeenCalledWith([`${PID}/${DID}.pdf`]);
    },
  );
  it('maps sv_document_signed to signed_no_replace and removes the orphan (D-17)', async () => {
    S.rpc.mockResolvedValue({ ok: false, code: 'sv_document_signed' });
    expect(await issueDocument(args())).toEqual({ ok: false, code: 'signed_no_replace' });
    expect(S.remove).toHaveBeenCalledWith([`${PID}/${DID}.pdf`]);
  });
  it('keeps the object on already_issued', async () => {
    S.rpc.mockResolvedValue({ ok: false, code: 'sv_document_already_issued' });
    expect(await issueDocument(args())).toMatchObject({ ok: true, outcome: 'already_issued' });
    expect(S.remove).not.toHaveBeenCalled();
  });
  it('removes the object when the rpc throws', async () => {
    S.rpc.mockRejectedValue(new Error('network'));
    expect(await issueDocument(args())).toEqual({ ok: false, code: 'error' });
    expect(S.remove).toHaveBeenCalledWith([`${PID}/${DID}.pdf`]);
  });
  it('does not remove anything on success or when upload failed', async () => {
    await issueDocument(args());
    S.upload.mockResolvedValue({ error: { message: 'x' } });
    await issueDocument(args());
    expect(S.remove).not.toHaveBeenCalled();
  });
  it('a cleanup failure never changes the result', async () => {
    S.rpc.mockResolvedValue({ ok: false, code: 'sv_other' });
    S.remove.mockRejectedValue(new Error('x'));
    expect(await issueDocument(args())).toEqual({ ok: false, code: 'error' });
  });
  it('retry with the same id works once the failed attempt was cleaned up', async () => {
    const stored = new Set<string>();
    S.upload.mockImplementation(async (path: string) => {
      if (stored.has(path)) return { error: { message: 'Duplicate' } };
      stored.add(path);
      return { error: null };
    });
    S.remove.mockImplementation(async (paths: string[]) => {
      paths.forEach((p) => stored.delete(p));
      return { error: null };
    });
    S.rpc.mockResolvedValueOnce({ ok: false, code: 'sv_document_revision_mismatch' });
    expect(await issueDocument(args())).toEqual({ ok: false, code: 'revision_mismatch' });
    expect(await issueDocument(args())).toMatchObject({ ok: true, outcome: 'issued' });
  });
});
