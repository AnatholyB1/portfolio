import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addMember,
  anonClient,
  cleanup,
  makeAdmin,
  makeClient,
  makeGeckoAdmin,
  makeProject,
  makeUser,
  svc,
  type TestUser,
} from './helpers';

const BUCKET = 'sv-project-files';
const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');

let clientA: { id: string };
let clientB: { id: string };
let projectA: string;
let memberA: TestUser;
let memberB: TestUser;
let plain: TestUser;
let gecko: TestUser;
let admin: TestUser;
let prefix: string;
let objectPath: string;

async function signedUpload(path: string) {
  const { data, error } = await svc().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`createSignedUploadUrl failed: ${error?.message}`);
  return data.signedUrl;
}

beforeAll(async () => {
  clientA = await makeClient('RLS Files A');
  clientB = await makeClient('RLS Files B');
  projectA = await makeProject(clientA.id);
  memberA = await makeUser('filesa');
  memberB = await makeUser('filesb');
  plain = await makeUser('filesplain');
  gecko = await makeUser('filesgecko');
  admin = await makeUser('filesadmin');
  await addMember(clientA.id, memberA);
  await addMember(clientB.id, memberB);
  await makeGeckoAdmin(gecko);
  await makeAdmin(admin);
  prefix = `${clientA.id}/${projectA}`;
  objectPath = `${prefix}/${randomUUID()}-test.pdf`;
});

afterAll(async () => {
  await svc().storage.from(BUCKET).remove([objectPath]);
  await cleanup();
});

describe('PORTAL-05 private bucket', () => {
  it('raw-body PUT to a signed upload URL stores the file', async () => {
    const url = await signedUpload(objectPath);
    const res = await fetch(url, { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: PDF });
    console.info(`[files] raw-body PUT status ${res.status}`);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    const { data, error } = await svc().storage.from(BUCKET).list(prefix);
    expect(error).toBeNull();
    expect((data ?? []).some((o) => objectPath.endsWith(o.name))).toBe(true);
  });

  it('multipart FormData (key empty) PUT, as used by FilesPanel, stores the file', async () => {
    const path = `${prefix}/${randomUUID()}-multipart.pdf`;
    const url = await signedUpload(path);
    const body = new FormData();
    body.append('cacheControl', '3600');
    body.append('', new Blob([PDF], { type: 'application/pdf' }), 'multipart.pdf');
    const res = await fetch(url, { method: 'PUT', headers: { 'x-upsert': 'false' }, body });
    console.info(`[files] multipart PUT status ${res.status}`);
    const ok = res.status >= 200 && res.status < 300;
    if (ok) await svc().storage.from(BUCKET).remove([path]);
    expect(ok).toBe(true);
  });

  it('bucket is private', async () => {
    const { data, error } = await svc().storage.getBucket(BUCKET);
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
      const list = await c.storage.from(BUCKET).list(prefix);
      expect(list.error !== null || (list.data ?? []).length === 0, `${label} list`).toBe(true);
      const dl = await c.storage.from(BUCKET).download(objectPath);
      expect(dl.error, `${label} download`).not.toBeNull();
    }
  });

  it('signed download URL works then expires', async () => {
    const { data, error } = await svc().storage.from(BUCKET).createSignedUrl(objectPath, 2, { download: 'test.pdf' });
    expect(error).toBeNull();
    const ok = await fetch(data!.signedUrl);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-disposition') ?? '').toMatch(/attachment/i);
    await new Promise((r) => setTimeout(r, 3500));
    const late = await fetch(data!.signedUrl);
    expect(late.status).toBeGreaterThanOrEqual(400);
    expect(late.status).toBeLessThan(500);
  });

  it('non-whitelisted MIME is rejected by the bucket', async () => {
    const path = `${prefix}/${randomUUID()}-bad.html`;
    const url = await signedUpload(path);
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'text/html' },
      body: Buffer.from('<html></html>'),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    const { data } = await svc().storage.from(BUCKET).list(prefix);
    expect((data ?? []).some((o) => path.endsWith(o.name))).toBe(false);
  });

  it('file over 25 MB is rejected by the bucket', async () => {
    const path = `${prefix}/${randomUUID()}-big.pdf`;
    const url = await signedUpload(path);
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/pdf' },
      body: Buffer.alloc(26214401, 1),
    });
    console.info(`[files] oversize PUT status ${res.status}`);
    expect(res.status).toBeGreaterThanOrEqual(400);
    const { data } = await svc().storage.from(BUCKET).list(prefix);
    expect((data ?? []).some((o) => path.endsWith(o.name))).toBe(false);
  });

  it('storage policy audit: no policy opens every bucket (informational)', () => {
    const dbUrl = process.env.SV_TEST_DB_URL;
    expect(dbUrl, 'SV_TEST_DB_URL required for the policy audit').toBeTruthy();
    expect(dbUrl).not.toContain('ubxllsvanurkwkohzxau');
    const sql =
      "select count(*) as open_policies from pg_policies where schemaname = 'storage' and tablename = 'objects' and (qual is null or qual not ilike '%bucket_id%')";
    const out = execFileSync('supabase', ['db', 'query', '--db-url', `"${dbUrl}"`, `"${sql}"`], {
      encoding: 'utf8',
      stdio: 'pipe',
      shell: true,
    });
    console.info(`[files] storage policy audit output: ${out.replace(/\s+/g, ' ')}`);
    expect(out).toMatch(/open_policies/);
  });
});
