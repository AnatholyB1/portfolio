/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const S = vi.hoisted(() => ({ rpc: vi.fn(), send: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/rpc', () => ({ callRpc: S.rpc }));
vi.mock('@/lib/server/mail/outbox', () => ({ sendOutboxRow: S.send }));

import { canonicalJson } from '@/lib/signature/canonical';
import { CONSENT_TEXTS } from '@/lib/signature/consentText';
import { genesisHash, linkHash } from '@/lib/signature/verifyChain';
import {
  exportSignatureChain,
  logDocumentOpened,
  logSealDownloaded,
  recordConsent,
  submitAcceptance,
  verifySignatureChainInDb,
} from './chain';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('recordConsent', () => {
  it('sends canonical payload with exact texts', async () => {
    S.rpc.mockResolvedValue({ ok: true, data: { seq: 3 } });
    const res = await recordConsent({ documentId: 'd', userId: 'u', ip: '1.1.1.1', version: 'v1' });
    expect(res).toEqual({ ok: true, seq: 3 });
    const args = S.rpc.mock.calls[0][2];
    expect(S.rpc.mock.calls[0][1]).toBe('sv_record_signature_consent');
    expect(args.p_payload).toBe(
      canonicalJson({ version: 'v1', esign: CONSENT_TEXTS.v1.esign, evidence: CONSENT_TEXTS.v1.evidence }),
    );
    expect(args.p_consent_version).toBe('v1');
  });
  it('rejects unknown version without RPC', async () => {
    expect(await recordConsent({ documentId: 'd', userId: 'u', ip: null, version: 'v9' })).toEqual({
      ok: false,
      code: 'invalid_version',
    });
    expect(S.rpc).not.toHaveBeenCalled();
  });
});

describe('submitAcceptance', () => {
  it('passes answers, admin email and sends outbox ids', async () => {
    S.send.mockResolvedValue('sent');
    S.rpc.mockResolvedValue({
      ok: true,
      data: { submission_id: 's', delivered_count: 2, reserved_count: 1, refused_count: 0, outbox_ids: ['a', 'b'] },
    });
    const answers = [{ x: 1 }];
    const res = await submitAcceptance({ documentId: 'd', userId: 'u', ip: null, answers });
    expect(res).toMatchObject({ ok: true, submissionId: 's', deliveredCount: 2 });
    expect(S.rpc.mock.calls[0][2].p_answers).toBe(answers);
    expect(S.rpc.mock.calls[0][2].p_admin_email).toBe('contact@sevalys.com');
    expect(S.send).toHaveBeenCalledTimes(2);
  });
  it('mail failure is best effort', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    S.send.mockRejectedValue(new Error('x'));
    S.rpc.mockResolvedValue({
      ok: true,
      data: { submission_id: 's', delivered_count: 0, reserved_count: 0, refused_count: 1, outbox_ids: ['a'] },
    });
    expect((await submitAcceptance({ documentId: 'd', userId: 'u', ip: null, answers: [] })).ok).toBe(true);
  });
  it.each([
    ['sv_acceptance_refused', 'acceptance_refused'],
    ['sv_acceptance_mismatch', 'acceptance_mismatch'],
    ['sv_invalid_answer', 'invalid_answer'],
    ['sv_document_superseded', 'document_superseded'],
    ['unknown', 'error'],
  ])('maps %s', async (sql, code) => {
    S.rpc.mockResolvedValue({ ok: false, code: sql });
    expect(await submitAcceptance({ documentId: 'd', userId: 'u', ip: null, answers: [] })).toEqual({
      ok: false,
      code,
    });
  });
});

function buildExport(tamper = false) {
  const id = '00000000-0000-0000-0000-000000000001';
  const base = {
    seq: 1,
    eventType: 'document_opened' as const,
    actorKind: 'client' as const,
    actorId: null,
    ip: null,
    docSha256: 'a'.repeat(64),
    templateVersion: 'v1',
    occurredAtUtc: '2026-10-01T00:00:00.000000Z',
    payload: '{}',
    prevHash: genesisHash(id),
  };
  const lh = linkHash({ ...base, linkHash: '', documentId: id } as any);
  return {
    formatVersion: 1,
    document: {
      id,
      reference: 'R',
      docType: 'quote',
      revision: 1,
      templateVersion: 'v1',
      originalSha256: 'a',
      sealSha256: null,
    },
    genesisHash: genesisHash(id),
    events: [{ ...base, linkHash: tamper ? 'b'.repeat(64) : lh }],
    headHash: tamper ? 'b'.repeat(64) : lh,
    exportedAt: 'x',
  };
}

describe('exportSignatureChain', () => {
  it('returns verified json', async () => {
    S.rpc.mockResolvedValue({ ok: true, data: buildExport() });
    const res = await exportSignatureChain('d');
    expect(res.ok && res.verified).toBe(true);
  });
  it('chain_broken on tamper', async () => {
    S.rpc.mockResolvedValue({ ok: true, data: buildExport(true) });
    expect(await exportSignatureChain('d')).toEqual({ ok: false, code: 'chain_broken', brokenAtSeq: 1 });
  });
  it('error on rpc failure', async () => {
    S.rpc.mockResolvedValue({ ok: false, code: 'unknown' });
    expect(await exportSignatureChain('d')).toEqual({ ok: false, code: 'error' });
  });
});

describe('verifySignatureChainInDb and logs', () => {
  it('maps to camelCase', async () => {
    S.rpc.mockResolvedValue({ ok: true, data: { ok: false, count: 2, broken_at: 3, head_hash: 'h' } });
    expect(await verifySignatureChainInDb('d')).toEqual({
      ok: true,
      chainOk: false,
      count: 2,
      brokenAt: 3,
      headHash: 'h',
    });
  });
  it('log helpers return boolean and pass actor', async () => {
    S.rpc.mockResolvedValue({ ok: true, data: {} });
    const actor = { kind: 'admin' as const, id: 'u', ip: '2.2.2.2' };
    expect(await logDocumentOpened('d', actor)).toBe(true);
    expect(S.rpc.mock.calls[0][2]).toMatchObject({ p_actor_kind: 'admin', p_actor_id: 'u', p_ip: '2.2.2.2' });
    S.rpc.mockResolvedValue({ ok: false, code: 'x' });
    expect(await logSealDownloaded('d', actor)).toBe(false);
  });
});
