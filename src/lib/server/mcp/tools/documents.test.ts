import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { runTool } from '../registry';

const access = vi.hoisted(() => ({ getAccessibleProject: vi.fn() }));
const prepare = vi.hoisted(() => ({ prepareDocument: vi.fn() }));
const render = vi.hoisted(() => ({ renderDocument: vi.fn() }));
const issue = vi.hoisted(() => ({ issueDocument: vi.fn() }));
const download = vi.hoisted(() => ({ createDocumentDownloadUrl: vi.fn(), verifyDocumentHash: vi.fn() }));
const read = vi.hoisted(() => ({ loadDocumentSnapshot: vi.fn() }));
const chain = vi.hoisted(() => ({ exportSignatureChain: vi.fn(), verifySignatureChainInDb: vi.fn() }));
const links = vi.hoisted(() => ({ createSealedDownloadUrl: vi.fn() }));
const seal = vi.hoisted(() => ({ finalizeSignature: vi.fn() }));
const projects = vi.hoisted(() => ({ loadProjectBundle: vi.fn() }));
const docView = vi.hoisted(() => ({ loadAdminDocumentsView: vi.fn() }));
const sigView = vi.hoisted(() => ({ loadSignatureViews: vi.fn() }));
vi.mock('@/lib/server/projects/access', () => access);
vi.mock('@/lib/server/documents/prepare', () => prepare);
vi.mock('@/lib/server/documents/render', () => render);
vi.mock('@/lib/server/documents/issue', () => issue);
vi.mock('@/lib/server/documents/download', () => download);
vi.mock('@/lib/server/documents/read', () => read);
vi.mock('@/lib/server/signature/chain', () => chain);
vi.mock('@/lib/server/signature/links', () => links);
vi.mock('@/lib/server/signature/seal', () => seal);
vi.mock('@/lib/server/projects/read', () => projects);
vi.mock('@/lib/server/documents/adminView', () => docView);
vi.mock('@/lib/server/signature/adminView', () => sigView);

import { documentTools } from './documents';

const PID = '11111111-1111-4111-8111-111111111111';
const DID = '22222222-2222-4222-8222-222222222222';
const principal = { tokenId: 't1', userId: 'admin-1' };
const audit = vi.fn();
const DOC = PROJECT_COPY.documents.admin;

function makeCtx(row: unknown = { project_id: PID, doc_type: 'contract', reference: 'CTR-1', revision: 1 }) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { supabase: { from } as never, user: { id: 'admin-1' } as never };
}
let ctx = makeCtx();
const tool = (name: string) => {
  const t = documentTools.find((x) => x.name === name);
  if (!t) throw new Error(`missing tool ${name}`);
  return t;
};

const quoteArgs = {
  projectId: PID,
  documentId: DID,
  docType: 'quote',
  lines: [
    { designation: 'Site vitrine', quantity: 1, unitPriceCents: 150000 },
    { designation: 'SEO', quantity: 2, unitPriceCents: 25000 },
  ],
  leadTime: '4 semaines',
};
const quoteSnapshot = {
  docType: 'quote',
  reference: 'DEV-2026-1',
  revision: 2,
  issuedOn: '2026-10-15',
  seller: { iban: 'FR76SECRET', email: 'contact@sevalys.com' },
  client: { name: 'ACME SAS', siret: '12345678901234' },
  project: { id: PID, title: 'Refonte', offerLabel: 'Site' },
  lines: [
    { designation: 'Site vitrine', quantity: 1, unitPriceCents: 150000, totalCents: 150000 },
    { designation: 'SEO', quantity: 2, unitPriceCents: 25000, totalCents: 50000 },
  ],
  totalCents: 200000,
  depositPercent: 30,
  depositCents: 60000,
  balanceCents: 140000,
  validityDays: 30,
  validUntil: '2026-11-14',
  leadTime: '4 semaines',
};

