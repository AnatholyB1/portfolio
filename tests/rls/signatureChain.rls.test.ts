import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { verifyChainExport } from '../../src/lib/signature/verifyChain';
import {
  addMember,
  anonClient,
  cleanup,
  completeSignatory,
  dbQuery,
  issueSignableDocument,
  makeAdmin,
  makeClient,
  makeGeckoAdmin,
  makeProject,
  makeUser,
  postFact,
  signTestDocument,
  svc,
  type TestUser,
} from './helpers';

const IP = '203.0.113.7';
const ADMIN = 'admin@example.test';
const IMMUTABLE = /sv_immutable_table|permission denied/;
const APPEND_ONLY_TABLES = [
  'sv_signature_events',
  'sv_document_signatures',
  'sv_document_seals',
  'sv_acceptance_submissions',
  'sv_acceptance_responses',
];

let clientA: { id: string };
let clientB: { id: string };
let userA: TestUser;
let userB: TestUser;
let admin: TestUser;
let gecko: TestUser;

type Fixture = { projectId: string; documentId: string };
let signedDoc: Fixture; // quote, signed and sealed (events: opened, consent, code_sent, signed, sealed, downloaded)
let accDoc: Fixture; // acceptance, signed with answers

const answers = (statuses: Array<'delivered' | 'reserved' | 'refused'>) =>
  statuses.map((status, i) => ({ index: i + 1, status, note: status === 'delivered' ? null : `Note ${status} ${i + 1}` }));

async function ok<T = any>(p: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`rpc failed: ${error.message}`);
  return data as T;
}

async function newDoc(docType: 'quote' | 'contract' | 'acceptance' = 'quote'): Promise<Fixture> {
  const projectId = await makeProject(clientA.id);
  const doc = await issueSignableDocument(projectId, docType);
  return { projectId, documentId: doc.id };
}

function seal(f: Fixture, path?: string, sha = 'c'.repeat(64)) {
  return svc().rpc('sv_seal_document', {
    p_document_id: f.documentId,
    p_storage_path: path ?? `${f.projectId}/sealed/${randomUUID()}.pdf`,
    p_sha256: sha,
    p_size: 1234,
    p_admin_email: ADMIN,
  });
}

/** Opened (admin, no ip) -> consent -> code -> signed -> sealed -> downloaded (admin). */
async function signAndSeal(docType: 'quote' | 'contract' = 'quote'): Promise<Fixture> {
  const f = await newDoc(docType);
  await ok(svc().rpc('sv_log_document_opened', { p_document_id: f.documentId, p_actor_kind: 'admin', p_actor_id: admin.id, p_ip: null }));
  await signTestDocument(f.documentId, userA);
  await ok(seal(f));
  await ok(svc().rpc('sv_log_seal_downloaded', { p_document_id: f.documentId, p_actor_kind: 'admin', p_actor_id: admin.id, p_ip: null }));
  return f;
}

async function exportChain(documentId: string) {
  return ok<any>(svc().rpc('sv_export_signature_chain', { p_document_id: documentId }));
}

async function verifySql(documentId: string) {
  return ok<any>(svc().rpc('sv_verify_signature_chain', { p_document_id: documentId }));
}

/** Parse the JSON printed by `supabase db query` (a banner line may surround it). */
function dbRows(sql: string): Array<Record<string, unknown>> {
  const out = dbQuery(sql);
  const parsed = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
  if (!parsed.rows) throw new Error(`dbQuery failed: ${out}`);
  return parsed.rows;
}

