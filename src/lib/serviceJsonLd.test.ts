import { describe, expect, it } from 'vitest';
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildJsonLdScript,
  buildServiceJsonLd,
} from './serviceJsonLd';

describe('buildFaqJsonLd', () => {
  it('returns a well-formed FAQPage object for a single FAQ item', () => {
    const result = buildFaqJsonLd(
      [{ q: 'Q1', a: 'A1' }],
      'https://x.test/services/branding'
    );
    expect(result).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': 'https://x.test/services/branding#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Q1',
          acceptedAnswer: { '@type': 'Answer', text: 'A1' },
        },
      ],
    });
  });

  it('does not throw for an empty FAQ list and returns an empty mainEntity', () => {
    const result = buildFaqJsonLd([], 'https://x.test/services/branding');
    expect(result).toMatchObject({ mainEntity: [] });
  });

  it('produces a non-empty acceptedAnswer.text for every non-empty input', () => {
    const result = buildFaqJsonLd(
      [
        { q: 'Q1', a: 'A1' },
        { q: 'Q2', a: 'A2' },
      ],
      'https://x.test/services/branding'
    ) as { mainEntity: { acceptedAnswer: { text: string } }[] };
    for (const entry of result.mainEntity) {
      expect(entry.acceptedAnswer.text.length).toBeGreaterThan(0);
    }
  });
});

describe('buildJsonLdScript', () => {
  it("escapes < so a </script> payload cannot break out of the tag", () => {
    const script = buildJsonLdScript({ a: '<script>alert(1)</script>' });
    expect(script).toContain('u003c');
    expect(script).not.toContain('<');
  });

  it('round-trips through JSON.parse to a deep-equal object (escaping must not corrupt payload)', () => {
    const obj = { a: '<script>alert(1)</script>', nested: { b: [1, 2, '<x>'] } };
    const script = buildJsonLdScript(obj);
    expect(JSON.parse(script)).toEqual(obj);
  });
});

describe('buildServiceJsonLd', () => {
  const base = { name: 'Site Vitrine', description: 'D' };

  it('emits no offers when the page has no pricing block', () => {
    const node = buildServiceJsonLd(base, 'site-vitrine', 'https://x.test');
    expect(node).not.toHaveProperty('offers');
    expect(node['@id']).toBe('https://x.test/services/site-vitrine#service');
    expect(node.areaServed).toEqual({ '@type': 'Country', name: 'FR' });
  });

  it('emits offers { price, priceCurrency EUR } only when pricing exists', () => {
    const node = buildServiceJsonLd(
      { ...base, pricing: { price: 1200 }, areas: ['Tours', 'Joué-lès-Tours'] },
      'site-vitrine',
      'https://x.test'
    ) as unknown as { offers: { price: string; priceCurrency: string }; areaServed: { name: string }[] };
    expect(node.offers.price).toBe('1200');
    expect(node.offers.priceCurrency).toBe('EUR');
    expect(node.areaServed.map((a) => a.name)).toEqual(['Tours', 'Joué-lès-Tours']);
  });
});

describe('buildBreadcrumbJsonLd', () => {
  it('numbers items from 1 with absolute urls', () => {
    const node = buildBreadcrumbJsonLd(
      [
        { name: 'Accueil', path: '/' },
        { name: 'Services', path: '/services' },
      ],
      'https://x.test'
    );
    expect(node.itemListElement.map((e) => e.position)).toEqual([1, 2]);
    expect(node.itemListElement[1].item).toBe('https://x.test/services');
  });
});
