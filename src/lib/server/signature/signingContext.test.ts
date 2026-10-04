/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const S = vi.hoisted(() => ({
  docs: [] as any[],
  bundle: null as any,
  admin: {} as Record<string, any>,
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/documents/read', () => ({ loadProjectDocuments: async () => S.docs }));
vi.mock('@/lib/server/projects/read', () => ({ loadProjectBundle: async () => S.bundle }));

function fake(rows: () => Record<string, any>) {
  return {
    from: (table: string) => {
      const b: any = {};
      for (const m of ['select', 'eq', 'gte', 'order', 'limit']) b[m] = () => b;
      const val = () => rows()[table] ?? null;
      b.maybeSingle = async () => ({ data: Array.isArray(val()) ? val()[0] ?? null : val(), error: null });
      b.then = (res: any) => res({ data: val() ?? [], error: null });
      return b;
    },
  } as any;
}
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => fake(() => S.admin) }));

import { loadSigningContext } from './signingContext';

const DOC = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-10-04T10:00:00Z');

const mkDoc = (over: any = {}) => ({
  id: DOC,
  projectId: 'p1',
  docType: 'quote',
  revision: 1,
  templateVersion: 'v1',
  reference: 'DEV-1',
  filename: 'f.pdf',
  sha256: 'a'.repeat(64),
  sizeBytes: 10,
  replacesDocumentId: null,
  issuedBy: null,
  issuedAt: '2026-10-01T10:00:00Z',
  ...over,
});
const onboardingDone = { id: 1, type: 'onboarding_completed', targetFactId: null, actorKind: 'system', createdAt: '2026-10-02T10:00:00Z' };
const bundle = (facts: any[] = [onboardingDone], onboarding: any = { signatoryName: 'Jeanne Dupont', signatoryRole: 'Gérante' }) => ({
  project: { id: 'p1', clientId: 'c1', startedAt: '2026-10-01T10:00:00Z' },
  facts,
  onboarding,
});

let rlsRows: Record<string, any>;
const rls = fake(() => rlsRows);
const run = () => loadSigningContext({ rls, userId: 'u1', email: 'jeanne@acme.fr', documentId: DOC, now: NOW });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  S.docs = [mkDoc()];
  S.bundle = bundle();
  S.admin = { sv_client_members: { user_id: 'u1' } };
  rlsRows = { sv_project_documents: { project_id: 'p1' } };
});

describe('loadSigningContext', () => {
  it('not_found when RLS hides the document', async () => {
    rlsRows = {};
    expect(await run()).toEqual({ status: 'not_found' });
  });

  it('ready quote at step 2 with matching signer', async () => {
    const ctx: any = await run();
    expect(ctx.status).toBe('ready');
    expect(ctx.signable).toEqual({ ok: true });
    expect(ctx.signer).toEqual({ matches: true, name: 'Jeanne Dupont', role: 'Gérante', maskedEmail: 'j***@acme.fr' });
    expect(ctx.criteria).toBeNull();
    expect(ctx.signature).toBeNull();
    expect(ctx.seal).toBeNull();
    expect(ctx.state).toBe('open');
  });

  it('wrong_step for a contract while the project is at step 2', async () => {
    S.docs = [mkDoc({ docType: 'contract' })];
    const ctx: any = await run();
    expect(ctx.signable).toEqual({ ok: false, code: 'wrong_step' });
  });

  it('signer does not match when the role is missing or the user is not a member', async () => {
    S.bundle = bundle([onboardingDone], { signatoryName: 'Jeanne', signatoryRole: '  ' });
    expect(((await run()) as any).signer.matches).toBe(false);
    S.bundle = bundle();
    S.admin = {};
    expect(((await run()) as any).signer.matches).toBe(false);
  });

  it('replaced document exposes the replacing revision', async () => {
    S.docs = [mkDoc(), mkDoc({ id: '22222222-2222-4222-8222-222222222222', revision: 2, replacesDocumentId: DOC })];
    const ctx: any = await run();
    expect(ctx.signable).toEqual({ ok: false, code: 'replaced' });
    expect(ctx.replacedBy).toEqual({ id: '22222222-2222-4222-8222-222222222222', revision: 2 });
  });

  it('signature without seal is pending_finalization; with seal it is signed', async () => {
    rlsRows.sv_document_signatures = { signer_user_id: 'u1', signed_at: '2026-10-04T09:00:00Z', signed_at_utc: '2026-10-04T09:00:00Z' };
    let ctx: any = await run();
    expect(ctx.state).toBe('pending_finalization');
    expect(ctx.signable).toEqual({ ok: false, code: 'already_signed' });
    rlsRows.sv_document_seals = { sha256: 'b'.repeat(64), sealed_at: '2026-10-04T09:01:00Z' };
    ctx = await run();
    expect(ctx.state).toBe('signed');
    expect(ctx.seal).toEqual({ sha256: 'b'.repeat(64), sealedAt: '2026-10-04T09:01:00Z' });
    expect(ctx.signature.signedAt).toBe('2026-10-04T09:00:00Z');
  });

  it('acceptance exposes criteria from the snapshot and the latest submission', async () => {
    S.docs = [mkDoc({ docType: 'acceptance' })];
    S.bundle = bundle([
      onboardingDone,
      ...['quote_accepted', 'contract_signed', 'deposit_received', 'production_completed'].map((type, i) => ({
        id: i + 2, type, targetFactId: null, actorKind: 'admin', createdAt: '2026-10-03T10:00:00Z',
      })),
    ]);
    S.admin.sv_document_snapshots = { data: { acceptanceCriteria: ['A', 'B'] } };
    rlsRows.sv_acceptance_submissions = { id: 's1', refused_count: 1 };
    rlsRows.sv_acceptance_responses = [
      { criterion_index: 1, status: 'delivered', note: null },
      { criterion_index: 2, status: 'refused', note: 'cassé' },
    ];
    const ctx: any = await run();
    expect(ctx.criteria).toEqual(['A', 'B']);
    expect(ctx.latestSubmission.refused).toBe(true);
    expect(ctx.latestSubmission.answers[1]).toEqual({ index: 2, status: 'refused', note: 'cassé' });
  });

  it('code state: cooldown, sends left, active code, consent recorded', async () => {
    S.admin.sv_signature_codes = [
      { created_at: '2026-10-04T09:59:30Z', expires_at: '2026-10-04T10:09:30Z', consumed_at: null, invalidated_at: null },
      { created_at: '2026-10-04T09:30:00Z', expires_at: '2026-10-04T09:40:00Z', consumed_at: null, invalidated_at: '2026-10-04T09:59:30Z' },
    ];
    S.admin.sv_signature_events = [{ payload: JSON.stringify({ version: 'v1' }) }];
    const ctx: any = await run();
    expect(ctx.code).toEqual({ cooldownS: 30, sendsLeft: 3, activeCodeExpiresAt: '2026-10-04T10:09:30Z' });
    expect(ctx.consentRecorded).toBe(true);
  });

  it('code state defaults when nothing was sent', async () => {
    const ctx: any = await run();
    expect(ctx.code).toEqual({ cooldownS: 0, sendsLeft: 5, activeCodeExpiresAt: null });
    expect(ctx.consentRecorded).toBe(false);
  });
});
