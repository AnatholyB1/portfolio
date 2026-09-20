import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { metadata } from './layout';
import { buildFaqJsonLd, buildJsonLdScript } from '@/lib/serviceJsonLd';
import { translations } from '@/lib/translations';

const layoutSource = readFileSync(
  fileURLToPath(new URL('./layout.tsx', import.meta.url)),
  'utf-8'
).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

const SITE_URL = 'https://sevalys.com';

describe('/simulateur layout metadata (SIMU-08)', () => {
  it('sets robots to index,follow — the opposite of calculateur-roi', () => {
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it('pins the canonical to /simulateur and mirrors the fr metaTitle/metaDescription', () => {
    expect(metadata.alternates?.canonical).toBe('/simulateur');
    expect(metadata.title).toBe(translations.fr.simulateur.metaTitle);
    expect(metadata.description).toBe(translations.fr.simulateur.metaDescription);
    expect(String(metadata.title)).not.toHaveLength(0);
    expect(String(metadata.description)).not.toHaveLength(0);
  });
});

describe('/simulateur FAQPage JSON-LD (SIMU-08)', () => {
  const jsonLd = buildFaqJsonLd(
    translations.fr.simulateur.faq,
    `${SITE_URL}/simulateur`
  ) as { '@type': string; '@id': string; mainEntity: unknown[] };

  it('produces a FAQPage object whose @id ends in #faq', () => {
    expect(jsonLd['@type']).toBe('FAQPage');
    expect(jsonLd['@id'].endsWith('#faq')).toBe(true);
  });

  it('has a mainEntity the same length as translations.fr.simulateur.faq, at least 3 entries', () => {
    expect(jsonLd.mainEntity).toHaveLength(translations.fr.simulateur.faq.length);
    expect(jsonLd.mainEntity.length).toBeGreaterThanOrEqual(3);
  });

  it('escapes < so the serialized script contains no raw < character', () => {
    const script = buildJsonLdScript(jsonLd);
    expect(script.includes('<')).toBe(false);
  });
});

describe('/simulateur layout.tsx source contract', () => {
  it('emits an application/ld+json script built via buildJsonLdScript', () => {
    expect(layoutSource.includes('application/ld+json')).toBe(true);
    expect(layoutSource.includes('buildJsonLdScript(')).toBe(true);
  });

  it('never calls useLanguage — Server Components render outside the client provider tree', () => {
    expect(layoutSource.includes('useLanguage')).toBe(false);
  });

  it('never sets index: false — this route must stay crawlable, unlike calculateur-roi', () => {
    expect(layoutSource.includes('index: false')).toBe(false);
  });
});
