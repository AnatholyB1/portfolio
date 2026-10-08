import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: h.rpc }) }));

import { getPublishedReviews } from './publicReviews';

const row = {
  id: 'r1',
  rating: 5,
  title: 'Super',
  body: 'Très bon travail réalisé.',
  display_name: 'Anne, Acme',
  author_kind: 'company',
  published_at: '2026-10-01T10:00:00Z',
  experience_date: '2026-09-01',
};

beforeEach(() => vi.clearAllMocks());

describe('getPublishedReviews', () => {
  it('passes limit and default offset, maps to camelCase', async () => {
    h.rpc.mockResolvedValue({ data: [row], error: null });
    const out = await getPublishedReviews(3);
    expect(h.rpc).toHaveBeenCalledWith('sv_public_reviews', { p_limit: 3, p_offset: 0 });
    expect(out).toEqual([
      {
        id: 'r1',
        rating: 5,
        title: 'Super',
        body: 'Très bon travail réalisé.',
        displayName: 'Anne, Acme',
        authorKind: 'company',
        publishedAt: '2026-10-01T10:00:00Z',
        experienceDate: '2026-09-01',
      },
    ]);
  });

  it('passes explicit offset', async () => {
    h.rpc.mockResolvedValue({ data: [], error: null });
    await getPublishedReviews(51, 50);
    expect(h.rpc).toHaveBeenCalledWith('sv_public_reviews', { p_limit: 51, p_offset: 50 });
  });

  it('rpc error -> [] with one fixed log', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.rpc.mockResolvedValue({ data: null, error: { message: 'boom secret' } });
    expect(await getPublishedReviews(3)).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('[reviews/public] read_failed');
  });

  it('throw -> []', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.rpc.mockRejectedValue(new Error('x'));
    expect(await getPublishedReviews(3)).toEqual([]);
    expect(spy).toHaveBeenCalledWith('[reviews/public] read_failed');
  });
});
