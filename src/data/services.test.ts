import { describe, expect, it } from 'vitest';
import { getServiceBySlug, services } from './services';
import { projects } from './projects';

const LOCKED_SLUGS = [
  'site-vitrine',
  'rebranding-site-premium',
  'branding',
  'projet-sur-mesure',
  'agent-vocal-ia',
  'maintenance',
  'community-management',
  'meta-ads',
  'google-ads',
];

describe('services', () => {
  it('has exactly 9 entries', () => {
    expect(services).toHaveLength(9);
  });

  it('every slug is unique', () => {
    const slugs = services.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every slug matches the kebab-case pattern', () => {
    for (const s of services) {
      expect(s.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('the set of index values is exactly {0..8} (bijection, no duplicates, no holes)', () => {
    const indexes = services.map((s) => s.index).sort((a, b) => a - b);
    expect(indexes).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('every non-null caseStudyProjectIndex is a valid projects index', () => {
    for (const s of services) {
      if (s.caseStudyProjectIndex !== null) {
        expect(projects[s.caseStudyProjectIndex]).toBeDefined();
      }
    }
  });

  it('every non-null caseStudyProjectIndex is one of 0, 1, 2 only (D-05)', () => {
    for (const s of services) {
      if (s.caseStudyProjectIndex !== null) {
        expect([0, 1, 2]).toContain(s.caseStudyProjectIndex);
      }
    }
  });

  it('the 9 slugs equal the exact locked list', () => {
    expect(services.map((s) => s.slug)).toEqual(LOCKED_SLUGS);
  });
});

describe('getServiceBySlug', () => {
  it("returns the record whose index is 4 for 'agent-vocal-ia'", () => {
    const result = getServiceBySlug('agent-vocal-ia');
    expect(result).toBeDefined();
    expect(result?.index).toBe(4);
  });

  it('returns undefined for an unknown slug', () => {
    expect(getServiceBySlug('does-not-exist')).toBeUndefined();
  });
});
