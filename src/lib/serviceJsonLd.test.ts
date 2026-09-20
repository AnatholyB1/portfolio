import { describe, expect, it } from 'vitest';
import { buildFaqJsonLd, buildJsonLdScript } from './serviceJsonLd';

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
