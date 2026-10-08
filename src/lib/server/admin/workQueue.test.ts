import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { loadWorkQueue } = await import('./workQueue');

type Result = { data?: unknown[]; count?: number; error?: unknown };

// Faux client RLS : toute chaîne select/eq/in/... se résout vers le résultat de la table.
function fakeClient(tables: Record<string, Result>) {
  const touched: string[] = [];
  const client = {
    from(name: string) {
      touched.push(name);
      const t = tables[name] ?? { data: [], count: 0 };
      const res = { data: t.data ?? [], count: t.count ?? 0, error: t.error ?? null };
      const chain: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'neq', 'is', 'in', 'lt', 'gte', 'limit', 'order']) chain[m] = () => chain;
      chain.then = (ok: (v: unknown) => unknown) => Promise.resolve(res).then(ok);
      return chain;
    },
  };
  return { client: client as never, touched };
}

describe('loadWorkQueue', () => {
  it('counts each tile from existing tables under the caller client', async () => {
    const { client, touched } = fakeClient({
      sv_leads_admin_v: { count: 4 },
      sv_reviews: { count: 2 },
      sv_project_documents: {
        data: [
          { id: 'd1', replaces_document_id: null },
          { id: 'd2', replaces_document_id: 'd1' },
          { id: 'd3', replaces_document_id: null },
        ],
      },
      sv_document_signatures: { data: [{ document_id: 'd3' }] },
      sv_mail_suppressions: { data: [{ id: 1 }, { id: 2 }] },
      sv_mail_suppression_lifts: { data: [{ suppression_id: 1 }] },
    });
    const q = await loadWorkQueue(client, new Date('2026-10-09T08:00:00Z'));
    expect(q.newLeads).toBe(4);
    expect(q.returningLeads).toBe(4);
    // d1 est remplacé, d3 est signé : seul d2 attend une signature.
    expect(q.documentsToSign).toBe(1);
    expect(q.suppressionAnomalies).toBe(1);
    expect(q.recentReviews).toBe(2);
    expect(q.overdueInvoices).toBe(0);
    expect(touched).toContain('sv_invoices');
  });

  it('degrades per tile: one failing read gives null and leaves the others intact', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = fakeClient({
      sv_leads_admin_v: { error: { message: 'boom' } },
      sv_reviews: { count: 1 },
    });
    const q = await loadWorkQueue(client);
    expect(q.newLeads).toBeNull();
    expect(q.returningLeads).toBeNull();
    expect(q.recentReviews).toBe(1);
    expect(q.documentsToSign).toBe(0);
    spy.mockRestore();
  });

  it('refuses a truncated read instead of showing a wrong count', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const many = Array.from({ length: 1000 }, (_, i) => ({ id: `d${i}`, replaces_document_id: null }));
    const { client } = fakeClient({ sv_project_documents: { data: many } });
    const q = await loadWorkQueue(client);
    expect(q.documentsToSign).toBeNull();
    spy.mockRestore();
  });
});
