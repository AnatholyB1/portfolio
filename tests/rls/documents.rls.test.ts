import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addMember,
  anonClient,
  cleanup,
  DOCUMENTS_BUCKET,
  issueTestDocument,
  makeAdmin,
  makeClient,
  makeGeckoAdmin,
  makeProject,
  makeUser,
  svc,
  type TestUser,
} from './helpers';

const SHA = 'a'.repeat(64);

let clientA: { id: string };
let clientB: { id: string };
let projectA: string;
let projectB: string;
let memberA: TestUser;
let memberA2: TestUser;
let memberB: TestUser;
let plain: TestUser;
let gecko: TestUser;
let admin: TestUser;
let qA1: Awaited<ReturnType<typeof issueTestDocument>>;
let qB1: Awaited<ReturnType<typeof issueTestDocument>>;
const uploaded: string[] = [];

async function issue(projectId: string, opts: Parameters<typeof issueTestDocument>[1] = {}) {
  const d = await issueTestDocument(projectId, opts);
  uploaded.push(d.path);
  return d;
}

/** Raw sv_issue_document call (no upload: the RPC never reads storage). */
function rawIssue(projectId: string, over: Record<string, unknown> = {}) {
  const id = (over.p_id as string) ?? randomUUID();
  return svc().rpc('sv_issue_document', {
    p_id: id,
    p_project_id: projectId,
    p_doc_type: 'quote',
    p_revision: 1,
    p_template_version: 'v1',
    p_reference: 'RAW-1',
    p_filename: 'raw.pdf',
    p_storage_path: `${projectId}/${id}.pdf`,
    p_sha256: SHA,
    p_size: 100,
    p_snapshot: { raw: true },
    p_replaces: null,
    p_actor: null,
    p_document_label: 'Devis',
    ...over,
  });
}

beforeAll(async () => {
  clientA = await makeClient('RLS Docs A');
  clientB = await makeClient('RLS Docs B');
  projectA = await makeProject(clientA.id);
  projectB = await makeProject(clientB.id);
  memberA = await makeUser('docsa');
  memberA2 = await makeUser('docsa2');
  memberB = await makeUser('docsb');
  plain = await makeUser('docsplain');
  gecko = await makeUser('docsgecko');
  admin = await makeUser('docsadmin');
  await addMember(clientA.id, memberA);
  await addMember(clientA.id, memberA2);
  await addMember(clientB.id, memberB);
  await makeGeckoAdmin(gecko);
  await makeAdmin(admin);
  qA1 = await issue(projectA);
  qB1 = await issue(projectB);
});

afterAll(async () => {
  if (uploaded.length > 0) await svc().storage.from(DOCUMENTS_BUCKET).remove(uploaded);
  await cleanup();
});

const COLS = 'id, project_id, doc_type, revision, sha256';

describe('read isolation (DOC-03, D-17 actor matrix)', () => {
  it('members see only their own client documents', async () => {
    const a = await memberA.client.from('sv_project_documents').select(COLS);
    expect(a.error).toBeNull();
    const aIds = (a.data ?? []).map((r) => r.id);
    expect(aIds).toContain(qA1.id);
    expect(aIds).not.toContain(qB1.id);

    const a2 = await memberA2.client.from('sv_project_documents').select(COLS);
    expect((a2.data ?? []).map((r) => r.id)).toContain(qA1.id);

    const b = await memberB.client.from('sv_project_documents').select(COLS);
    const bIds = (b.data ?? []).map((r) => r.id);
    expect(bIds).toContain(qB1.id);
    expect(bIds).not.toContain(qA1.id);
  });

  it('anon, plain user and Gecko admin read nothing', async () => {
    for (const [label, c] of [
      ['anon', anonClient()],
      ['plain', plain.client],
      ['gecko', gecko.client],
    ] as const) {
      const r = await c.from('sv_project_documents').select(COLS);
      expect(r.error !== null || (r.data ?? []).length === 0, label).toBe(true);
    }
  });

  it('admin reads all documents', async () => {
    const r = await admin.client.from('sv_project_documents').select(COLS);
    expect(r.error).toBeNull();
    const ids = (r.data ?? []).map((x) => x.id);
    expect(ids).toContain(qA1.id);
    expect(ids).toContain(qB1.id);
  });
});

describe('column grant (storage_path hidden)', () => {
  it('authenticated cannot select storage_path', async () => {
    for (const [label, u] of [
      ['memberA', memberA],
      ['admin', admin],
    ] as const) {
      const r = await u.client.from('sv_project_documents').select('id, storage_path');
      expect(r.error, `${label} storage_path`).not.toBeNull();
      expect(r.error?.message).toMatch(/permission denied/);
    }
  });
});

describe('snapshots (admin only)', () => {
  it('admin reads the snapshot', async () => {
    const r = await admin.client.from('sv_document_snapshots').select('document_id, data').eq('document_id', qA1.id);
    expect(r.error).toBeNull();
    expect(r.data).toHaveLength(1);
    expect((r.data![0].data as { test: boolean }).test).toBe(true);
  });

  it('members, anon and Gecko read nothing', async () => {
    for (const [label, c] of [
      ['memberA', memberA.client],
      ['memberB', memberB.client],
      ['anon', anonClient()],
      ['gecko', gecko.client],
    ] as const) {
      const r = await c.from('sv_document_snapshots').select('document_id, data');
      expect(r.error !== null || (r.data ?? []).length === 0, label).toBe(true);
    }
  });
});

