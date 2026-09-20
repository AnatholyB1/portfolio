import { describe, expect, it } from 'vitest';
import { translations } from './translations';

const LANGS = ['fr', 'en', 'th'] as const;

// SVC-02 no-price guard — must never match anywhere in t.services.pages,
// for any locale, at any stage of the phase (covers items[] automatically
// as later plans append entries).
const PRICE_PATTERN = /€|฿|\bprix\b|\btarifs?\b|\beuros?\b|\bprice\b|\bpricing\b|à partir de/i;

describe('translations.services.pages — skeleton (SVC-06)', () => {
  for (const lang of LANGS) {
    it(`${lang}: declares services.pages with every non-items key populated by a non-empty string`, () => {
      const pages = translations[lang].services.pages;
      expect(pages).toBeDefined();

      expect(pages.index.badge.length).toBeGreaterThan(0);
      expect(pages.index.title_l1.length).toBeGreaterThan(0);
      expect(pages.index.title_l2_it.length).toBeGreaterThan(0);
      expect(pages.index.sub.length).toBeGreaterThan(0);
      expect(pages.index.num.length).toBeGreaterThan(0);
      expect(pages.index.intro.length).toBeGreaterThan(0);
      expect(pages.index.cardCta.length).toBeGreaterThan(0);

      expect(pages.back.length).toBeGreaterThan(0);
      expect(pages.answerLabel.length).toBeGreaterThan(0);
      expect(pages.caseLabel.length).toBeGreaterThan(0);

      expect(pages.headings.probleme.length).toBeGreaterThan(0);
      expect(pages.headings.fonctionnement.length).toBeGreaterThan(0);
      expect(pages.headings.enjeux.length).toBeGreaterThan(0);
      expect(pages.headings.preuve.length).toBeGreaterThan(0);
      expect(pages.headings.faq.length).toBeGreaterThan(0);

      expect(pages.ctaHeading_l1.length).toBeGreaterThan(0);
      expect(pages.ctaHeading_l2_it.length).toBeGreaterThan(0);
      expect(pages.ctaSub.length).toBeGreaterThan(0);
      expect(pages.ctaPrimary.length).toBeGreaterThan(0);
      expect(pages.ctaSecondary.length).toBeGreaterThan(0);
    });
  }

  it('fr/en/th all declare the same t.services.pages.items length (locale parity)', () => {
    const lengths = LANGS.map((lang) => translations[lang].services.pages.items.length);
    expect(new Set(lengths).size).toBe(1);
  });

  it('every item present in any locale has non-empty string fields and non-empty arrays', () => {
    for (const lang of LANGS) {
      for (const item of translations[lang].services.pages.items) {
        expect(item.name.length).toBeGreaterThan(0);
        expect(item.tagline.length).toBeGreaterThan(0);
        expect(item.h1Lead.length).toBeGreaterThan(0);
        expect(item.h1Benefit.length).toBeGreaterThan(0);
        expect(item.sub.length).toBeGreaterThan(0);
        expect(item.metaTitle.length).toBeGreaterThan(0);
        expect(item.metaDescription.length).toBeGreaterThan(0);
        expect(item.directAnswer.length).toBeGreaterThan(0);
        expect(item.problems.length).toBeGreaterThan(0);
        expect(item.features.length).toBeGreaterThan(0);
        expect(item.enjeux.length).toBeGreaterThan(0);
        expect(item.signals.length).toBeGreaterThan(0);
        expect(item.faq.length).toBeGreaterThan(0);
      }
    }
  });

  it('SVC-02: no pricing language appears anywhere in services.pages, for any locale', () => {
    for (const lang of LANGS) {
      const serialized = JSON.stringify(translations[lang].services.pages);
      expect(serialized).not.toMatch(PRICE_PATTERN);
    }
  });

  it('advisory: fr item word counts are reported and stay within the hard bounds 200-700 (D-02 target 300-500)', () => {
    for (const item of translations.fr.services.pages.items) {
      const words = [
        item.h1Lead,
        item.h1Benefit,
        item.sub,
        item.directAnswer,
        ...item.problems.map((p) => `${p.title} ${p.desc}`),
        ...item.features,
        ...item.enjeux,
        ...item.signals.map((s) => `${s.t} ${s.d}`),
        ...item.faq.map((f) => `${f.q} ${f.a}`),
      ]
        .join(' ')
        .split(/\s+/)
        .filter(Boolean).length;

      if (words < 300 || words > 500) {
        console.warn(`fr item "${item.name}" word count ${words} outside D-02 target 300-500`);
      }
      expect(words).toBeGreaterThanOrEqual(200);
      expect(words).toBeLessThanOrEqual(700);
    }
  });
});
