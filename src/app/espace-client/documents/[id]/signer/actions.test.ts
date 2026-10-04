/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const M = vi.hoisted(() => ({
  requireClient: vi.fn(),
  loadSigningContext: vi.fn(),
  recordConsent: vi.fn(),
  submitAcceptance: vi.fn(),
  requestSignatureCode: vi.fn(),
  verifySignatureCode: vi.fn(),
  createPreviewUrl: vi.fn(),
  finalizeSignature: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => M.revalidatePath(p) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7' }) }));
vi.mock('@/lib/server/auth/dal', () => ({ requireClient: () => M.requireClient() }));
vi.mock('@/lib/server/signature/signingContext', () => ({ loadSigningContext: (...a: unknown[]) => M.loadSigningContext(...a) }));
vi.mock('@/lib/server/signature/chain', () => ({
  recordConsent: (...a: unknown[]) => M.recordConsent(...a),
  submitAcceptance: (...a: unknown[]) => M.submitAcceptance(...a),
}));
vi.mock('@/lib/server/signature/codes', () => ({
  requestSignatureCode: (...a: unknown[]) => M.requestSignatureCode(...a),
  verifySignatureCode: (...a: unknown[]) => M.verifySignatureCode(...a),
}));
vi.mock('@/lib/server/signature/links', () => ({ createPreviewUrl: (...a: unknown[]) => M.createPreviewUrl(...a) }));
vi.mock('@/lib/server/signature/seal', () => ({ finalizeSignature: (...a: unknown[]) => M.finalizeSignature(...a) }));

const { previewLinkAction, submitAcceptanceAction, sendCodeAction, verifyCodeAction, resumeFinalizationAction } =
  await import('./actions');
const { PROJECT_COPY } = await import('@/lib/projects/copy');
const SIG = PROJECT_COPY.signature;

const ID = '11111111-1111-4111-8111-111111111111';
const supabase = { tag: 'rls' };
const consent = { esign: true, evidence: true };

const readyCtx = (over: any = {}) => ({
  status: 'ready',
  document: { id: ID, docType: 'quote' },
  signable: { ok: true },
  replacedBy: null,
  signer: { matches: true, name: 'Jeanne', role: 'Gérante', maskedEmail: 'j***@acme.fr' },
  criteria: null,
  latestSubmission: null,
  state: 'open',
  signature: null,
  seal: null,
  consentRecorded: false,
  code: { cooldownS: 0, sendsLeft: 5, activeCodeExpiresAt: null },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  M.requireClient.mockResolvedValue({
    status: 'ok',
    supabase,
    user: { id: 'user-1', email: 'jeanne@acme.fr' },
    client: { id: 'client-1', name: 'Acme' },
  });
  M.loadSigningContext.mockResolvedValue(readyCtx());
  M.recordConsent.mockResolvedValue({ ok: true, seq: 1 });
  M.requestSignatureCode.mockResolvedValue({ ok: true, codeId: 'c1', expiresAt: '2026-10-04T10:10:00Z', sendsLeft: 4 });
  M.verifySignatureCode.mockResolvedValue({ ok: true, alreadySigned: false, signedAtUtc: '2026-10-04T10:00:00Z' });
  M.finalizeSignature.mockResolvedValue({ ok: true, outcome: 'sealed', sealSha256: 'f'.repeat(64) });
  M.createPreviewUrl.mockResolvedValue({ ok: true, url: 'https://signed' });
  M.submitAcceptance.mockResolvedValue({ ok: true, submissionId: 's', deliveredCount: 2, reservedCount: 0, refusedCount: 0 });
});

const services = () => [
  M.loadSigningContext,
  M.recordConsent,
  M.submitAcceptance,
  M.requestSignatureCode,
  M.verifySignatureCode,
  M.createPreviewUrl,
  M.finalizeSignature,
];

describe('guards', () => {
  it('no_access and malformed ids never reach a service', async () => {
    M.requireClient.mockResolvedValue({ status: 'no_access', user: { id: 'u' } });
    expect((await previewLinkAction(ID)).ok).toBe(false);
    expect((await submitAcceptanceAction(ID, [])).ok).toBe(false);
    expect((await sendCodeAction(ID, consent)).ok).toBe(false);
    expect((await verifyCodeAction(ID, '123456')).ok).toBe(false);
    expect((await resumeFinalizationAction(ID)).ok).toBe(false);
    M.requireClient.mockResolvedValue({ status: 'ok', supabase, user: { id: 'u', email: 'a@b.fr' }, client: { id: 'c', name: 'n' } });
    expect((await previewLinkAction('nope')).ok).toBe(false);
    expect((await sendCodeAction('nope', consent)).ok).toBe(false);
    expect((await verifyCodeAction('nope', '123456')).ok).toBe(false);
    for (const s of services()) expect(s).not.toHaveBeenCalled();
  });
});

describe('previewLinkAction', () => {
  it('uses the session user and request IP', async () => {
    expect(await previewLinkAction(ID)).toEqual({ ok: true, url: 'https://signed' });
    expect(M.createPreviewUrl).toHaveBeenCalledWith(supabase, ID, { kind: 'client', id: 'user-1', ip: '203.0.113.7' });
  });
  it('maps failure to the viewer error', async () => {
    M.createPreviewUrl.mockResolvedValue({ ok: false, code: 'not_found' });
    expect(await previewLinkAction(ID)).toEqual({ ok: false, message: SIG.read.viewerError });
  });
});

describe('submitAcceptanceAction', () => {
  const pv = () => readyCtx({ document: { id: ID, docType: 'acceptance' }, criteria: ['A', 'B'] });
  const good = [{ index: 1, status: 'delivered' }, { index: 2, status: 'reserved', note: 'petit défaut' }];

  it('accepted with reserves', async () => {
    M.loadSigningContext.mockResolvedValue(pv());
    M.submitAcceptance.mockResolvedValue({ ok: true, submissionId: 's', deliveredCount: 1, reservedCount: 1, refusedCount: 0 });
    expect(await submitAcceptanceAction(ID, good)).toEqual({ ok: true, outcome: 'accepted', reserved: 1 });
    expect(M.submitAcceptance).toHaveBeenCalledWith(expect.objectContaining({ documentId: ID, userId: 'user-1', ip: '203.0.113.7' }));
  });
  it('refused revalidates and reports refusal', async () => {
    M.loadSigningContext.mockResolvedValue(pv());
    M.submitAcceptance.mockResolvedValue({ ok: true, submissionId: 's', deliveredCount: 1, reservedCount: 0, refusedCount: 1 });
    expect(await submitAcceptanceAction(ID, [{ index: 1, status: 'delivered' }, { index: 2, status: 'refused', note: 'absent' }])).toEqual({ ok: true, outcome: 'refused' });
    expect(M.revalidatePath).toHaveBeenCalledWith('/espace-client/documents');
  });
  it('rejects invalid answers without calling the RPC', async () => {
    M.loadSigningContext.mockResolvedValue(pv());
    expect((await submitAcceptanceAction(ID, [{ index: 1, status: 'refused' }])).ok).toBe(false);
    expect(M.submitAcceptance).not.toHaveBeenCalled();
  });
});

describe('sendCodeAction', () => {
  it('refuses unchecked consents without any RPC', async () => {
    expect((await sendCodeAction(ID, { esign: true, evidence: false })).ok).toBe(false);
    expect((await sendCodeAction(ID, { esign: false, evidence: true })).ok).toBe(false);
    expect(M.recordConsent).not.toHaveBeenCalled();
    expect(M.requestSignatureCode).not.toHaveBeenCalled();
  });

  it('records consent then sends to the session e-mail', async () => {
    const res = await sendCodeAction(ID, consent);
    expect(res).toEqual({ ok: true, maskedEmail: 'j***@acme.fr', expiresAt: '2026-10-04T10:10:00Z', cooldownS: 60, sendsLeft: 4 });
    expect(M.recordConsent).toHaveBeenCalledWith({ documentId: ID, userId: 'user-1', ip: '203.0.113.7', version: 'v1' });
    expect(M.requestSignatureCode).toHaveBeenCalledWith(expect.objectContaining({ email: 'jeanne@acme.fr', userId: 'user-1' }));
  });

  it('resend does not log a second consent', async () => {
    M.loadSigningContext.mockResolvedValue(readyCtx({ consentRecorded: true }));
    expect((await sendCodeAction(ID, consent)).ok).toBe(true);
    expect(M.recordConsent).not.toHaveBeenCalled();
  });

  it.each(['wrong_step', 'replaced', 'already_signed', 'not_signable_type'])(
    'blocks before any RPC when signable is %s',
    async (code) => {
      M.loadSigningContext.mockResolvedValue(readyCtx({ signable: { ok: false, code } }));
      const res = await sendCodeAction(ID, consent);
      expect(res.ok).toBe(false);
      expect(M.recordConsent).not.toHaveBeenCalled();
      expect(M.requestSignatureCode).not.toHaveBeenCalled();
    },
  );

  it('wrong_step returns the not-signable copy', async () => {
    M.loadSigningContext.mockResolvedValue(readyCtx({ signable: { ok: false, code: 'wrong_step' } }));
    expect(await sendCodeAction(ID, consent)).toEqual({ ok: false, message: SIG.states.notSignable });
  });

  it('blocks when the signer does not match', async () => {
    M.loadSigningContext.mockResolvedValue(readyCtx({ signer: { matches: false, name: 'Jeanne', role: null, maskedEmail: 'x' } }));
    expect((await sendCodeAction(ID, consent)).ok).toBe(false);
    expect(M.requestSignatureCode).not.toHaveBeenCalled();
  });

  it('PV with a refused submission keeps the code step unreachable', async () => {
    M.loadSigningContext.mockResolvedValue(readyCtx({ criteria: ['A'], latestSubmission: { answers: [], refused: true } }));
    expect((await sendCodeAction(ID, consent)).ok).toBe(false);
    expect(M.requestSignatureCode).not.toHaveBeenCalled();
  });

  it.each([
    [{ ok: false, code: 'too_soon', retryAfterS: 42 }, SIG.code.tooSoon(42)],
    [{ ok: false, code: 'hourly_cap' }, SIG.code.hourlyCap],
    [{ ok: false, code: 'send_failed' }, SIG.code.sendFailed],
    [{ ok: false, code: 'not_configured' }, SIG.code.sendFailed],
    [{ ok: false, code: 'consent_missing' }, SIG.code.sendFailed],
    [{ ok: false, code: 'acceptance_refused' }, SIG.checklist.refusedHelper],
    [{ ok: false, code: 'signatory_incomplete' }, SIG.mismatch.body('Jeanne')],
  ])('maps %j', async (rpc, message) => {
    M.requestSignatureCode.mockResolvedValue(rpc);
    expect(await sendCodeAction(ID, consent)).toMatchObject({ ok: false, message });
  });
});

describe('verifyCodeAction', () => {
  it('signs and finalizes', async () => {
    expect(await verifyCodeAction(ID, '123 456')).toEqual({
      ok: true,
      outcome: 'signed',
      signedAt: '2026-10-04T10:00:00Z',
      sealSha256: 'f'.repeat(64),
    });
    expect(M.verifySignatureCode).toHaveBeenCalledWith({ documentId: ID, userId: 'user-1', ip: '203.0.113.7', code: '123456' });
    expect(M.finalizeSignature).toHaveBeenCalledWith(ID);
    expect(M.revalidatePath).toHaveBeenCalledWith('/espace-client/documents');
  });

  it('rejects a malformed code before the RPC', async () => {
    expect((await verifyCodeAction(ID, '12ab')).ok).toBe(false);
    expect(M.verifySignatureCode).not.toHaveBeenCalled();
  });

  it('wrong_step blocks before verify and finalize', async () => {
    M.loadSigningContext.mockResolvedValue(readyCtx({ signable: { ok: false, code: 'wrong_step' } }));
    expect(await verifyCodeAction(ID, '123456')).toEqual({ ok: false, message: SIG.states.notSignable });
    expect(M.verifySignatureCode).not.toHaveBeenCalled();
    expect(M.finalizeSignature).not.toHaveBeenCalled();
  });

  it('already_signed + pending_finalization for this user resumes without verifying', async () => {
    M.loadSigningContext.mockResolvedValue(
      readyCtx({
        signable: { ok: false, code: 'already_signed' },
        state: 'pending_finalization',
        signature: { signedAt: '2026-10-04T09:00:00Z', signedAtUtc: 'x', signerUserId: 'user-1' },
      }),
    );
    const res: any = await verifyCodeAction(ID, '123456');
    expect(res.ok).toBe(true);
    expect(res.signedAt).toBe('2026-10-04T09:00:00Z');
    expect(M.verifySignatureCode).not.toHaveBeenCalled();
    expect(M.finalizeSignature).toHaveBeenCalledWith(ID);
  });

  it('already_signed by someone else is refused', async () => {
    M.loadSigningContext.mockResolvedValue(
      readyCtx({
        signable: { ok: false, code: 'already_signed' },
        state: 'pending_finalization',
        signature: { signedAt: 'x', signedAtUtc: 'x', signerUserId: 'other' },
      }),
    );
    expect((await verifyCodeAction(ID, '123456')).ok).toBe(false);
    expect(M.finalizeSignature).not.toHaveBeenCalled();
  });

  it('maps invalid, locked, expired', async () => {
    M.verifySignatureCode.mockResolvedValueOnce({ ok: false, code: 'invalid', remaining: 3 });
    expect(await verifyCodeAction(ID, '123456')).toMatchObject({ ok: false, message: SIG.code.wrong(3), remaining: 3 });
    M.verifySignatureCode.mockResolvedValueOnce({ ok: false, code: 'locked' });
    expect(await verifyCodeAction(ID, '123456')).toMatchObject({ ok: false, message: SIG.code.tooMany, needNewCode: true });
    M.verifySignatureCode.mockResolvedValueOnce({ ok: false, code: 'expired' });
    expect(await verifyCodeAction(ID, '123456')).toMatchObject({ ok: false, message: SIG.code.expired, needNewCode: true });
    expect(M.finalizeSignature).not.toHaveBeenCalled();
  });

  it('sealing failure returns finalizePending', async () => {
    M.finalizeSignature.mockResolvedValue({ ok: false, code: 'seal_failed' });
    expect(await verifyCodeAction(ID, '123456')).toEqual({ ok: false, finalizePending: true, message: SIG.code.finalizePending });
  });
});

describe('resumeFinalizationAction', () => {
  const pending = (uid: string) =>
    readyCtx({
      signable: { ok: false, code: 'already_signed' },
      state: 'pending_finalization',
      signature: { signedAt: '2026-10-04T09:00:00Z', signedAtUtc: 'x', signerUserId: uid },
    });

  it('finalizes for the signer', async () => {
    M.loadSigningContext.mockResolvedValue(pending('user-1'));
    expect((await resumeFinalizationAction(ID)).ok).toBe(true);
    expect(M.finalizeSignature).toHaveBeenCalledWith(ID);
  });
  it('refuses another user or an unsigned document', async () => {
    M.loadSigningContext.mockResolvedValue(pending('other'));
    expect((await resumeFinalizationAction(ID)).ok).toBe(false);
    M.loadSigningContext.mockResolvedValue(readyCtx());
    expect((await resumeFinalizationAction(ID)).ok).toBe(false);
    expect(M.finalizeSignature).not.toHaveBeenCalled();
  });
  it('reports finalizePending on failure', async () => {
    M.loadSigningContext.mockResolvedValue(pending('user-1'));
    M.finalizeSignature.mockResolvedValue({ ok: false, code: 'upload_failed' });
    expect(await resumeFinalizationAction(ID)).toMatchObject({ ok: false, finalizePending: true });
  });
});