describe('append-only (DOC-02)', () => {
  it('service_role update and delete fail with sv_immutable_table', async () => {
    const upd = await svc().from('sv_project_documents').update({ filename: 'hack.pdf' }).eq('id', qA1.id);
    expect(upd.error?.message).toMatch(/sv_immutable_table|permission denied/);
    const del = await svc().from('sv_project_documents').delete().eq('id', qA1.id);
    expect(del.error?.message).toMatch(/sv_immutable_table|permission denied/);
    const supd = await svc().from('sv_document_snapshots').update({ data: { x: 1 } }).eq('document_id', qA1.id);
    expect(supd.error?.message).toMatch(/sv_immutable_table|permission denied/);
    const sdel = await svc().from('sv_document_snapshots').delete().eq('document_id', qA1.id);
    expect(sdel.error?.message).toMatch(/sv_immutable_table|permission denied/);
    const row = await svc().from('sv_project_documents').select('filename').eq('id', qA1.id).single();
    expect(row.data?.filename).toBe(`Test-${qA1.id}.pdf`);
  });

  it('TRUNCATE on documents and snapshots is denied', () => {
    const dbUrl = process.env.SV_TEST_DB_URL;
    expect(dbUrl, 'SV_TEST_DB_URL required for the truncate check').toBeTruthy();
    expect(dbUrl).not.toContain('ubxllsvanurkwkohzxau');
    const sets: Record<string, string> = {
      sv_document_snapshots: 'public.sv_document_snapshots',
      sv_project_documents: 'public.sv_project_documents, public.sv_document_snapshots',
    };
    for (const [table, tableList] of Object.entries(sets)) {
      let out = '';
      let failed = false;
      try {
        out = execFileSync('supabase', ['db', 'query', '--db-url', `"${dbUrl}"`, `"truncate ${tableList}"`], {
          encoding: 'utf8',
          stdio: 'pipe',
          shell: true,
        });
      } catch (e: any) {
        failed = true;
        out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
      }
      expect(out, `${table}: ${out}`).toMatch(/sv_immutable_table|cannot truncate a table referenced in a foreign key/);
      expect(failed || out.includes('Error') || out.includes('error')).toBe(true);
    }
  });

  it('authenticated users cannot insert or call the issue RPC', async () => {
    const id = randomUUID();
    const ins = await memberA.client.from('sv_project_documents').insert({
      id,
      project_id: projectA,
      doc_type: 'spec',
      revision: 1,
      template_version: 'v1',
      reference: 'X',
      filename: 'x.pdf',
      storage_path: `${projectA}/${id}.pdf`,
      sha256: SHA,
      size_bytes: 10,
    });
    expect(ins.error).not.toBeNull();
    for (const [label, u] of [
      ['memberA', memberA],
      ['admin', admin],
    ] as const) {
      const rid = randomUUID();
      const r = await u.client.rpc('sv_issue_document', {
        p_id: rid,
        p_project_id: projectA,
        p_doc_type: 'spec',
        p_revision: 1,
        p_template_version: 'v1',
        p_reference: 'X',
        p_filename: 'x.pdf',
        p_storage_path: `${projectA}/${rid}.pdf`,
        p_sha256: SHA,
        p_size: 10,
        p_snapshot: {},
        p_replaces: null,
        p_actor: null,
        p_document_label: 'Cahier des charges',
      });
      expect(r.error, `${label} rpc`).not.toBeNull();
    }
    const anon = await anonClient().rpc('sv_issue_document', { p_id: randomUUID() });
    expect(anon.error).not.toBeNull();
  });
});

describe('storage (private, write-once)', () => {
  it('bucket is private', async () => {
    const { data, error } = await svc().storage.getBucket(DOCUMENTS_BUCKET);
    expect(error).toBeNull();
    expect(data?.public).toBe(false);
  });

  it('nobody but service role can list or download', async () => {
    const actors: [string, { storage: any }][] = [
      ['anon', anonClient()],
      ['memberA', memberA.client],
      ['memberB', memberB.client],
      ['plain', plain.client],
      ['gecko', gecko.client],
      ['admin', admin.client],
    ];
    for (const [label, c] of actors) {
      const list = await c.storage.from(DOCUMENTS_BUCKET).list(projectA);
      expect(list.error !== null || (list.data ?? []).length === 0, `${label} list`).toBe(true);
      const dl = await c.storage.from(DOCUMENTS_BUCKET).download(qA1.path);
      expect(dl.error, `${label} download`).not.toBeNull();
    }
  });

  it('second upload to the same path with upsert false fails', async () => {
    const r = await svc().storage.from(DOCUMENTS_BUCKET).upload(qA1.path, Buffer.from('%PDF-1.4\nother\n%%EOF\n'), {
      upsert: false,
      contentType: 'application/pdf',
    });
    expect(r.error).not.toBeNull();
    expect(JSON.stringify(r.error)).toMatch(/exist|Duplicate|409/i);
  });

  it('signed URL works then expires', async () => {
    const { data, error } = await svc().storage.from(DOCUMENTS_BUCKET).createSignedUrl(qA1.path, 2, { download: 'x.pdf' });
    expect(error).toBeNull();
    const ok = await fetch(data!.signedUrl);
    expect(ok.status).toBe(200);
    await new Promise((r) => setTimeout(r, 3500));
    const late = await fetch(data!.signedUrl);
    expect(late.status).toBeGreaterThanOrEqual(400);
    expect(late.status).toBeLessThan(500);
  });
});