beforeEach(() => {
  audit.mockReset();
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
    ...Object.values(projects),
    ...Object.values(docView),
    ...Object.values(sigView),
  ]) f.mockReset();
  ctx = makeCtx();
  access.getAccessibleProject.mockResolvedValue({ id: PID, clientId: 'c1' });
  prepare.prepareDocument.mockResolvedValue({ ok: true, snapshot: quoteSnapshot, replaces: 'old-doc' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('documentTools metadata', () => {
  it('declares exact names and covers', () => {
    expect(Object.fromEntries(documentTools.map((t) => [t.name, t.covers]))).toEqual({
      preview_document: ['previewDocumentAction'],
      issue_document: ['issueDocumentAction'],
      get_document_url: ['adminDocumentDownloadAction'],
      verify_document_hash: ['verifyDocumentHashAction'],
      export_signature_trail: ['exportSignatureTrailAction'],
      verify_signature_chain: ['verifySignatureChainAction'],
      get_sealed_document_url: ['adminSealedDownloadAction'],
      resume_signature_finalization: ['adminResumeFinalizationAction'],
      get_document_snapshot: ['loadSnapshotAction'],
      list_project_documents: [],
    });
    expect(documentTools.filter((t) => t.destructive).map((t) => t.name).sort()).toEqual(['issue_document', 'resume_signature_finalization']);
  });
});

describe('preview_document', () => {
  it('prepares in preview mode and returns a readable summary without the pdf by default', async () => {
    render.renderDocument.mockResolvedValue({ buffer: Buffer.from('pdf-bytes') });
    const r = await runTool(tool('preview_document'), quoteArgs, ctx, principal, audit);
    expect(prepare.prepareDocument.mock.calls[0][2]).toBe('preview');
    expect(r).toMatchObject({
      ok: true,
      data: { summary: { docType: 'quote', reference: 'DEV-2026-1', revision: 2, totalCents: 200000, depositCents: 60000, balanceCents: 140000, client: 'ACME SAS' } },
    });
    const json = JSON.stringify(r);
    expect(json).not.toContain(Buffer.from('pdf-bytes').toString('base64'));
    expect(json).not.toContain('FR76SECRET');
    expect(json).not.toContain('12345678901234');
  });
  it('returns the pdf only when asked', async () => {
    render.renderDocument.mockResolvedValue({ buffer: Buffer.from('pdf-bytes') });
    const r = await runTool(tool('preview_document'), { ...quoteArgs, includePdf: true }, ctx, principal, audit);
    expect(JSON.stringify(r)).toContain(Buffer.from('pdf-bytes').toString('base64'));
  });
  it('a refusal is an audited error with the web message and field errors are lost only as the message', async () => {
    prepare.prepareDocument.mockResolvedValue({ ok: false, code: 'wrong_step' });
    expect(await runTool(tool('preview_document'), quoteArgs, ctx, principal, audit)).toEqual({ ok: false, error: DOC.wrongStep });
  });
  it('is not destructive', () => {
    expect(tool('preview_document').destructive).toBeFalsy();
  });
});

describe('issue_document', () => {
  it('without confirm never issues; the preview runs the issue-mode checks and shows what would be issued', async () => {
    const r = await runTool(tool('issue_document'), quoteArgs, ctx, principal, audit);
    expect(issue.issueDocument).not.toHaveBeenCalled();
    expect(prepare.prepareDocument.mock.calls[0][2]).toBe('issue');
    expect(r).toMatchObject({
      ok: true,
      needsConfirmation: true,
      preview: { wouldIssue: true, summary: { reference: 'DEV-2026-1', revision: 2, totalCents: 200000, depositCents: 60000, balanceCents: 140000, client: 'ACME SAS' }, replacesPreviousRevision: true },
    });
    const json = JSON.stringify(r);
    expect(json).toMatch(/e-mail/);
    expect(json).not.toContain('FR76SECRET');
  });
  it('the preview reports a blocking check instead of pretending it would issue', async () => {
    prepare.prepareDocument.mockResolvedValue({ ok: false, code: 'wrong_step' });
    const r = await runTool(tool('issue_document'), quoteArgs, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true, preview: { wouldIssue: false, message: DOC.wrongStep } });
    expect(issue.issueDocument).not.toHaveBeenCalled();
  });
  it('the preview reports validation errors', async () => {
    const r = await runTool(tool('issue_document'), { ...quoteArgs, lines: [] }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true, preview: { wouldIssue: false, message: DOC.validationSummary } });
  });
  it('with confirm re-runs the same checks, issues and returns the document id and reference', async () => {
    issue.issueDocument.mockResolvedValue({ ok: true, outcome: 'issued', documentId: DID, mail: 'sent' });
    const r = await runTool(tool('issue_document'), { ...quoteArgs, confirm: true }, ctx, principal, audit);
    expect(prepare.prepareDocument.mock.calls[0][2]).toBe('issue');
    expect(issue.issueDocument).toHaveBeenCalledWith({ documentId: DID, projectId: PID, snapshot: quoteSnapshot, replaces: 'old-doc', actorId: 'admin-1' });
    expect(r).toMatchObject({ ok: true, data: { issued: true, outcome: 'issued', documentId: DID, reference: 'DEV-2026-1', revision: 2, mail: 'sent' } });
  });
  it('confirm never skips a check: a failing check blocks the issuance as an audited error', async () => {
    prepare.prepareDocument.mockResolvedValue({ ok: false, code: 'signed_no_replace' });
    const r = await runTool(tool('issue_document'), { ...quoteArgs, confirm: true }, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: DOC.signedNoReplace });
    expect(issue.issueDocument).not.toHaveBeenCalled();
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ tool: 'issue_document', outcome: 'error' }));
  });
  it('an invoice docType is still refused when confirmed', async () => {
    const r = await runTool(
      tool('issue_document'),
      { projectId: PID, documentId: DID, docType: 'invoice', kind: 'deposit', serviceDate: '2026-10-01', confirm: true },
      ctx,
      principal,
      audit,
    );
    expect(r).toEqual({ ok: false, error: DOC.invoiceHelper });
    expect(issue.issueDocument).not.toHaveBeenCalled();
  });
  it('an issuance failure code maps to the web message', async () => {
    issue.issueDocument.mockResolvedValue({ ok: false, code: 'seller_not_configured' });
    expect(await runTool(tool('issue_document'), { ...quoteArgs, confirm: true }, ctx, principal, audit)).toEqual({
      ok: false,
      error: DOC.sellerNotConfigured,
    });
  });
});