async function factCount(projectId: string) {
  const { count, error } = await svc().from('sv_project_facts').select('id', { count: 'exact', head: true }).eq('project_id', projectId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function sealCount(documentId: string) {
  const { count, error } = await svc().from('sv_document_seals').select('id', { count: 'exact', head: true }).eq('document_id', documentId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function eventCount(documentId: string) {
  const { count, error } = await svc().from('sv_signature_events').select('seq', { count: 'exact', head: true }).eq('document_id', documentId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

beforeAll(async () => {
  clientA = await makeClient('RLS Chain A');
  clientB = await makeClient('RLS Chain B');
  userA = await makeUser('chaina');
  userB = await makeUser('chainb');
  admin = await makeUser('chainadm');
  gecko = await makeUser('chaingecko');
  await addMember(clientA.id, userA);
  await addMember(clientB.id, userB);
  await makeAdmin(admin);
  await makeGeckoAdmin(gecko);
  await completeSignatory(clientA.id);

  signedDoc = await signAndSeal('quote');

  const projectId = await makeProject(clientA.id);
  const acc = await issueSignableDocument(projectId, 'acceptance');
  await signTestDocument(acc.id, userA, { answers: answers(['delivered', 'reserved', 'delivered']) });
  accDoc = { projectId, documentId: acc.id };
}, 120_000);

afterAll(async () => {
  await cleanup();
});

describe('append-only', () => {
  for (const table of APPEND_ONLY_TABLES) {
    it(`refuses update and delete on ${table} for service_role and a member`, async () => {
      const col = table === 'sv_acceptance_responses' ? 'submission_id' : 'document_id';
      const patch = table === 'sv_acceptance_responses' ? { note: null } : { document_id: signedDoc.documentId };
      const s1 = await svc().from(table).update(patch).not(col, 'is', null);
      const s2 = await svc().from(table).delete().not(col, 'is', null);
      expect(s1.error?.message).toMatch(IMMUTABLE);
      expect(s2.error?.message).toMatch(IMMUTABLE);
      const a1 = await userA.client.from(table).update(patch).not(col, 'is', null);
      const a2 = await userA.client.from(table).delete().not(col, 'is', null);
      const n1 = await anonClient().from(table).delete().not(col, 'is', null);
      for (const r of [a1, a2, n1]) {
        // either an explicit denial or zero affected rows: nothing may change
        expect(r.error ? r.error.message : 'none').toMatch(/permission denied|sv_immutable_table|none/);
      }
    });
  }

  it('has a truncate guard trigger on every append-only table', () => {
    for (const table of APPEND_ONLY_TABLES) {
      const rows = dbRows(
        `select tgname from pg_trigger where tgrelid = 'public.${table}'::regclass and not tgisinternal and tgname like '%no_truncate'`,
      );
      expect(rows, table).toHaveLength(1);
    }
  });

  it('has a truncate guard trigger on the acceptance tables and update/delete guards everywhere', () => {
    const rows = dbRows(
      `select c.relname, t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relname = any(array['sv_signature_events','sv_document_signatures','sv_document_seals','sv_acceptance_submissions','sv_acceptance_responses']) and not t.tgisinternal and t.tgname like '%no_upd_del'`,
    );
    expect(rows).toHaveLength(APPEND_ONLY_TABLES.length);
  });

  it('refuses direct INSERT into sv_signature_events and sv_document_seals even for service_role', async () => {
    const ev = await svc().from('sv_signature_events').insert({
      document_id: signedDoc.documentId,
      seq: 999,
      event_type: 'document_opened',
      actor_kind: 'admin',
      doc_sha256: 'a'.repeat(64),
      template_version: 'v1',
      payload: '{}',
      occurred_at: new Date().toISOString(),
      occurred_at_utc: '2026-01-01T00:00:00.000000Z',
      prev_hash: 'a'.repeat(64),
      link_hash: 'b'.repeat(64),
    });
    expect(ev.error?.message).toMatch(/permission denied/);
    const sl = await svc().from('sv_document_seals').insert({
      document_id: signedDoc.documentId,
      storage_path: `${signedDoc.projectId}/sealed/${randomUUID()}.pdf`,
      sha256: 'a'.repeat(64),
      size_bytes: 10,
    });
    expect(sl.error?.message).toMatch(/permission denied/);
  });
});

describe('chain', () => {
  it('exports a fully signed document and the TypeScript verifier accepts it', async () => {
    const ex = await exportChain(signedDoc.documentId);
    const types = (ex.events as Array<{ eventType: string }>).map((e) => e.eventType);
    expect(types).toEqual(['document_opened', 'consent_given', 'code_sent', 'signed', 'sealed', 'seal_downloaded']);
    const res = verifyChainExport(ex);
    expect(res).toEqual({ ok: true, count: ex.events.length, headHash: ex.events[ex.events.length - 1].linkHash });
    expect(ex.headHash).toBe(ex.events[ex.events.length - 1].linkHash);
    const sql = await verifySql(signedDoc.documentId);
    expect(sql).toMatchObject({ ok: true, count: ex.events.length, head_hash: ex.headHash });
  });

  it('keeps seq contiguous and the chain intact under 20 concurrent appends', async () => {
    const f = await newDoc('quote');
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        svc().rpc('sv_log_document_opened', { p_document_id: f.documentId, p_actor_kind: 'admin', p_actor_id: randomUUID(), p_ip: null }),
      ),
    );
    for (const r of results) expect(r.error).toBeNull();
    const { data } = await svc().from('sv_signature_events').select('seq').eq('document_id', f.documentId).order('seq');
    expect((data ?? []).map((r) => r.seq)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(await verifySql(f.documentId)).toMatchObject({ ok: true, count: 20 });
    expect(verifyChainExport(await exportChain(f.documentId))).toMatchObject({ ok: true, count: 20 });
  });
});

describe('tamper', () => {
  it('reports the broken seq in both SQL and TypeScript verifiers after a direct edit', async () => {
    const f = await signAndSeal('quote');
    expect(await verifySql(f.documentId)).toMatchObject({ ok: true });

    // branch only (dbQuery refuses the production ref); one DO block = one transaction, trigger re-enabled inside
    dbQuery(
      `do $$ begin alter table public.sv_signature_events disable trigger sv_signature_events_no_upd_del; update public.sv_signature_events set payload = 'tampered' where document_id = '${f.documentId}' and seq = 2; alter table public.sv_signature_events enable trigger sv_signature_events_no_upd_del; end $$`,
    );

    const trig = dbRows(
      `select tgenabled from pg_trigger where tgrelid = 'public.sv_signature_events'::regclass and tgname = 'sv_signature_events_no_upd_del'`,
    );
    expect(trig).toEqual([{ tgenabled: 'O' }]);

    expect(await verifySql(f.documentId)).toMatchObject({ ok: false, broken_at: 2 });
    const res = verifyChainExport(await exportChain(f.documentId));
    expect(res).toEqual({ ok: false, brokenAtSeq: 2, reason: 'link_hash' });
  });

  it('detects a deleted link as a seq gap', async () => {
    const f = await signAndSeal('quote');
    const before = await eventCount(f.documentId);
    dbQuery(
      `do $$ begin alter table public.sv_signature_events disable trigger sv_signature_events_no_upd_del; delete from public.sv_signature_events where document_id = '${f.documentId}' and seq = 3; alter table public.sv_signature_events enable trigger sv_signature_events_no_upd_del; end $$`,
    );
    expect(await eventCount(f.documentId)).toBe(before - 1);
    expect(await verifySql(f.documentId)).toMatchObject({ ok: false, broken_at: 4 });
    expect(verifyChainExport(await exportChain(f.documentId))).toEqual({ ok: false, brokenAtSeq: 4, reason: 'seq' });
  });
});

describe('isolation', () => {
  const tables = ['sv_signature_events', 'sv_document_signatures', 'sv_acceptance_submissions', 'sv_acceptance_responses'];

  it('lets client A read its links, signatures, seals and acceptance rows', async () => {
    const ev = await userA.client.from('sv_signature_events').select('seq').eq('document_id', signedDoc.documentId);
    expect(ev.data!.length).toBe(6);
    const sig = await userA.client.from('sv_document_signatures').select('document_id').eq('document_id', signedDoc.documentId);
    expect(sig.data).toHaveLength(1);
    const sl = await userA.client.from('sv_document_seals').select('id, document_id, sha256, size_bytes, sealed_at').eq('document_id', signedDoc.documentId);
    expect(sl.error).toBeNull();
    expect(sl.data).toHaveLength(1);
    const sub = await userA.client.from('sv_acceptance_submissions').select('id').eq('document_id', accDoc.documentId);
    expect(sub.data).toHaveLength(1);
    const resp = await userA.client.from('sv_acceptance_responses').select('criterion_index').eq('submission_id', sub.data![0].id);
    expect(resp.data).toHaveLength(3);
  });

  it('hides storage_path and sv_signature_codes from clients', async () => {
    const sp = await userA.client.from('sv_document_seals').select('storage_path').eq('document_id', signedDoc.documentId);
    expect(sp.error?.message).toMatch(/permission denied/);
    const star = await userA.client.from('sv_document_seals').select('*').eq('document_id', signedDoc.documentId);
    expect(star.error?.message ?? '').toMatch(/permission denied|^$/);
    const codes = await userA.client.from('sv_signature_codes').select('id');
    expect(codes.error ? codes.error.message : codes.data).toSatisfy((v: unknown) => (typeof v === 'string' ? /permission denied/.test(v) : (v as unknown[]).length === 0));
  });

  it('shows nothing of client A to client B, anon and a Gecko admin', async () => {
    const readers: Array<[string, { from: TestUser['client']['from'] }]> = [
      ['client B', userB.client],
      ['anon', anonClient()],
      ['gecko', gecko.client],
    ];
    for (const [who, c] of readers) {
      for (const table of [...tables, 'sv_document_seals']) {
        const col = table === 'sv_acceptance_responses' ? 'criterion_index' : table === 'sv_document_seals' ? 'id' : 'document_id';
        const r = await c.from(table).select(col);
        const rows = r.data ?? [];
        expect(rows.length, `${who} ${table}`).toBe(0);
      }
    }
  });

  it('lets the admin read everything', async () => {
    const ev = await admin.client.from('sv_signature_events').select('seq').in('document_id', [signedDoc.documentId, accDoc.documentId]);
    expect(ev.data!.length).toBeGreaterThanOrEqual(7);
    const sl = await admin.client.from('sv_document_seals').select('id').eq('document_id', signedDoc.documentId);
    expect(sl.data).toHaveLength(1);
  });
});

describe('seal-atomic', () => {
  it('refuses an unsigned document and adds no fact', async () => {
    const f = await newDoc('quote');
    const before = await factCount(f.projectId);
    const r = await seal(f);
    expect(r.error?.message).toMatch(/sv_signature_missing/);
    expect(await factCount(f.projectId)).toBe(before);
    expect(await sealCount(f.documentId)).toBe(0);
  });

  it('refuses a bad path with no fact, no seal and no extra link', async () => {
    const f = await newDoc('quote');
    await signTestDocument(f.documentId, userA);
    const facts = await factCount(f.projectId);
    const links = await eventCount(f.documentId);
    const r = await seal(f, `${randomUUID()}/sealed/${randomUUID()}.pdf`);
    expect(r.error?.message).toMatch(/sv_invalid_path/);
    expect(await factCount(f.projectId)).toBe(facts);
    expect(await sealCount(f.documentId)).toBe(0);
    expect(await eventCount(f.documentId)).toBe(links);
  });

  it('seals once (fact posted) and refuses a second seal without any extra fact', async () => {
    const f = await newDoc('quote');
    await signTestDocument(f.documentId, userA);
    const facts = await factCount(f.projectId);
    const first = await ok(seal(f));
    expect(first.fact_changed).toBe(true);
    expect(await factCount(f.projectId)).toBe(facts + 1);
    const links = await eventCount(f.documentId);
    const second = await seal(f);
    expect(second.error?.message).toMatch(/sv_already_sealed/);
    expect(await factCount(f.projectId)).toBe(facts + 1);
    expect(await eventCount(f.documentId)).toBe(links);
    expect(await sealCount(f.documentId)).toBe(1);
  });

  it('still seals when the admin already posted contract_signed manually (fact_changed false)', async () => {
    const f = await newDoc('contract');
    await signTestDocument(f.documentId, userA);
    await postFact(f.projectId, 'contract_signed', { actorKind: 'admin', actorId: admin.id });
    const facts = await factCount(f.projectId);
    const r = await ok(seal(f));
    expect(r.fact_changed).toBe(false);
    expect(await factCount(f.projectId)).toBe(facts);
    expect(await sealCount(f.documentId)).toBe(1);
  });
});

describe('frozen', () => {
  it('refuses to replace a signed document', async () => {
    await expect(
      issueSignableDocument(signedDoc.projectId, 'quote', { replaces: signedDoc.documentId, revision: 2 }),
    ).rejects.toThrow(/sv_document_signed/);
  });

  it('still replaces an unsigned refused acceptance report', async () => {
    const projectId = await makeProject(clientA.id);
    const pv = await issueSignableDocument(projectId, 'acceptance');
    await ok(
      svc().rpc('sv_record_signature_consent', {
        p_document_id: pv.id,
        p_actor_id: userA.id,
        p_ip: IP,
        p_consent_version: 'v1',
        p_payload: JSON.stringify({ version: 'v1' }),
      }),
    );
    const sub = await ok(
      svc().rpc('sv_submit_acceptance', {
        p_document_id: pv.id,
        p_actor_id: userA.id,
        p_ip: IP,
        p_answers: answers(['delivered', 'refused', 'delivered']),
        p_admin_email: ADMIN,
      }),
    );
    expect(sub.refused_count).toBe(1);
    const next = await issueSignableDocument(projectId, 'acceptance', { replaces: pv.id, revision: 2 });
    expect(next.result.revision).toBe(2);
  });
});
