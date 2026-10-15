import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECT_COPY } from '@/lib/projects/copy';

const access = vi.hoisted(() => ({ getAccessibleProject: vi.fn() }));
const prepare = vi.hoisted(() => ({ prepareDocument: vi.fn() }));
const render = vi.hoisted(() => ({ renderDocument: vi.fn() }));
const issue = vi.hoisted(() => ({ issueDocument: vi.fn() }));
const download = vi.hoisted(() => ({ createDocumentDownloadUrl: vi.fn(), verifyDocumentHash: vi.fn() }));
const read = vi.hoisted(() => ({ loadDocumentSnapshot: vi.fn() }));
const chain = vi.hoisted(() => ({ exportSignatureChain: vi.fn(), verifySignatureChainInDb: vi.fn() }));
const links = vi.hoisted(() => ({ createSealedDownloadUrl: vi.fn() }));
const seal = vi.hoisted(() => ({ finalizeSignature: vi.fn() }));
vi.mock('@/lib/server/projects/access', () => access);
vi.mock('@/lib/server/documents/prepare', () => prepare);
vi.mock('@/lib/server/documents/render', () => render);
vi.mock('@/lib/server/documents/issue', () => issue);
vi.mock('@/lib/server/documents/download', () => download);
vi.mock('@/lib/server/documents/read', () => read);
vi.mock('@/lib/server/signature/chain', () => chain);
vi.mock('@/lib/server/signature/links', () => links);
vi.mock('@/lib/server/signature/seal', () => seal);

import {
  exportSignatureTrailCore,
  findIssuedDocumentCore,
  issueDocumentCore,
  loadSnapshotCore,
  prepareDocumentCore,
  previewDocumentCore,
  resumeFinalizationCore,
  sealedDownloadCore,
  verifyDocumentHashCore,
  verifySignatureChainCore,
  downloadDocumentCore,
} from './documents';

const PID = '11111111-1111-4111-8111-111111111111';
const DID = '22222222-2222-4222-8222-222222222222';
const supabase = { from: vi.fn() };
const ctx = { supabase: supabase as never, user: { id: 'admin-1' } as never };
const DOC = PROJECT_COPY.documents.admin;
const GENERIC = PROJECT_COPY.errors.generic;
const quote = {
  projectId: PID,
  documentId: DID,
  docType: 'quote',
  lines: [{ designation: 'Site', quantity: 1, unitPriceCents: 100000 }],
  leadTime: '2 semaines',
};
const snapshot = { docType: 'quote', reference: 'DEV-1', revision: 1, totalCents: 100000 };

function rowCtx(row: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { supabase: { from } as never, user: { id: 'admin-1' } as never, from };
}

