import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECT_COPY } from '@/lib/projects/copy';

const requireAdmin = vi.fn();
vi.mock('@/lib/server/auth/dal', () => ({ requireAdmin: () => requireAdmin() }));

const getAccessibleProject = vi.fn();
vi.mock('@/lib/server/projects/access', () => ({
  getAccessibleProject: (...a: unknown[]) => getAccessibleProject(...a),
}));

// Modules non concernés par ce fichier de tests.
vi.mock('@/lib/server/projects/content', () => ({ addProjectLink: vi.fn() }));
vi.mock('@/lib/server/projects/facts', () => ({ postProjectFact: vi.fn(), revokeProjectFact: vi.fn() }));
vi.mock('@/lib/server/projects/files', () => ({
  requestUpload: vi.fn(),
  confirmUpload: vi.fn(),
  createDownloadUrl: vi.fn(),
}));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

const prepareDocument = vi.fn();
vi.mock('@/lib/server/documents/prepare', () => ({ prepareDocument: (...a: unknown[]) => prepareDocument(...a) }));
const renderDocument = vi.fn();
vi.mock('@/lib/server/documents/render', () => ({ renderDocument: (...a: unknown[]) => renderDocument(...a) }));
const issueDocument = vi.fn();
vi.mock('@/lib/server/documents/issue', () => ({ issueDocument: (...a: unknown[]) => issueDocument(...a) }));
const loadDocumentSnapshot = vi.fn();
vi.mock('@/lib/server/documents/read', () => ({
  loadDocumentSnapshot: (...a: unknown[]) => loadDocumentSnapshot(...a),
}));
const createDocumentDownloadUrl = vi.fn();
const verifyDocumentHash = vi.fn();
vi.mock('@/lib/server/documents/download', () => ({
  createDocumentDownloadUrl: (...a: unknown[]) => createDocumentDownloadUrl(...a),
  verifyDocumentHash: (...a: unknown[]) => verifyDocumentHash(...a),
}));

const {
  previewDocumentAction,
  issueDocumentAction,
  adminDocumentDownloadAction,
  verifyDocumentHashAction,
  loadSnapshotAction,
} = await import('./actions');

const PID = '11111111-1111-4111-8111-111111111111';
const DID = '22222222-2222-4222-8222-222222222222';
const supabase = { tag: 'rls' };
const COPY = PROJECT_COPY.documents.admin;

const quoteInput = {
  projectId: PID,
  documentId: DID,
  docType: 'quote',
  lines: [{ designation: 'Site vitrine', quantity: 1, unitPriceCents: 100000 }],
  depositPercent: 30,
  validityDays: 30,
  leadTime: '4 semaines',
};
const invoiceInput = {
  projectId: PID,
  documentId: DID,
  docType: 'invoice',
  kind: 'deposit',
  serviceDate: '2026-03-10',
};
const snapshot = { docType: 'quote', reference: 'DEV-1' };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ user: { id: 'admin-1' }, supabase });
  getAccessibleProject.mockResolvedValue({ id: PID, clientId: 'c1' });
  prepareDocument.mockResolvedValue({ ok: true, snapshot, replaces: null });
  renderDocument.mockResolvedValue({ buffer: Buffer.from('PDFBYTES'), sha256: 'x', size: 8 });
  issueDocument.mockResolvedValue({ ok: true, outcome: 'issued', documentId: DID, mail: 'sent' });
  createDocumentDownloadUrl.mockResolvedValue({ ok: true, url: 'https://s/d' });
  verifyDocumentHash.mockResolvedValue({ ok: true, match: true });
  loadDocumentSnapshot.mockResolvedValue(snapshot);
});

const modules = [
  prepareDocument,
  renderDocument,
  issueDocument,
  createDocumentDownloadUrl,
  verifyDocumentHash,
  loadDocumentSnapshot,
];

