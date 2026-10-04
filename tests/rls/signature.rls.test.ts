import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addMember,
  cleanup,
  completeSignatory,
  DOCUMENTS_BUCKET,
  dbQuery,
  issueSignableDocument,
  makeClient,
  makeProject,
  makeUser,
  svc,
  testCodeHmac,
  type TestUser,
} from './helpers';

const IP = '203.0.113.7';
const ADMIN = 'admin@example.test';

let clientA: { id: string };
let clientB: { id: string };
let userA: TestUser;
let userB: TestUser;
const sealedPaths: string[] = [];

/** A fresh project + signable document for clientA (rate limits and counters are per document). */
async function newDoc(
  docType: 'quote' | 'contract' | 'acceptance' = 'quote',
  opts: { criteria?: string[]; client?: { id: string } } = {},
) {
  const projectId = await makeProject((opts.client ?? clientA).id);
  const doc = await issueSignableDocument(projectId, docType, { criteria: opts.criteria });
  return { projectId, documentId: doc.id };
}

function consent(documentId: string, user: TestUser, version = 'v1', payload?: object) {
  return svc().rpc('sv_record_signature_consent', {
    p_document_id: documentId,
    p_actor_id: user.id,
    p_ip: IP,
    p_consent_version: version,
    p_payload: JSON.stringify(payload ?? { version }),
  });
}

function request(documentId: string, user: TestUser, code = '111111', version = 'v1') {
  return svc().rpc('sv_request_signature_code', {
    p_document_id: documentId,
    p_actor_id: user.id,
    p_ip: IP,
    p_code_hmac: testCodeHmac(documentId, user.id, code),
    p_consent_version: version,
  });
}

function verify(documentId: string, user: TestUser, code: string) {
  return svc().rpc('sv_verify_signature_code', {
    p_document_id: documentId,
    p_actor_id: user.id,
    p_ip: IP,
    p_code_hmac: testCodeHmac(documentId, user.id, code),
  });
}

function submit(documentId: string, user: TestUser, answers: unknown[]) {
  return svc().rpc('sv_submit_acceptance', {
    p_document_id: documentId,
    p_actor_id: user.id,
    p_ip: IP,
    p_answers: answers,
    p_admin_email: ADMIN,
  });
}

/** Throws on RPC error, returns the jsonb. */
async function ok<T = any>(p: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`rpc failed: ${error.message}`);
  return data as T;
}