describe('signed urls and verification', () => {
  it('get_document_url returns the url only', async () => {
    download.createDocumentDownloadUrl.mockResolvedValue({ ok: true, url: 'https://s/d' });
    expect(await runTool(tool('get_document_url'), { documentId: DID }, ctx, principal, audit)).toMatchObject({ ok: true, data: { ok: true, data: { url: 'https://s/d' } } });
  });
  it('get_sealed_document_url passes the admin actor with no ip', async () => {
    links.createSealedDownloadUrl.mockResolvedValue({ ok: true, url: 'https://s/sealed' });
    const r = await runTool(tool('get_sealed_document_url'), { documentId: DID }, ctx, principal, audit);
    expect(links.createSealedDownloadUrl).toHaveBeenCalledWith(ctx.supabase, DID, { kind: 'admin', id: 'admin-1', ip: null });
    expect(r).toMatchObject({ ok: true, data: { ok: true, data: { url: 'https://s/sealed' } } });
  });
  it('verify_document_hash', async () => {
    download.verifyDocumentHash.mockResolvedValue({ ok: true, match: true });
    expect(await runTool(tool('verify_document_hash'), { documentId: DID }, ctx, principal, audit)).toMatchObject({ ok: true, data: { data: { match: true } } });
  });
  it('verify_signature_chain', async () => {
    chain.verifySignatureChainInDb.mockResolvedValue({ ok: true, chainOk: true, count: 3, brokenAt: null, headHash: 'h' });
    const r = await runTool(tool('verify_signature_chain'), { documentId: DID }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, data: { data: { intact: true, count: 3 } } });
  });
  it('export_signature_trail returns the verified json', async () => {
    chain.exportSignatureChain.mockResolvedValue({ ok: true, json: '{"events":[]}', verified: true });
    const r = await runTool(tool('export_signature_trail'), { documentId: DID }, makeCtx({ reference: 'CTR-1' }), principal, audit);
    expect(r).toMatchObject({ ok: true, data: { data: { filename: 'piste-audit-CTR-1.json', json: '{"events":[]}' } } });
  });
  it('get_document_snapshot drops the seller identity', async () => {
    read.loadDocumentSnapshot.mockResolvedValue(quoteSnapshot);
    const r = await runTool(tool('get_document_snapshot'), { documentId: DID }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, data: { snapshot: { reference: 'DEV-2026-1', totalCents: 200000 } } });
    expect(JSON.stringify(r)).not.toContain('FR76SECRET');
  });
  it('non-uuid ids are invalid_input', async () => {
    expect(await runTool(tool('get_document_url'), { documentId: 'x' }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
  });
});