beforeEach(() => {
  for (const f of [
    ...Object.values(access),
    ...Object.values(prepare),
    ...Object.values(render),
    ...Object.values(issue),
    ...Object.values(download),
    ...Object.values(read),
    ...Object.values(chain),
    ...Object.values(links),
    ...Object.values(seal),
  ]) f.mockReset();
  access.getAccessibleProject.mockResolvedValue({ id: PID, clientId: 'c1' });
  prepare.prepareDocument.mockResolvedValue({ ok: true, snapshot, replaces: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('prepareDocumentCore', () => {
  it('returns validation field errors without touching the project', async () => {
    const r = await prepareDocumentCore(ctx, { ...quote, lines: [] }, 'preview');
    expect(r).toMatchObject({ ok: false, message: DOC.validationSummary });
    expect(r.ok === false && r.fieldErrors?.lines).toBeTruthy();
    expect(access.getAccessibleProject).not.toHaveBeenCalled();
  });
  it('issue mode refuses invoices (still preview-only), preview mode does not', async () => {
    const inv = { projectId: PID, documentId: DID, docType: 'invoice', kind: 'deposit', serviceDate: '2026-10-01' };
    expect(await prepareDocumentCore(ctx, inv, 'issue')).toEqual({ ok: false, message: DOC.invoiceHelper });
    expect((await prepareDocumentCore(ctx, inv, 'preview')).ok).toBe(true);
  });
  it('refuses an inaccessible project and maps prepare codes to messages', async () => {
    access.getAccessibleProject.mockResolvedValue(null);
    expect(await prepareDocumentCore(ctx, quote, 'issue')).toEqual({ ok: false, message: GENERIC });
    access.getAccessibleProject.mockResolvedValue({ id: PID, clientId: 'c1' });
    const cases: [string, string][] = [
      ['wrong_step', DOC.wrongStep],
      ['missing_quote', DOC.needQuote],
      ['missing_spec', DOC.needSpec],
      ['signed_no_replace', DOC.signedNoReplace],
      ['preview_only', DOC.invoiceHelper],
      ['load_failed', GENERIC],
    ];
    for (const [code, message] of cases) {
      prepare.prepareDocument.mockResolvedValue({ ok: false, code });
      expect(await prepareDocumentCore(ctx, quote, 'issue')).toEqual({ ok: false, message });
    }
  });
  it('passes the mode and the RLS client to prepareDocument, and replays the spec transformation', async () => {
    await prepareDocumentCore(ctx, quote, 'issue');
    expect(prepare.prepareDocument).toHaveBeenCalledWith(supabase, expect.objectContaining({ docType: 'quote' }), 'issue', expect.any(Date));
    const spec = {
      projectId: PID,
      documentId: DID,
      docType: 'spec',
      context: 'c',
      scope: 's',
      deliverables: 'd',
      acceptanceCriteria: '- un\n- deux',
    };
    await prepareDocumentCore(ctx, spec, 'preview');
    expect(prepare.prepareDocument.mock.calls[1][1]).toMatchObject({ acceptanceCriteriaList: ['un', 'deux'] });
  });
});

describe('previewDocumentCore', () => {
  it('renders the prepared snapshot', async () => {
    render.renderDocument.mockResolvedValue({ buffer: Buffer.from('pdf') });
    const r = await previewDocumentCore(ctx, quote);
    expect(prepare.prepareDocument.mock.calls[0][2]).toBe('preview');
    expect(r).toMatchObject({ ok: true, pdfBase64: Buffer.from('pdf').toString('base64'), snapshot });
  });
  it('maps a render failure to previewFailed', async () => {
    render.renderDocument.mockRejectedValue(new Error('x'));
    expect(await previewDocumentCore(ctx, quote)).toEqual({ ok: false, message: DOC.previewFailed });
  });
  it('propagates preparation failures', async () => {
    prepare.prepareDocument.mockResolvedValue({ ok: false, code: 'wrong_step' });
    expect(await previewDocumentCore(ctx, quote)).toEqual({ ok: false, message: DOC.wrongStep });
    expect(render.renderDocument).not.toHaveBeenCalled();
  });
});

describe('issueDocumentCore', () => {
  it('issues in issue mode as the session user and returns ids, reference and mail', async () => {
    issue.issueDocument.mockResolvedValue({ ok: true, outcome: 'issued', documentId: DID, mail: 'sent' });
    const r = await issueDocumentCore(ctx, quote);
    expect(prepare.prepareDocument.mock.calls[0][2]).toBe('issue');
    expect(issue.issueDocument).toHaveBeenCalledWith({ documentId: DID, projectId: PID, snapshot, replaces: null, actorId: 'admin-1' });
    expect(r).toEqual({ ok: true, data: { outcome: 'issued', mail: 'sent', documentId: DID, projectId: PID, reference: 'DEV-1', revision: 1 } });
  });
  it('never issues when preparation fails', async () => {
    prepare.prepareDocument.mockResolvedValue({ ok: false, code: 'wrong_step' });
    expect(await issueDocumentCore(ctx, quote)).toEqual({ ok: false, message: DOC.wrongStep });
    expect(await issueDocumentCore(ctx, { ...quote, lines: [] })).toMatchObject({ ok: false, message: DOC.validationSummary });
    expect(issue.issueDocument).not.toHaveBeenCalled();
  });
  it('maps issue failure codes', async () => {
    const cases: [string, string][] = [
      ['invoice_not_issuable', DOC.invoiceHelper],
      ['seller_not_configured', DOC.sellerNotConfigured],
      ['signed_no_replace', DOC.signedNoReplace],
      ['replaces_mismatch', DOC.concurrent],
      ['revision_mismatch', DOC.concurrent],
      ['upload_failed', DOC.issueFailed],
      ['error', DOC.issueFailed],
    ];
    for (const [code, message] of cases) {
      issue.issueDocument.mockResolvedValue({ ok: false, code });
      expect(await issueDocumentCore(ctx, quote)).toEqual({ ok: false, message });
    }
  });
});

describe('downloads and verification', () => {
  it('downloadDocumentCore returns the signed url only, and rejects non-uuids', async () => {
    download.createDocumentDownloadUrl.mockResolvedValue({ ok: true, url: 'https://s/d' });
    expect(await downloadDocumentCore(ctx, { documentId: DID })).toEqual({ ok: true, message: '', data: { url: 'https://s/d' } });
    expect(download.createDocumentDownloadUrl).toHaveBeenCalledWith(supabase, DID);
    const failed = { ok: false, message: PROJECT_COPY.documents.portal.downloadFailed };
    expect(await downloadDocumentCore(ctx, { documentId: 'x' })).toEqual(failed);
    download.createDocumentDownloadUrl.mockResolvedValue({ ok: false });
    expect(await downloadDocumentCore(ctx, { documentId: DID })).toEqual(failed);
  });
  it('verifyDocumentHashCore', async () => {
    download.verifyDocumentHash.mockResolvedValue({ ok: true, match: false });
    expect(await verifyDocumentHashCore(ctx, { documentId: DID })).toEqual({ ok: true, message: '', data: { match: false } });
    download.verifyDocumentHash.mockResolvedValue({ ok: false });
    expect(await verifyDocumentHashCore(ctx, { documentId: DID })).toEqual({ ok: false, message: GENERIC });
    expect(await verifyDocumentHashCore(ctx, { documentId: 'x' })).toEqual({ ok: false, message: GENERIC });
  });
  it('loadSnapshotCore', async () => {
    read.loadDocumentSnapshot.mockResolvedValue(snapshot);
    expect(await loadSnapshotCore(ctx, { documentId: DID })).toEqual({ ok: true, message: '', data: { snapshot } });
    read.loadDocumentSnapshot.mockResolvedValue(null);
    expect(await loadSnapshotCore(ctx, { documentId: DID })).toEqual({ ok: false, message: GENERIC });
    expect(await loadSnapshotCore(ctx, { documentId: 'x' })).toEqual({ ok: false, message: GENERIC });
  });
});

describe('signature trail', () => {
  const SIG = PROJECT_COPY.signature.admin;
  it('exports a sanitized filename with the verified json', async () => {
    const c = rowCtx({ reference: 'DEV 2026/1' });
    chain.exportSignatureChain.mockResolvedValue({ ok: true, json: '{"a":1}', verified: true });
    expect(await exportSignatureTrailCore(c, { documentId: DID })).toEqual({
      ok: true,
      message: '',
      data: { filename: 'piste-audit-DEV_2026_1.json', json: '{"a":1}' },
    });
  });
  it('maps missing document and chain failures to exportFailed, bad id to generic', async () => {
    expect(await exportSignatureTrailCore(rowCtx(null), { documentId: DID })).toEqual({ ok: false, message: SIG.exportFailed });
    chain.exportSignatureChain.mockResolvedValue({ ok: false, code: 'chain_broken', brokenAtSeq: 2 });
    expect(await exportSignatureTrailCore(rowCtx({ reference: 'R' }), { documentId: DID })).toEqual({ ok: false, message: SIG.exportFailed });
    expect(await exportSignatureTrailCore(rowCtx({ reference: 'R' }), { documentId: 'x' })).toEqual({ ok: false, message: GENERIC });
  });
  it('verifies the chain in the database', async () => {
    chain.verifySignatureChainInDb.mockResolvedValue({ ok: true, chainOk: true, count: 4, brokenAt: null, headHash: 'h' });
    const r = await verifySignatureChainCore(ctx, { documentId: DID });
    expect(r).toMatchObject({ ok: true, data: { intact: true, count: 4, brokenAt: null } });
    expect(r.ok && typeof r.data?.checkedAt).toBe('string');
    expect(JSON.stringify(r)).not.toContain('"h"');
    chain.verifySignatureChainInDb.mockResolvedValue({ ok: false, code: 'x' });
    expect(await verifySignatureChainCore(ctx, { documentId: DID })).toEqual({ ok: false, message: SIG.integrityFailure });
  });
  it('sealed download records the admin actor and ip', async () => {
    links.createSealedDownloadUrl.mockResolvedValue({ ok: true, url: 'https://s/sealed' });
    expect(await sealedDownloadCore(ctx, { documentId: DID, ip: '1.2.3.4' })).toEqual({ ok: true, message: '', data: { url: 'https://s/sealed' } });
    expect(links.createSealedDownloadUrl).toHaveBeenCalledWith(supabase, DID, { kind: 'admin', id: 'admin-1', ip: '1.2.3.4' });
    await sealedDownloadCore(ctx, { documentId: DID });
    expect(links.createSealedDownloadUrl.mock.calls[1][2]).toEqual({ kind: 'admin', id: 'admin-1', ip: null });
    links.createSealedDownloadUrl.mockResolvedValue({ ok: false });
    expect(await sealedDownloadCore(ctx, { documentId: DID })).toEqual({ ok: false, message: PROJECT_COPY.documents.portal.downloadFailed });
    expect(await sealedDownloadCore(ctx, { documentId: 'x' })).toEqual({ ok: false, message: PROJECT_COPY.documents.portal.downloadFailed });
  });
});

describe('resumeFinalizationCore', () => {
  it('finalizes and returns the project id for revalidation', async () => {
    seal.finalizeSignature.mockResolvedValue({ ok: true, outcome: 'sealed', sealSha256: 'x' });
    expect(await resumeFinalizationCore(rowCtx({ project_id: PID }), { documentId: DID })).toEqual({
      ok: true,
      message: '',
      data: { projectId: PID, outcome: 'sealed' },
    });
    expect(seal.finalizeSignature).toHaveBeenCalledWith(DID);
  });
  it('reports already_sealed when the seal existed', async () => {
    seal.finalizeSignature.mockResolvedValue({ ok: true, outcome: 'already_sealed' });
    expect(await resumeFinalizationCore(rowCtx({ project_id: PID }), { documentId: DID })).toMatchObject({ ok: true, data: { outcome: 'already_sealed' } });
  });
  it('never finalizes an unreadable document or with a bad id; maps failure to generic', async () => {
    expect(await resumeFinalizationCore(rowCtx(null), { documentId: DID })).toEqual({ ok: false, message: GENERIC });
    expect(await resumeFinalizationCore(rowCtx({ project_id: PID }), { documentId: 'x' })).toEqual({ ok: false, message: GENERIC });
    expect(seal.finalizeSignature).not.toHaveBeenCalled();
    seal.finalizeSignature.mockResolvedValue({ ok: false, code: 'not_signed' });
    expect(await resumeFinalizationCore(rowCtx({ project_id: PID }), { documentId: DID })).toEqual({ ok: false, message: GENERIC });
  });
});

describe('findIssuedDocumentCore', () => {
  it('recognises a document already issued under the id (read through RLS)', async () => {
    const c = rowCtx({ id: DID, reference: 'DEV-1', revision: 2, doc_type: 'quote' });
    expect(await findIssuedDocumentCore(c, { documentId: DID })).toEqual({ documentId: DID, reference: 'DEV-1', revision: 2 });
    expect(c.from).toHaveBeenCalledWith('sv_project_documents');
  });
  it('returns null for an unknown or malformed id', async () => {
    expect(await findIssuedDocumentCore(rowCtx(null), { documentId: DID })).toBeNull();
    expect(await findIssuedDocumentCore(rowCtx({ id: DID }), { documentId: 'x' })).toBeNull();
  });
});
