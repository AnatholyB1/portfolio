import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Read as source text — do NOT import layout.tsx directly. It is a Server
// Component with next/font imports that will not resolve under
// `environment: 'node'` (vitest.config.ts); the source-string read is the
// established pattern (see src/data/services.test.ts).
const layoutSource = readFileSync(new URL('./layout.tsx', import.meta.url), 'utf8');

describe('global JSON-LD (PRIX-01)', () => {
  it('PRIX-01: does not declare a priceRange field anywhere in the source (D-09)', () => {
    expect(layoutSource).not.toContain('priceRange');
  });

  it('the ProfessionalService JSON-LD block survives intact otherwise', () => {
    expect(layoutSource).toContain('"ProfessionalService"');
    expect(layoutSource).toContain('areaServed');
    expect(layoutSource).toContain('openingHours');
  });
});

describe('global JSON-LD Service catalog (SEO-02)', () => {
  it('wires hasOfferCatalog from the pure builder', () => {
    expect(layoutSource).toContain('hasOfferCatalog: buildServiceCatalogJsonLd(SITE_URL)');
    expect(layoutSource).toContain('from "@/lib/serviceSchema"');
  });

  it('serializes with < escaping (T-09-03)', () => {
    expect(layoutSource).toContain('buildJsonLdScript(jsonLd)');
    expect(layoutSource).not.toContain('JSON.stringify(jsonLd)');
  });
});

describe('SEO domaine canonique et langue (audit 24/11/2026)', () => {
  it('html est servi en fr côté serveur', () => {
    expect(layoutSource).toContain('<html lang="fr"');
  });

  it('vercel.json redirige anatholy-bricon.com (et www) vers sevalys.com en 301 avec chemin', () => {
    const cfg = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
    const r = cfg.redirects.find((x: { destination: string }) => x.destination.startsWith('https://sevalys.com'));
    expect(r.statusCode).toBe(301);
    expect(r.destination).toBe('https://sevalys.com/:path');
    const host = new RegExp(`^${r.has[0].value}$`);
    expect(host.test('anatholy-bricon.com')).toBe(true);
    expect(host.test('www.anatholy-bricon.com')).toBe(true);
    expect(host.test('sevalys.com')).toBe(false);
    expect(host.test('www.sevalys.com')).toBe(false);
  });

  it('aucune URL du code source ne pointe vers l\'ancien domaine', () => {
    const sitemap = readFileSync(new URL('./sitemap.ts', import.meta.url), 'utf8');
    const robots = readFileSync(new URL('./robots.ts', import.meta.url), 'utf8');
    const manifest = readFileSync(new URL('./manifest.ts', import.meta.url), 'utf8');
    for (const src of [layoutSource, sitemap, robots, manifest]) {
      expect(src).not.toContain('anatholy-bricon');
    }
  });
});
