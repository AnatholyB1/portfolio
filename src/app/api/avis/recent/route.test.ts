import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/reviews/publicReviews', () => ({ getPublishedReviews: (...a: unknown[]) => h.get(...a) }));

import { GET } from './route';

const mk = (i: number) => ({
  id: `r${i}`,
  rating: 5,
  title: 'T',
  body: `Corps de l'avis numéro ${i}`,
  displayName: 'Anne, Acme',
  authorKind: 'company',
  publishedAt: '2026-10-01T10:00:00Z',
  experienceDate: null,
});

beforeEach(() => vi.clearAllMocks());

describe('GET /api/avis/recent', () => {
  it('returns at most 3 display-only reviews with cache header', async () => {
    h.get.mockResolvedValue([mk(1), mk(2), mk(3), mk(4)]);
    const r = await GET();
    expect(h.get).toHaveBeenCalledWith(3);
    expect(r.headers.get('cache-control')).toBe('public, s-maxage=300, stale-while-revalidate=600');
    const j = await r.json();
    expect(j.reviews).toHaveLength(3);
    expect(Object.keys(j.reviews[0]).sort()).toEqual(['body', 'displayName', 'id', 'publishedAt', 'rating']);
  });

  it('empty -> { reviews: [] }', async () => {
    h.get.mockResolvedValue([]);
    const r = await GET();
    expect(await r.json()).toEqual({ reviews: [] });
  });
});
