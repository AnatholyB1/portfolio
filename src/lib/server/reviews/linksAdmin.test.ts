import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadOpenReviewLinks, loadReviewLinkStatus, reviewLinkStatusOf } from './linksAdmin';

const NOW = new Date('2026-10-08T12:00:00Z');
const base = {
  expires_at: '2026-12-01T00:00:00Z',
  used_at: null,
  invalidated_at: null,
};

describe('reviewLinkStatusOf', () => {
  it('maps each state', () => {
    expect(reviewLinkStatusOf(null, NOW)).toEqual({ kind: 'none' });
    expect(reviewLinkStatusOf({ ...base, used_at: '2026-10-01T00:00:00Z' }, NOW).kind).toBe('used');
    expect(reviewLinkStatusOf({ ...base, invalidated_at: '2026-10-02T00:00:00Z' }, NOW).kind).toBe(
      'invalidated',
    );
    expect(reviewLinkStatusOf({ ...base, expires_at: '2026-10-08T12:00:00Z' }, NOW).kind).toBe('expired');
    expect(reviewLinkStatusOf(base, NOW)).toEqual({ kind: 'active', expiresAt: base.expires_at });
  });
});

type Tables = Record<string, unknown[]>;
function fakeClient(tables: Tables, selects: string[] = []): SupabaseClient {
  return {
    from(name: string) {
      const chain: Record<string, unknown> = {
        select: (cols: string) => {
          selects.push(cols);
          return chain;
        },
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        then: (res: (v: unknown) => unknown) =>
          Promise.resolve({ data: tables[name] ?? [], error: null }).then(res),
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

describe('loadReviewLinkStatus', () => {
  it('returns status and reviewFiled, never selecting token_hash', async () => {
    const selects: string[] = [];
    const c = fakeClient({ sv_review_links: [{ ...base, generation: 1 }], sv_reviews: [] }, selects);
    const res = await loadReviewLinkStatus(c, 'p1', NOW);
    expect(res).toEqual({ status: { kind: 'active', expiresAt: base.expires_at }, reviewFiled: false });
    expect(selects.join(' ')).not.toContain('token_hash');
  });

  it('flags a filed review', async () => {
    const c = fakeClient({ sv_review_links: [], sv_reviews: [{ id: 'r1' }] });
    expect((await loadReviewLinkStatus(c, 'p1', NOW)).reviewFiled).toBe(true);
  });
});

describe('loadOpenReviewLinks', () => {
  it('keeps the latest link per project and skips reviewed projects', async () => {
    const c = fakeClient({
      sv_review_links: [
        { ...base, project_id: 'p1', generation: 2 },
        { ...base, project_id: 'p1', generation: 1, invalidated_at: '2026-10-02T00:00:00Z' },
        { ...base, project_id: 'p2', generation: 1 },
      ],
      sv_reviews: [{ project_id: 'p2' }],
      sv_projects: [{ id: 'p1', title: 'Site', client_id: 'c1' }],
      sv_clients: [{ id: 'c1', name: 'Dupont SARL' }],
    });
    const rows = await loadOpenReviewLinks(c, NOW);
    expect(rows).toEqual([
      {
        projectId: 'p1',
        projectTitle: 'Site',
        companyName: 'Dupont SARL',
        status: { kind: 'active', expiresAt: base.expires_at },
      },
    ]);
  });
});