describe('sv_issue_document chain rules', () => {
  let qA2: Awaited<ReturnType<typeof issueTestDocument>>;

  it('a replacement of the head with revision 2 succeeds', async () => {
    qA2 = await issue(projectA, { replaces: qA1.id, revision: 2 });
    expect(qA2.result.revision).toBe(2);
    const row = await svc().from('sv_project_documents').select('replaces_document_id').eq('id', qA2.id).single();
    expect(row.data?.replaces_document_id).toBe(qA1.id);
  });

  it('replacing an already replaced document is rejected', async () => {
    const r = await rawIssue(projectA, { p_replaces: qA1.id, p_revision: 2 });
    expect(r.error?.message).toMatch(/sv_document_replaces_mismatch/);
  });

  it('wrong revision is rejected', async () => {
    const r = await rawIssue(projectA, { p_replaces: qA2.id, p_revision: 5 });
    expect(r.error?.message).toMatch(/sv_document_revision_mismatch/);
  });

  it('reusing an issued id is rejected', async () => {
    const r = await rawIssue(projectA, { p_id: qA2.id, p_replaces: qA2.id, p_revision: 3 });
    expect(r.error?.message).toMatch(/sv_document_already_issued/);
  });

  it('a storage path that is not project/id.pdf is rejected', async () => {
    const r = await rawIssue(projectA, {
      p_doc_type: 'contract',
      p_storage_path: `${projectA}/${randomUUID()}.pdf`,
    });
    expect(r.error?.message).toMatch(/sv_document_path_mismatch/);
  });

  it('invoice type is rejected', async () => {
    const r = await rawIssue(projectA, { p_doc_type: 'invoice' });
    expect(r.error).not.toBeNull();
    expect(r.error?.message).toMatch(/check|violates|sv_project_documents_doc_type/i);
  });

  it('a first document with a non-null replaces is rejected', async () => {
    const r = await rawIssue(projectA, { p_doc_type: 'contract', p_replaces: qA1.id });
    expect(r.error?.message).toMatch(/sv_document_replaces_mismatch/);
  });

  it('an unknown project is rejected', async () => {
    const r = await rawIssue(randomUUID());
    expect(r.error?.message).toMatch(/sv_project_not_found/);
  });
});

describe('concurrent replacement race', () => {
  it('exactly one of two concurrent replacements of the same head wins', async () => {
    const s1 = await issue(projectA, { docType: 'spec' });
    const calls = [randomUUID(), randomUUID()].map((id) =>
      rawIssue(projectA, { p_id: id, p_doc_type: 'spec', p_replaces: s1.id, p_revision: 2 }),
    );
    const settled = await Promise.allSettled(calls);
    const results = settled.map((s) => (s.status === 'fulfilled' ? s.value : { data: null, error: { message: 'rejected' } }));
    const ok = results.filter((r) => !r.error);
    const failed = results.filter((r) => r.error);
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].error!.message).toMatch(/sv_document_replaces_mismatch|duplicate key|unique/);

    const rows = await svc()
      .from('sv_project_documents')
      .select('id, replaces_document_id')
      .eq('project_id', projectA)
      .eq('doc_type', 'spec');
    const all = rows.data ?? [];
    const replacedIds = new Set(all.map((r) => r.replaces_document_id).filter(Boolean));
    expect(all.filter((r) => !replacedIds.has(r.id))).toHaveLength(1);
  });
});

describe('document_issued outbox', () => {
  it('writes one row per distinct member e-mail with an amount-free payload', async () => {
    const { data, error } = await svc()
      .from('sv_mail_outbox')
      .select('id, dedupe_key, recipient_email, recipient_kind, payload')
      .eq('event_type', 'document_issued')
      .eq('project_id', projectA)
      .like('dedupe_key', `document_issued:${qA1.id}:%`);
    expect(error).toBeNull();
    const rows = data ?? [];
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.dedupe_key).toBe(`document_issued:${qA1.id}:${String(row.recipient_email).toLowerCase()}`);
      expect(row.recipient_kind).toBe('client');
      expect(Object.keys(row.payload as object).sort()).toEqual(['documentLabel', 'projectTitle', 'revision']);
    }
    const emails = rows.map((r) => r.recipient_email).sort();
    expect(emails).toEqual([memberA.email.toLowerCase(), memberA2.email.toLowerCase()].sort());
    expect(rows.map((r) => r.id).sort()).toEqual([...qA1.result.outbox_ids].sort());
  });
});