async function codeRows(documentId: string) {
  const { data, error } = await svc()
    .from('sv_signature_codes')
    .select('id, attempts, code_hmac, invalid_reason, consumed_at')
    .eq('document_id', documentId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function linkCount(documentId: string, type: string) {
  const { count, error } = await svc()
    .from('sv_signature_events')
    .select('seq', { count: 'exact', head: true })
    .eq('document_id', documentId)
    .eq('event_type', type);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Branch-only backdating (sv_signature_codes has no update grant for service_role). */
function backdate(documentId: string, column: 'created_at' | 'expires_at', seconds: number) {
  dbQuery(
    `update public.sv_signature_codes set ${column} = ${column} - interval '${seconds} seconds' where document_id = '${documentId}'`,
  );
}

beforeAll(async () => {
  clientA = await makeClient('RLS Sig A');
  clientB = await makeClient('RLS Sig B');
  userA = await makeUser('siga');
  userB = await makeUser('sigb');
  await addMember(clientA.id, userA);
  await addMember(clientB.id, userB);
  await completeSignatory(clientA.id);
});

afterAll(async () => {
  if (sealedPaths.length > 0) await svc().storage.from(DOCUMENTS_BUCKET).remove(sealedPaths);
  await cleanup();
});

describe('otp', () => {
  it('counts wrong codes, locks at 5, then refuses even the right code', async () => {
    const { documentId } = await newDoc();
    await ok(consent(documentId, userA));
    const req = await ok(request(documentId, userA, '111111'));
    expect(req.ok).toBe(true);

    for (const remaining of [4, 3, 2, 1]) {
      const r = await ok(verify(documentId, userA, '000000'));
      expect(r).toMatchObject({ ok: false, reason: 'invalid', remaining });
    }
    const fifth = await ok(verify(documentId, userA, '000000'));
    expect(fifth).toMatchObject({ ok: false, reason: 'locked' });

    // 6th try: the code is invalidated, the right code is refused too
    const sixth = await ok(verify(documentId, userA, '111111'));
    expect(sixth).toMatchObject({ ok: false, reason: 'no_code' });

    const rows = await codeRows(documentId);
    expect(rows).toHaveLength(1);
    expect(rows[0].attempts).toBe(5);
    expect(rows[0].invalid_reason).toBe('locked');
  });

  it('never stores the plain code (64 hex HMAC only)', async () => {
    const { documentId } = await newDoc();
    await ok(consent(documentId, userA));
    await ok(request(documentId, userA, '424242'));
    const rows = await codeRows(documentId);
    expect(rows[0].code_hmac).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].code_hmac).not.toBe('424242');
  });

  it('refuses an expired code, invalidates it and logs code_expired', async () => {
    const { documentId } = await newDoc();
    await ok(consent(documentId, userA));
    await ok(request(documentId, userA, '111111'));
    backdate(documentId, 'expires_at', 11 * 60);
    const r = await ok(verify(documentId, userA, '111111'));
    expect(r).toMatchObject({ ok: false, reason: 'expired' });
    expect(await linkCount(documentId, 'code_expired')).toBe(1);
    const rows = await codeRows(documentId);
    expect(rows[0].invalid_reason).toBe('expired');
  });

  it('signs with the right code, then reports already_signed', async () => {
    const { documentId } = await newDoc();
    await ok(consent(documentId, userA));
    await ok(request(documentId, userA, '123456'));
    const r = await ok(verify(documentId, userA, '123456'));
    expect(r).toMatchObject({ ok: true, already_signed: false });

    const { data, error } = await svc().from('sv_document_signatures').select('signer_user_id').eq('document_id', documentId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].signer_user_id).toBe(userA.id);

    const again = await ok(verify(documentId, userA, '123456'));
    expect(again).toMatchObject({ ok: true, already_signed: true });
  });

  it('rate limits sends: too_soon within 60 s, hourly_cap at the 6th', async () => {
    const { documentId } = await newDoc();
    await ok(consent(documentId, userA));
    const first = await ok(request(documentId, userA, '111111'));
    expect(first.ok).toBe(true);

    const soon = await ok(request(documentId, userA, '222222'));
    expect(soon).toMatchObject({ ok: false, reason: 'too_soon' });
    expect(soon.retry_after_s).toBeGreaterThan(0);

    for (let i = 2; i <= 5; i++) {
      backdate(documentId, 'created_at', 61);
      const r = await ok(request(documentId, userA, `${i}${i}${i}${i}${i}${i}`));
      expect(r.ok).toBe(true);
    }
    backdate(documentId, 'created_at', 61);
    const sixth = await ok(request(documentId, userA, '999999'));
    expect(sixth).toMatchObject({ ok: false, reason: 'hourly_cap' });
  });
});

describe('concurrency', () => {
  it('20 parallel wrong verifications count exactly 5 attempts', async () => {
    const { documentId } = await newDoc();
    await ok(consent(documentId, userA));
    await ok(request(documentId, userA, '111111'));

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => verify(documentId, userA, String(100000 + i))),
    );
    for (const r of results) expect(r.error).toBeNull();

    const rows = await codeRows(documentId);
    expect(rows).toHaveLength(1);
    expect(rows[0].attempts).toBe(5);
    expect(await linkCount(documentId, 'code_failed')).toBe(5);
    expect(await linkCount(documentId, 'code_locked')).toBe(1);
  });
});

// consent and acceptance suites are appended in Task 2
export { clientB, userB, sealedPaths, submit, randomUUID };