const guarded: [string, () => Promise<unknown>][] = [
  ['previewDocumentAction', () => previewDocumentAction(quoteInput)],
  ['issueDocumentAction', () => issueDocumentAction(quoteInput)],
  ['adminDocumentDownloadAction', () => adminDocumentDownloadAction(DID)],
  ['verifyDocumentHashAction', () => verifyDocumentHashAction(DID)],
  ['loadSnapshotAction', () => loadSnapshotAction(DID)],
];

describe.each(guarded)('%s guard', (_n, run) => {
  it('propagates requireAdmin rejection and reaches no module', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(run()).rejects.toThrow('NOT_FOUND');
    for (const m of modules) expect(m).not.toHaveBeenCalled();
    expect(getAccessibleProject).not.toHaveBeenCalled();
  });
});

describe('previewDocumentAction', () => {
  it('returns field errors for an invalid input without reaching prepare', async () => {
    const bad = { ...quoteInput, lines: [{ designation: '', quantity: 1, unitPriceCents: 1 }] };
    const res = await previewDocumentAction(bad);
    expect(res).toMatchObject({ ok: false, message: COPY.validationSummary });
    expect(res.ok === false && res.fieldErrors && Object.keys(res.fieldErrors)).toContain('lines.0.designation');
    expect(prepareDocument).not.toHaveBeenCalled();
  });

  it('returns a generic error for an inaccessible project', async () => {
    getAccessibleProject.mockResolvedValue(null);
    const res = await previewDocumentAction(quoteInput);
    expect(res).toEqual({ ok: false, message: PROJECT_COPY.errors.generic });
    expect(prepareDocument).not.toHaveBeenCalled();
  });

  it.each([
    ['wrong_step', COPY.wrongStep],
    ['missing_quote', COPY.needQuote],
    ['missing_spec', COPY.needSpec],
    ['signed_no_replace', COPY.signedNoReplace],
  ])('maps prepare code %s to its message', async (code, message) => {
    prepareDocument.mockResolvedValue({ ok: false, code });
    expect(await previewDocumentAction(quoteInput)).toEqual({ ok: false, message });
    expect(renderDocument).not.toHaveBeenCalled();
  });

  it('renders once and returns base64 without storing or revalidating', async () => {
    const res = await previewDocumentAction(quoteInput);
    expect(res).toEqual({ ok: true, pdfBase64: Buffer.from('PDFBYTES').toString('base64') });
    expect(prepareDocument).toHaveBeenCalledWith(supabase, expect.objectContaining({ docType: 'quote' }), 'preview', expect.any(Date));
    expect(renderDocument).toHaveBeenCalledTimes(1);
    expect(issueDocument).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('returns previewFailed when rendering throws', async () => {
    renderDocument.mockRejectedValue(new Error('boom'));
    expect(await previewDocumentAction(quoteInput)).toEqual({ ok: false, message: COPY.previewFailed });
  });

  it('passes the transformed spec input (criteria list, defaults) to prepare', async () => {
    const spec = {
      projectId: PID,
      documentId: DID,
      docType: 'spec',
      context: 'Ctx',
      scope: 'Scope',
      deliverables: 'Livrables',
      acceptanceCriteria: '- Un\n2. Deux',
    };
    const res = await previewDocumentAction(spec);
    expect(res.ok).toBe(true);
    expect(prepareDocument.mock.calls[0][1]).toMatchObject({
      acceptanceCriteriaList: ['Un', 'Deux'],
      outOfScope: '',
      planning: '',
    });
  });

  it('allows an invoice preview', async () => {
    const res = await previewDocumentAction(invoiceInput);
    expect(res.ok).toBe(true);
  });
});

describe('issueDocumentAction', () => {
  it('refuses an invoice before any module', async () => {
    const res = await issueDocumentAction(invoiceInput);
    expect(res).toEqual({ ok: false, message: COPY.invoiceHelper });
    expect(prepareDocument).not.toHaveBeenCalled();
    expect(issueDocument).not.toHaveBeenCalled();
  });

  it('issues, reports mail and revalidates admin and portal paths', async () => {
    const res = await issueDocumentAction(quoteInput);
    expect(res).toEqual({ ok: true, outcome: 'issued', mail: 'sent' });
    expect(prepareDocument).toHaveBeenCalledWith(supabase, expect.objectContaining({ docType: 'quote' }), 'issue', expect.any(Date));
    expect(issueDocument).toHaveBeenCalledWith({
      documentId: DID,
      projectId: PID,
      snapshot,
      replaces: null,
      actorId: 'admin-1',
    });
    const paths = revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toContain(`/admin/projets/${PID}`);
    expect(paths).toContain('/espace-client');
    expect(paths).toContain('/espace-client/documents');
  });

  it('passes the replaced document id through', async () => {
    prepareDocument.mockResolvedValue({ ok: true, snapshot, replaces: 'old-id' });
    await issueDocumentAction(quoteInput);
    expect(issueDocument).toHaveBeenCalledWith(expect.objectContaining({ replaces: 'old-id' }));
  });

  it('reports already_issued', async () => {
    issueDocument.mockResolvedValue({ ok: true, outcome: 'already_issued', documentId: DID, mail: 'none' });
    expect(await issueDocumentAction(quoteInput)).toEqual({ ok: true, outcome: 'already_issued', mail: 'none' });
  });

  it('does not call issueDocument when prepare refuses', async () => {
    prepareDocument.mockResolvedValue({ ok: false, code: 'wrong_step' });
    expect(await issueDocumentAction(quoteInput)).toEqual({ ok: false, message: COPY.wrongStep });
    expect(issueDocument).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ['seller_not_configured', COPY.sellerNotConfigured],
    ['replaces_mismatch', COPY.concurrent],
    ['revision_mismatch', COPY.concurrent],
    ['upload_failed', COPY.issueFailed],
    ['error', COPY.issueFailed],
  ])('maps issue error %s to its message', async (code, message) => {
    issueDocument.mockResolvedValue({ ok: false, code });
    expect(await issueDocumentAction(quoteInput)).toEqual({ ok: false, message });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('id based actions', () => {
  it('rejects a non-uuid id without calling the module', async () => {
    expect((await adminDocumentDownloadAction('nope')).ok).toBe(false);
    expect((await verifyDocumentHashAction('nope')).ok).toBe(false);
    expect((await loadSnapshotAction('nope')).ok).toBe(false);
    expect(createDocumentDownloadUrl).not.toHaveBeenCalled();
    expect(verifyDocumentHash).not.toHaveBeenCalled();
    expect(loadDocumentSnapshot).not.toHaveBeenCalled();
  });

  it('passes the admin RLS client to each module', async () => {
    expect(await adminDocumentDownloadAction(DID)).toEqual({ ok: true, url: 'https://s/d' });
    expect(await verifyDocumentHashAction(DID)).toEqual({ ok: true, match: true });
    expect(await loadSnapshotAction(DID)).toEqual({ ok: true, snapshot });
    expect(createDocumentDownloadUrl).toHaveBeenCalledWith(supabase, DID);
    expect(verifyDocumentHash).toHaveBeenCalledWith(supabase, DID);
    expect(loadDocumentSnapshot).toHaveBeenCalledWith(supabase, DID);
  });

  it('returns failures for module errors', async () => {
    createDocumentDownloadUrl.mockResolvedValue({ ok: false, code: 'not_found' });
    verifyDocumentHash.mockResolvedValue({ ok: false, code: 'error' });
    loadDocumentSnapshot.mockResolvedValue(null);
    expect(await adminDocumentDownloadAction(DID)).toEqual({
      ok: false,
      message: PROJECT_COPY.documents.portal.downloadFailed,
    });
    expect((await verifyDocumentHashAction(DID)).ok).toBe(false);
    expect((await loadSnapshotAction(DID)).ok).toBe(false);
  });
});
