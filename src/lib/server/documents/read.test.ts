/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { loadActiveSnapshot, loadDocumentSnapshot, loadDocumentsForProjects, loadProjectDocuments } from './read';

const row = (o: Record<string, unknown>) => ({
  id: 'q1',
  project_id: 'p1',
  doc_type: 'quote',
  revision: 1,
  template_version: 'v1',
  reference: 'DEV-1',
  filename: 'a.pdf',
  sha256: 'abc',
  size_bytes: '10',
  replaces_document_id: null,
  issued_by: null,
  issued_at: '2026-01-01T00:00:00Z',
  ...o,
});

/** Fake RLS client: records selects, returns per-table results. */
function fake(tables: Record<string, { data?: any; error?: any }>) {
  const calls: { table: string; select?: string; in?: any }[] = [];
  const client: any = {
    from(table: string) {
      const call: any = { table };
      calls.push(call);
      const b: any = {};
      b.select = (s: string) => ((call.select = s), b);
      b.eq = () => b;
      b.in = (_c: string, ids: any) => ((call.in = ids), b);
      b.order = () => b;
      const result = () => ({ data: tables[table]?.data ?? null, error: tables[table]?.error ?? null });
      b.maybeSingle = async () => result();
      b.then = (res: any, rej: any) => Promise.resolve(result()).then(res, rej);
      return b;
    },
  };
  return { client, calls };
}

describe('loadProjectDocuments', () => {
  it('selects explicit columns without storage_path and maps rows', async () => {
    const { client, calls } = fake({ sv_project_documents: { data: [row({})] } });
    const docs = await loadProjectDocuments(client, 'p1');
    expect(calls[0].select).not.toContain('storage_path');
    expect(docs[0]).toMatchObject({ id: 'q1', projectId: 'p1', sizeBytes: 10, replacesDocumentId: null });
  });
  it('returns [] on error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = fake({ sv_project_documents: { error: { message: 'x' } } });
    expect(await loadProjectDocuments(client, 'p1')).toEqual([]);
  });
});

describe('loadDocumentsForProjects', () => {
  it('returns [] without querying for empty ids', async () => {
    const { client, calls } = fake({});
    expect(await loadDocumentsForProjects(client, [])).toEqual([]);
    expect(calls).toHaveLength(0);
  });
  it('uses in(project_id)', async () => {
    const { client, calls } = fake({ sv_project_documents: { data: [row({})] } });
    expect(await loadDocumentsForProjects(client, ['p1', 'p2'])).toHaveLength(1);
    expect(calls[0].in).toEqual(['p1', 'p2']);
  });
});

describe('loadDocumentSnapshot', () => {
  it('returns data for a known docType, null otherwise', async () => {
    const ok = fake({ sv_document_snapshots: { data: { document_id: 'q1', data: { docType: 'quote' } } } });
    expect(await loadDocumentSnapshot(ok.client, 'q1')).toEqual({ docType: 'quote' });
    const bad = fake({ sv_document_snapshots: { data: { document_id: 'q1', data: { docType: 'zzz' } } } });
    expect(await loadDocumentSnapshot(bad.client, 'q1')).toBeNull();
    const none = fake({ sv_document_snapshots: { data: null } });
    expect(await loadDocumentSnapshot(none.client, 'q1')).toBeNull();
  });
});

describe('loadActiveSnapshot', () => {
  it('picks the chain head', async () => {
    const { client } = fake({
      sv_project_documents: {
        data: [row({}), row({ id: 'q2', revision: 2, replaces_document_id: 'q1', issued_at: '2026-02-01T00:00:00Z' })],
      },
      sv_document_snapshots: { data: { document_id: 'q2', data: { docType: 'quote' } } },
    });
    const res = await loadActiveSnapshot(client, 'p1', 'quote');
    expect(res?.doc.id).toBe('q2');
    expect(res?.snapshot).toEqual({ docType: 'quote' });
  });
  it('returns null when no doc or no snapshot', async () => {
    expect(await loadActiveSnapshot(fake({ sv_project_documents: { data: [] } }).client, 'p1', 'spec')).toBeNull();
    const noSnap = fake({ sv_project_documents: { data: [row({})] }, sv_document_snapshots: { data: null } });
    expect(await loadActiveSnapshot(noSnap.client, 'p1', 'quote')).toBeNull();
  });
});
