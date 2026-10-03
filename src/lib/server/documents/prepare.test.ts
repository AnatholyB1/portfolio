/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const loadProjectBundle = vi.fn();
vi.mock('@/lib/server/projects/read', () => ({ loadProjectBundle: (...a: unknown[]) => loadProjectBundle(...a) }));

const loadProjectDocuments = vi.fn();
const loadActiveSnapshot = vi.fn();
vi.mock('./read', () => ({
  loadProjectDocuments: (...a: unknown[]) => loadProjectDocuments(...a),
  loadActiveSnapshot: (...a: unknown[]) => loadActiveSnapshot(...a),
}));

const checkIssuable = vi.fn();
const checkPreviewable = vi.fn();
vi.mock('@/lib/documents/steps', async (orig) => ({
  ...(await orig<typeof import('@/lib/documents/steps')>()),
  checkIssuable: (...a: unknown[]) => checkIssuable(...a),
  checkPreviewable: (...a: unknown[]) => checkPreviewable(...a),
}));

const buildSnapshot = vi.fn();
vi.mock('@/lib/documents/snapshot', () => ({ buildSnapshot: (...a: unknown[]) => buildSnapshot(...a) }));

const { prepareDocument } = await import('./prepare');
const { SELLER_V1 } = await import('@/lib/documents/seller');

const PID = '11111111-1111-4111-8111-111111111111';
const rls: any = { tag: 'rls' };
const now = new Date('2026-03-10T10:00:00Z');
const input = (docType: string) => ({ projectId: PID, documentId: 'd', docType }) as any;
const bundle = {
  project: { id: PID, title: 'T', offer: 'site', startedAt: '2026-01-01T00:00:00Z' },
  client: { id: 'c', name: 'C', siret: null, company: null },
  facts: [{ id: 1 }],
  onboarding: { x: 1 },
};
const snap = { docType: 'x' };

beforeEach(() => {
  vi.clearAllMocks();
  loadProjectBundle.mockResolvedValue(bundle);
  loadProjectDocuments.mockResolvedValue([{ id: 'doc1' }]);
  checkIssuable.mockReturnValue({ ok: true, replaces: null, revision: 1 });
  checkPreviewable.mockReturnValue({ ok: true, replaces: null, revision: 1 });
  loadActiveSnapshot.mockResolvedValue({ doc: { id: 'q' }, snapshot: snap });
  buildSnapshot.mockReturnValue({ built: true });
});

describe('prepareDocument', () => {
  it('returns not_found when the bundle is missing', async () => {
    loadProjectBundle.mockResolvedValue(null);
    expect(await prepareDocument(rls, input('quote'), 'issue', now)).toEqual({ ok: false, code: 'not_found' });
  });

  it('uses checkIssuable for issue and checkPreviewable for preview', async () => {
    await prepareDocument(rls, input('quote'), 'issue', now);
    expect(checkIssuable).toHaveBeenCalledTimes(1);
    expect(checkPreviewable).not.toHaveBeenCalled();
    await prepareDocument(rls, input('quote'), 'preview', now);
    expect(checkPreviewable).toHaveBeenCalledTimes(1);
  });

  it.each(['wrong_step', 'missing_quote', 'missing_spec', 'signed_no_replace', 'preview_only'])(
    'returns check code %s unchanged',
    async (code) => {
      checkIssuable.mockReturnValue({ ok: false, code });
      expect(await prepareDocument(rls, input('quote'), 'issue', now)).toEqual({ ok: false, code });
      expect(buildSnapshot).not.toHaveBeenCalled();
    },
  );

  it('loads the quote snapshot for a contract and returns missing_quote when absent', async () => {
    await prepareDocument(rls, input('contract'), 'issue', now);
    expect(loadActiveSnapshot).toHaveBeenCalledWith(rls, PID, 'quote');
    expect(buildSnapshot.mock.calls[0][2]).toEqual({ quote: snap });
    loadActiveSnapshot.mockResolvedValue(null);
    expect(await prepareDocument(rls, input('contract'), 'issue', now)).toEqual({ ok: false, code: 'missing_quote' });
  });

  it('loads the spec snapshot for an acceptance and returns missing_spec when absent', async () => {
    await prepareDocument(rls, input('acceptance'), 'issue', now);
    expect(loadActiveSnapshot).toHaveBeenCalledWith(rls, PID, 'spec');
    expect(buildSnapshot.mock.calls[0][2]).toEqual({ spec: snap });
    loadActiveSnapshot.mockResolvedValue(null);
    expect(await prepareDocument(rls, input('acceptance'), 'issue', now)).toEqual({ ok: false, code: 'missing_spec' });
  });

  it('uses the quote as prerequisite for an invoice preview', async () => {
    await prepareDocument(rls, input('invoice'), 'preview', now);
    expect(loadActiveSnapshot).toHaveBeenCalledWith(rls, PID, 'quote');
  });

  it('does not load a prerequisite for a quote', async () => {
    await prepareDocument(rls, input('quote'), 'issue', now);
    expect(loadActiveSnapshot).not.toHaveBeenCalled();
  });

  it('builds the snapshot server-side with seller, Paris date, revision and replaces id', async () => {
    checkIssuable.mockReturnValue({ ok: true, replaces: { id: 'old' }, revision: 3 });
    const res = await prepareDocument(rls, input('quote'), 'issue', now);
    expect(res).toEqual({ ok: true, snapshot: { built: true }, replaces: 'old' });
    const [, ctx] = buildSnapshot.mock.calls[0];
    expect(ctx).toEqual({
      project: bundle.project,
      client: bundle.client,
      onboarding: bundle.onboarding,
      seller: SELLER_V1,
      issuedOn: '2026-03-10',
      revision: 3,
    });
  });

  it('returns replaces null for a first issue', async () => {
    const res = await prepareDocument(rls, input('quote'), 'issue', now);
    expect(res).toMatchObject({ ok: true, replaces: null });
  });
});
