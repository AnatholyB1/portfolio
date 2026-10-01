import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildServiceCatalogJsonLd } from './serviceSchema';
import { services } from '@/data/services';
import { translations } from '@/lib/translations';

const BASE = 'https://x.test';
const items = translations.fr.services.pages.items;

type ServiceNode = {
  '@type': string;
  '@id': string;
  name: string;
  description: string;
  url: string;
  provider: { '@id': string };
};
type Catalog = {
  '@type': string;
  '@id': string;
  itemListElement: ServiceNode[];
};

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

describe('buildServiceCatalogJsonLd', () => {
  const catalog = buildServiceCatalogJsonLd(BASE) as unknown as Catalog;

  it('returns an OfferCatalog with one entry per service', () => {
    expect(catalog['@type']).toBe('OfferCatalog');
    expect(catalog['@id']).toBe(`${BASE}/#catalog`);
    expect(catalog.itemListElement).toHaveLength(services.length);
    expect(services.length).toBe(9);
  });

  it('emits distinct Service nodes', () => {
    for (const el of catalog.itemListElement) expect(el['@type']).toBe('Service');
    for (const key of ['@id', 'name', 'url'] as const) {
      const vals = catalog.itemListElement.map((e) => e[key]);
      expect(new Set(vals).size).toBe(vals.length);
    }
  });

  it('maps each service to its url, id, French name and tagline', () => {
    services.forEach((s, i) => {
      const el = catalog.itemListElement[i];
      const url = `${BASE}/services/${s.slug}`;
      expect(el.url).toBe(url);
      expect(el['@id']).toBe(`${url}#service`);
      expect(el.name).toBe(items[s.index].name);
      expect(el.description).toBe(items[s.index].tagline);
    });
  });

  it('references the organization as provider', () => {
    for (const el of catalog.itemListElement) {
      expect(el.provider['@id']).toBe(`${BASE}/#organization`);
    }
  });

  it('carries no price fields (D-03)', () => {
    const keys = collectKeys(catalog);
    for (const banned of ['price', 'priceRange', 'priceCurrency', 'offers', 'lowPrice', 'highPrice']) {
      expect(keys).not.toContain(banned);
    }
  });

  it('has no @context (nested in layout @graph)', () => {
    expect(catalog).not.toHaveProperty('@context');
  });
});

describe('D-01: /services/[slug] layout stays Service-free', () => {
  const file = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'app',
    'services',
    '[slug]',
    'layout.tsx'
  );
  const source = readFileSync(file, 'utf8');

  it('reads a non-empty source', () => {
    expect(source.length).toBeGreaterThan(0);
  });

  it('has no Service JSON-LD and still has FAQ', () => {
    expect(source).not.toMatch(/['"]Service['"]/);
    expect(source).not.toContain('buildServiceCatalogJsonLd');
    expect(source).toContain('buildFaqJsonLd');
  });
});