describe('resume_signature_finalization', () => {
  it('without confirm never finalizes and previews the signed document and its side effects', async () => {
    sigView.loadSignatureViews.mockResolvedValue(
      new Map([[DID, { signature: { signerName: 'Jean', signerRole: 'Gérant', signerEmail: 'jean@acme.fr', signedAtUtc: '2026-10-01T10:00:00Z', ip: '1.2.3.4' }, seal: null, pendingFinalization: true }]]),
    );
    const r = await runTool(tool('resume_signature_finalization'), { documentId: DID }, ctx, principal, audit);
    expect(seal.finalizeSignature).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, needsConfirmation: true, preview: { documentId: DID, reference: 'CTR-1', docType: 'contract', pendingFinalization: true, signer: { name: 'Jean' } } });
    const json = JSON.stringify(r);
    expect(json).toContain('j***@a***.fr');
    expect(json).not.toContain('jean@acme.fr');
    expect(json).toMatch(/facture/i);
  });
  it('with confirm finalizes', async () => {
    seal.finalizeSignature.mockResolvedValue({ ok: true, outcome: 'sealed', sealSha256: 'x' });
    const r = await runTool(tool('resume_signature_finalization'), { documentId: DID, confirm: true }, ctx, principal, audit);
    expect(seal.finalizeSignature).toHaveBeenCalledWith(DID);
    expect(r).toMatchObject({ ok: true, data: { resumed: true } });
  });
  it('a failed finalization is an audited error', async () => {
    seal.finalizeSignature.mockResolvedValue({ ok: false, code: 'not_signed' });
    const r = await runTool(tool('resume_signature_finalization'), { documentId: DID, confirm: true }, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: PROJECT_COPY.errors.generic });
  });
});

describe('list_project_documents', () => {
  it('returns what the admin page shows with the signer e-mail masked', async () => {
    projects.loadProjectBundle.mockResolvedValue({ project: { id: PID } });
    docView.loadAdminDocumentsView.mockResolvedValue({
      expected: [{ docType: 'quote', activeRevision: 1, canIssue: true, blockedReason: null }],
      issued: [{ id: DID, docType: 'contract', revision: 1, issuedAt: 'x', status: 'signed', templateVersion: 'v2', sha256: 'abc', sizeBytes: 10, replacedBy: null }],
      activeQuote: null,
      activeSpec: null,
      parties: { clientName: 'ACME SAS', signatory: 'Jean, Gérant', offerLabel: 'Site' },
    });
    sigView.loadSignatureViews.mockResolvedValue(
      new Map([
        [
          DID,
          {
            eventCount: 2,
            events: [{ seq: 1, label: 'Document ouvert', actorKind: 'client', ip: '1.2.3.4', occurredAtUtc: 'u' }],
            signature: { signerName: 'Jean', signerRole: 'Gérant', signerEmail: 'jean@acme.fr', signedAt: 'a', signedAtUtc: 'u', ip: '1.2.3.4', consentVersion: 'v1', signedLinkHash: 'LINKHASH' },
            seal: { sha256: 'sealhash', sealedAt: 's' },
            pendingFinalization: false,
            reserves: [],
            refusal: null,
          },
        ],
      ]),
    );
    const r = await runTool(tool('list_project_documents'), { projectId: PID }, ctx, principal, audit);
    expect(projects.loadProjectBundle).toHaveBeenCalledWith(ctx.supabase, PID, expect.any(Date));
    expect(docView.loadAdminDocumentsView).toHaveBeenCalled();
    expect(r).toMatchObject({
      ok: true,
      data: {
        parties: { clientName: 'ACME SAS' },
        documents: [{ id: DID, docType: 'contract', status: 'signed', signature: { signerName: 'Jean', signerEmail: 'j***@a***.fr' }, seal: { sha256: 'sealhash' } }],
      },
    });
    const json = JSON.stringify(r);
    expect(json).not.toContain('jean@acme.fr');
    expect(json).not.toContain('LINKHASH');
  });
  it('fails when the project does not exist', async () => {
    projects.loadProjectBundle.mockResolvedValue(null);
    expect(await runTool(tool('list_project_documents'), { projectId: PID }, ctx, principal, audit)).toMatchObject({ ok: false });
  });
});
