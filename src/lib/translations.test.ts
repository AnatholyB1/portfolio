import { describe, expect, it } from 'vitest';
import { translations } from './translations';
import { services, getServiceBySlug } from '@/data/services';

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
        // signals is [] when caseQuote is used instead (see ServicePageContent
        // interface contract: "3 trust signals when caseQuote is null, otherwise []").
        if (item.caseQuote === null) {
          expect(item.signals.length).toBeGreaterThan(0);
        } else {
          expect(item.signals.length).toBe(0);
        }
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

describe('service pages content — complete set (SVC-01..06, 9-of-9 completeness gate)', () => {
  for (const lang of LANGS) {
    it(`${lang}: t.services.pages.items.length === services.length === 9`, () => {
      expect(translations[lang].services.pages.items.length).toBe(services.length);
      expect(translations[lang].services.pages.items.length).toBe(9);
    });
  }

  it('every service in services.ts has a defined items[service.index] entry in all 3 locales', () => {
    for (const lang of LANGS) {
      for (const service of services) {
        const item = translations[lang].services.pages.items[service.index];
        expect(item, `${lang} item at index ${service.index} (${service.slug})`).toBeDefined();
      }
    }
  });

  it('every item in every locale has non-empty required string fields after trimming', () => {
    for (const lang of LANGS) {
      for (const item of translations[lang].services.pages.items) {
        expect(item.name.trim().length).toBeGreaterThan(0);
        expect(item.tagline.trim().length).toBeGreaterThan(0);
        expect(item.h1Lead.trim().length).toBeGreaterThan(0);
        expect(item.h1Benefit.trim().length).toBeGreaterThan(0);
        expect(item.sub.trim().length).toBeGreaterThan(0);
        expect(item.metaTitle.trim().length).toBeGreaterThan(0);
        expect(item.metaDescription.trim().length).toBeGreaterThan(0);
        expect(item.directAnswer.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('every item in every locale satisfies the array-shape bounds (problems=3, features 5-7, enjeux 1-2, faq 3-4, faq entries non-empty)', () => {
    for (const lang of LANGS) {
      for (const item of translations[lang].services.pages.items) {
        expect(item.problems.length, `${lang} ${item.name} problems`).toBe(3);
        expect(item.features.length, `${lang} ${item.name} features`).toBeGreaterThanOrEqual(5);
        expect(item.features.length, `${lang} ${item.name} features`).toBeLessThanOrEqual(7);
        expect(item.enjeux.length, `${lang} ${item.name} enjeux`).toBeGreaterThanOrEqual(1);
        expect(item.enjeux.length, `${lang} ${item.name} enjeux`).toBeLessThanOrEqual(2);
        expect(item.faq.length, `${lang} ${item.name} faq`).toBeGreaterThanOrEqual(3);
        expect(item.faq.length, `${lang} ${item.name} faq`).toBeLessThanOrEqual(4);
        for (const faqEntry of item.faq) {
          expect(faqEntry.q.trim().length).toBeGreaterThan(0);
          expect(faqEntry.a.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('social-proof rule per service index (D-05/D-06): caseStudyProjectIndex !== null => caseQuote set + signals empty; null => caseQuote null + 3 signals', () => {
    for (const lang of LANGS) {
      for (const service of services) {
        const item = translations[lang].services.pages.items[service.index];
        if (service.caseStudyProjectIndex !== null) {
          expect(item.caseQuote, `${lang} ${service.slug} caseQuote`).not.toBeNull();
          expect(item.caseQuote?.trim().length ?? 0, `${lang} ${service.slug} caseQuote`).toBeGreaterThan(0);
          expect(item.signals.length, `${lang} ${service.slug} signals`).toBe(0);
        } else {
          expect(item.caseQuote, `${lang} ${service.slug} caseQuote`).toBeNull();
          expect(item.signals.length, `${lang} ${service.slug} signals`).toBe(3);
        }
      }
    }
  });

  it('every non-null crossLink.slug resolves via getServiceBySlug to an existing service', () => {
    for (const lang of LANGS) {
      for (const item of translations[lang].services.pages.items) {
        if (item.crossLink !== null) {
          const resolved = getServiceBySlug(item.crossLink.slug);
          expect(resolved, `${lang} crossLink target "${item.crossLink.slug}"`).toBeDefined();
        }
      }
    }
  });

  it('SVC-02: no-price guard passes over all 9 entries in all 3 locales', () => {
    for (const lang of LANGS) {
      for (const item of translations[lang].services.pages.items) {
        const serialized = JSON.stringify(item);
        expect(serialized).not.toMatch(PRICE_PATTERN);
      }
    }
  });

  it('advisory: fr item word counts land in 200-700, warns outside 300-500 (D-02) — full 9-of-9 pass', () => {
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
