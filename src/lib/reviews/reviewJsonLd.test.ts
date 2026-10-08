import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildJsonLdScript } from '@/lib/serviceJsonLd';
import {
  buildReviewJsonLd,
  buildReviewsJsonLd,
  type PublicReview,
} from './reviewJsonLd';

const SITE = 'https://sevalys.com';

const fixture: PublicReview[] = [
  {
    id: 'r1',
    rating: 1,
    title: 'Premier avis',
    body: 'Un retour honnete.',
    displayName: 'Jean D.',
    authorKind: 'person',
    publishedAt: '2026-03-05T10:00:00.000Z',
    experienceDate: null,
  },
  {
    id: 'r2',
    rating: 3,
    title: 'Masque',
    body: 'Cache.',
    displayName: 'Hidden Co',
    authorKind: 'company',
    publishedAt: '2026-03-06T10:00:00.000Z',
    experienceDate: null,
    hidden: true,
  },
  {
    id: 'r3',
    rating: 5,
    title: null,
    body: 'Excellent travail.',
    displayName: 'Acme SAS',
    authorKind: 'company',
    publishedAt: '2026-04-07T08:00:00.000Z',
    experienceDate: '2026-03-01',
  },
];

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectKeys);
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => [
      k,
      ...collectKeys(v),
    ]);
  }
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Out = Record<string, any>;

describe('buildReviewsJsonLd', () => {
  const out = buildReviewsJsonLd(fixture, SITE) as Out[];

  it('drops hidden reviews', () => {
    expect(out).toHaveLength(2);
    expect(out.map((o) => o['@id'])).toEqual([
      `${SITE}/avis#review-r1`,
      `${SITE}/avis#review-r3`,
    ]);
  });

  it('links each Review to the ProfessionalService with a 1-5 scale', () => {
    for (const o of out) {
      expect(o['@type']).toBe('Review');
      expect(o.itemReviewed['@id']).toBe(`${SITE}/#service`);
      expect(o.reviewRating.bestRating).toBe(5);
      expect(o.reviewRating.worstRating).toBe(1);
    }
  });

  it('carries no price keys and no aggregate keys (D-04)', () => {
    const keys = collectKeys(out);
    for (const banned of [
      'price', 'priceRange', 'priceCurrency', 'offers', 'lowPrice', 'highPrice',
      'aggregateRating', 'AggregateRating', 'ratingCount', 'reviewCount',
    ]) {
      expect(keys).not.toContain(banned);
    }
    expect(JSON.stringify(out)).not.toContain('AggregateRating');
  });

  it('maps author kind', () => {
    expect(out[0].author['@type']).toBe('Person');
    expect(out[1].author['@type']).toBe('Organization');
  });

  it('omits name when no title', () => {
    expect(out[0].name).toBe('Premier avis');
    expect(out[1]).not.toHaveProperty('name');
  });

  it('uses first 10 chars of publishedAt', () => {
    expect(out[0].datePublished).toBe('2026-03-05');
  });

  it('never marks up a hidden review passed directly', () => {
    expect(buildReviewsJsonLd([fixture[1]], SITE)).toEqual([]);
  });
});

describe('serialization and purity', () => {
  it('escapes </script> through buildJsonLdScript', () => {
    const r = { ...fixture[0], body: 'x </script><script>alert(1)</script>' };
    const s = buildJsonLdScript(buildReviewJsonLd(r, SITE));
    expect(s).not.toContain('</script');
  });

  it('source imports nothing from next, react or supabase', () => {
    const src = readFileSync(join(__dirname, 'reviewJsonLd.ts'), 'utf8');
    expect(src).not.toMatch(/from ['"](next|react)/);
    expect(src).not.toMatch(/@\/lib\/supabase/);
  });
});
