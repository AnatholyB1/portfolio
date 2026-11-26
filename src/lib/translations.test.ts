import { describe, expect, it } from 'vitest';
import { translations, type ServicePageContent } from './translations';
import { services, getServiceBySlug } from '@/data/services';
import { caseStudyProjects } from '@/data/projects';
import { QUESTIONS } from '@/lib/simulateur/questions';

const LANGS = ['fr', 'en', 'th'] as const;

/** Un item est « étendu » dès qu'il utilise un bloc de contenu long (FAQ jusqu'à 8). */
function isExtended(item: ServicePageContent): boolean {
  return Boolean(item.longIntro?.length || item.sections?.length || item.steps?.length);
}

// SVC-02 no-price guard — must never match anywhere in t.services.pages,
// for any locale, at any stage of the phase (covers items[] automatically
// as later plans append entries).
// Décision 2026-11 : les adresses de liens (`href`) sont ignorées (ex. /guides/prix-site-vitrine).
const withoutHrefs = (_k: string, v: unknown) => (_k === 'href' ? undefined : v);
const PRICE_PATTERN = /€|฿|\bprix\b|\btarifs?\b|\beuros?\b|\bprice\b|\bpricing\b|à partir de/i;

// SIMU-06 guard — deliberately stricter than SVC-02's PRICE_PATTERN because
// the simulator must also never claim a service is free of charge or
// promise a written estimate (devis/gratuit/free), on top of the currency
// and price/tariff vocabulary PRICE_PATTERN already covers.
const SIMU_PRICE_PATTERN = /€|฿|\$|£|\bprix\b|\btarifs?\b|\beuros?\b|\bprice\b|\bpricing\b|\bdevis\b|\bco[uû]te?\w*\b|\bgratuit\w*\b|\bfree\b|à partir de/i;

/** Recursively descends plain objects and arrays and collects every string
 * leaf value, paired with a dotted key path for failure messages. */
function collectStringLeaves(value: unknown, path: string): { path: string; value: string }[] {
  if (typeof value === 'string') {
    return [{ path, value }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => collectStringLeaves(item, `${path}[${i}]`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      collectStringLeaves(v, path ? `${path}.${k}` : k)
    );
  }
  return [];
}

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
      // Décision 2026-11 : les libellés `extra` et les items qui portent un bloc
      // `pricing` (prix « à partir de », TVA non applicable art. 293 B) sont exemptés.
      const { extra: _extra, items, ...rest } = translations[lang].services.pages;
      void _extra;
      const guarded = { ...rest, items: items.filter((it) => !it.pricing) };
      expect(JSON.stringify(guarded, withoutHrefs)).not.toMatch(PRICE_PATTERN);
    }
  });

  it('advisory: fr item word counts are reported and stay within the hard bounds 200-700 (D-02 target 300-500)', () => {
    for (const item of translations.fr.services.pages.items) {
      if (isExtended(item)) continue; // contenu long : voir le bloc « contenu long » en fin de fichier
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

describe('service pages content — complete set (SVC-01..06, 10-of-10 completeness gate)', () => {
  for (const lang of LANGS) {
    it(`${lang}: t.services.pages.items.length === services.length === 10`, () => {
      expect(translations[lang].services.pages.items.length).toBe(services.length);
      expect(translations[lang].services.pages.items.length).toBe(10);
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
        expect(item.faq.length, `${lang} ${item.name} faq`).toBeLessThanOrEqual(isExtended(item) ? 8 : 4);
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

  it('SVC-02: no-price guard passes over all 10 entries in all 3 locales', () => {
    for (const lang of LANGS) {
      for (const item of translations[lang].services.pages.items) {
        if (item.pricing) continue; // pages avec bloc tarifs : prix « à partir de » autorisés (décision 2026-11)
        const serialized = JSON.stringify(item, withoutHrefs);
        expect(serialized).not.toMatch(PRICE_PATTERN);
      }
    }
  });

  it('advisory: fr item word counts land in 200-700, warns outside 300-500 (D-02) — full 10-of-10 pass', () => {
    for (const item of translations.fr.services.pages.items) {
      if (isExtended(item)) continue;
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

describe('translations.simulateur (SIMU-05, SIMU-06, SIMU-08)', () => {
  // SIMU-06
  it('no price, tariff, currency or free-of-charge language appears in t.simulateur, for any locale', () => {
    for (const lang of LANGS) {
      const serialized = JSON.stringify(translations[lang].simulateur);
      expect(serialized).not.toMatch(PRICE_PATTERN);
      expect(serialized).not.toMatch(SIMU_PRICE_PATTERN);
    }
  });

  // Key join (forward): every question/option in QUESTIONS has a label in every locale.
  it('every QUESTIONS id and option value has a defined, non-empty label in every locale', () => {
    for (const lang of LANGS) {
      const simQuestions = translations[lang].simulateur.questions;
      for (const question of QUESTIONS) {
        const entry = simQuestions[question.id];
        expect(entry, `${lang}: simulateur.questions["${question.id}"]`).toBeDefined();
        expect(entry.text.trim().length, `${lang}: questions["${question.id}"].text`).toBeGreaterThan(0);
        expect(entry.hint.trim().length, `${lang}: questions["${question.id}"].hint`).toBeGreaterThan(0);
        for (const option of question.options) {
          const label = entry.options[option.value];
          expect(label, `${lang}: questions["${question.id}"].options["${option.value}"]`).toBeDefined();
          expect(
            label?.trim().length ?? 0,
            `${lang}: questions["${question.id}"].options["${option.value}"]`
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  // Key join (reverse): no stale question or option key survives in translations.ts.
  it('no locale declares a questions/options key absent from QUESTIONS (no stale labels)', () => {
    const validQuestionIds = new Set(QUESTIONS.map((q) => q.id));
    for (const lang of LANGS) {
      const simQuestions = translations[lang].simulateur.questions;
      for (const questionId of Object.keys(simQuestions)) {
        expect(validQuestionIds.has(questionId), `${lang}: stale question key "${questionId}"`).toBe(true);
      }
      for (const question of QUESTIONS) {
        const entry = simQuestions[question.id];
        if (!entry) continue;
        const validOptionValues = new Set(question.options.map((o) => o.value));
        for (const optionKey of Object.keys(entry.options)) {
          expect(
            validOptionValues.has(optionKey),
            `${lang}: stale option key "${optionKey}" on question "${question.id}"`
          ).toBe(true);
        }
      }
    }
  });

  // Locale parity
  it('intro.paragraphs (3), contact.rgpdMentions (5) and faq (4) have identical lengths across fr/en/th', () => {
    const introLengths = LANGS.map((lang) => translations[lang].simulateur.intro.paragraphs.length);
    const rgpdLengths = LANGS.map((lang) => translations[lang].simulateur.contact.rgpdMentions.length);
    const faqLengths = LANGS.map((lang) => translations[lang].simulateur.faq.length);

    expect(new Set(introLengths).size).toBe(1);
    expect(new Set(rgpdLengths).size).toBe(1);
    expect(new Set(faqLengths).size).toBe(1);

    expect(introLengths[0]).toBe(3);
    expect(rgpdLengths[0]).toBe(5);
    expect(faqLengths[0]).toBe(4);
  });

  // SIMU-05
  it('Art. 13 completeness: rgpdMentions covers controller, email, 12-month retention and CNIL in every locale', () => {
    for (const lang of LANGS) {
      const simulateur = translations[lang].simulateur;
      const rgpdText = simulateur.contact.rgpdMentions.map((m) => m.v).join(' ');
      expect(rgpdText, `${lang}: rgpdMentions`).toContain('contact@sevalys.com');
      expect(rgpdText, `${lang}: rgpdMentions`).toContain('Sèvalys');
      expect(rgpdText, `${lang}: rgpdMentions`).toContain('12');
      expect(rgpdText, `${lang}: rgpdMentions`).toContain('CNIL');
      expect(simulateur.contact.consentLabel.trim().length, `${lang}: consentLabel`).toBeGreaterThan(0);
    }
  });

  // SIMU-08
  it('faq has at least 3 entries with non-empty q/a in every locale, feeding a non-trivial buildFaqJsonLd mainEntity', () => {
    for (const lang of LANGS) {
      const faq = translations[lang].simulateur.faq;
      expect(faq.length, `${lang}: faq.length`).toBeGreaterThanOrEqual(3);
      for (const entry of faq) {
        expect(entry.q.trim().length, `${lang}: faq entry q`).toBeGreaterThan(0);
        expect(entry.a.trim().length, `${lang}: faq entry a`).toBeGreaterThan(0);
      }
    }
  });

  // Template integrity
  it('progressLabel contains both {current} and {total} tokens in every locale', () => {
    for (const lang of LANGS) {
      const progressLabel = translations[lang].simulateur.progressLabel;
      expect(progressLabel, `${lang}: progressLabel`).toContain('{current}');
      expect(progressLabel, `${lang}: progressLabel`).toContain('{total}');
    }
  });

  it('every leaf string in translations[lang].simulateur is non-empty after trimming', () => {
    for (const lang of LANGS) {
      const leaves = collectStringLeaves(translations[lang].simulateur, `${lang}.simulateur`);
      for (const leaf of leaves) {
        expect(leaf.value.trim().length, leaf.path).toBeGreaterThan(0);
      }
    }
  });
});

describe('translations.landing — accueil SEO (prix affichés, sections fusionnées)', () => {
  it('prices on the home always come with the VAT mention (art. 293 B), in every locale', () => {
    for (const lang of LANGS) {
      const landing = translations[lang].landing;
      expect(JSON.stringify(landing), `${lang}: landing prices`).toMatch(/€/);
      expect(landing.servicesPreview.vat, `${lang}: servicesPreview.vat`).toContain('293 B');
    }
  });

  for (const lang of LANGS) {
    it(`${lang}: manifeste merges problems and stakes in 3-4 short items; method has 3-4 steps`, () => {
      const { manifeste, method } = translations[lang].landing;
      expect(manifeste.items.length, `${lang}: manifeste.items`).toBeGreaterThanOrEqual(3);
      expect(manifeste.items.length, `${lang}: manifeste.items`).toBeLessThanOrEqual(4);
      expect(method.steps.length, `${lang}: method.steps`).toBeGreaterThanOrEqual(3);
      expect(method.steps.length, `${lang}: method.steps`).toBeLessThanOrEqual(4);
    });
  }

  it('locale parity: items, cards, towns, why and faq counts are identical across fr/en/th', () => {
    const counts = (pick: (l: (typeof translations)['fr']['landing']) => number) =>
      new Set(LANGS.map((lang) => pick(translations[lang].landing))).size;
    expect(counts((l) => l.manifeste.items.length), 'manifeste.items').toBe(1);
    expect(counts((l) => l.method.steps.length), 'method.steps').toBe(1);
    expect(counts((l) => l.servicesPreview.cards.length), 'servicesPreview.cards').toBe(1);
    expect(counts((l) => l.zone.towns.length), 'zone.towns').toBe(1);
    expect(counts((l) => l.why.items.length), 'why.items').toBe(1);
    expect(counts((l) => l.faq.items.length), 'faq.items').toBe(1);
  });

  it('FAQ: 6 to 8 questions, each with a question mark and a non-empty answer (fr)', () => {
    const { items } = translations.fr.landing.faq;
    expect(items.length).toBeGreaterThanOrEqual(6);
    expect(items.length).toBeLessThanOrEqual(8);
    for (const item of items) {
      expect(item.q.trim().endsWith('?'), item.q).toBe(true);
      expect(item.a.trim().length, item.q).toBeGreaterThan(0);
    }
  });

  it('section counter integrity: manifeste/servicesPreview/work/method/zone/why/faq/contact are 01/08..08/08 in order, in every locale', () => {
    const expectedPairs: [string, string][] = [
      ['manifeste', '01 / 08'],
      ['servicesPreview', '02 / 08'],
      ['work', '03 / 08'],
      ['method', '04 / 08'],
      ['zone', '05 / 08'],
      ['why', '06 / 08'],
      ['faq', '07 / 08'],
      ['contact', '08 / 08'],
    ];
    for (const lang of LANGS) {
      const landingRecord = translations[lang].landing as unknown as Record<
        string,
        { num?: string } | undefined
      >;
      for (const [key, expectedNum] of expectedPairs) {
        expect(landingRecord[key]?.num, `${lang}: t.landing.${key}.num`).toBe(expectedNum);
      }
    }
  });

  it('removed blocks stay removed (problems, enjeux, phone) and the hero has no dated pill', () => {
    for (const lang of LANGS) {
      const landing = translations[lang].landing as unknown as Record<string, unknown>;
      for (const key of ['problems', 'enjeux', 'phone']) {
        expect(Object.keys(landing), `${lang}: t.landing.${key}`).not.toContain(key);
      }
      expect(translations[lang].landing.hero.pill, lang).not.toMatch(/20\d\d/);
    }
  });

  for (const lang of LANGS) {
    it(`${lang}: every string leaf under t.landing is non-empty after trimming`, () => {
      const leaves = collectStringLeaves(translations[lang].landing, `${lang}.landing`);
      for (const leaf of leaves) {
        expect(leaf.value.trim().length, leaf.path).toBeGreaterThan(0);
      }
    });
  }
});

describe('service pages — blocs optionnels « contenu long »', () => {
  const frItems = translations.fr.services.pages.items;

  it('fr/en/th declare the same extra labels, all non-empty', () => {
    const keys = Object.keys(translations.fr.services.pages.extra).sort();
    for (const lang of LANGS) {
      const extra = translations[lang].services.pages.extra;
      expect(Object.keys(extra).sort()).toEqual(keys);
      for (const v of Object.values(extra)) expect(v.trim().length).toBeGreaterThan(0);
    }
  });

  it('optional blocks exist in all locales with the same shape and locale-invariant fields', () => {
    for (const svc of services) {
      const fr = translations.fr.services.pages.items[svc.index];
      for (const lang of ['en', 'th'] as const) {
        const it = translations[lang].services.pages.items[svc.index];
        const tag = `${lang} ${svc.slug}`;
        for (const key of ['longIntro', 'sections', 'pricing', 'steps', 'areas', 'proofProjects', 'internalLinks'] as const) {
          expect(Boolean(it[key]), `${tag} ${key} presence`).toBe(Boolean(fr[key]));
        }
        expect(it.sections?.length, tag).toBe(fr.sections?.length);
        expect(it.steps?.length, tag).toBe(fr.steps?.length);
        expect(it.longIntro?.length, tag).toBe(fr.longIntro?.length);
        expect(it.pricing?.price, tag).toBe(fr.pricing?.price);
        expect(it.pricing?.includes.length, tag).toBe(fr.pricing?.includes.length);
        expect(it.pricing?.extras.length, tag).toBe(fr.pricing?.extras.length);
        expect(it.proofProjects, tag).toEqual(fr.proofProjects);
        expect(it.areas, tag).toEqual(fr.areas);
        expect(it.internalLinks?.map((l) => l.href), tag).toEqual(fr.internalLinks?.map((l) => l.href));
        expect(it.sections?.map((s) => s.link?.href), tag).toEqual(fr.sections?.map((s) => s.link?.href));
      }
    }
  });

  it('pricing: positive price, mandatory VAT note (art. 293 B), non-empty lists', () => {
    for (const lang of LANGS) {
      for (const it of translations[lang].services.pages.items) {
        if (!it.pricing) continue;
        expect(it.pricing.price, `${lang} ${it.name}`).toBeGreaterThan(0);
        expect(it.pricing.note, `${lang} ${it.name}`).toContain('293 B');
        expect(it.pricing.includes.length, `${lang} ${it.name}`).toBeGreaterThan(0);
        expect(it.pricing.fromLabel.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('proofProjects are valid caseStudyProjects indexes; internal links are internal absolute paths', () => {
    for (const lang of LANGS) {
      for (const it of translations[lang].services.pages.items) {
        for (const i of it.proofProjects ?? []) {
          expect(caseStudyProjects[i], `${lang} ${it.name} proof ${i}`).toBeDefined();
        }
        for (const l of it.internalLinks ?? []) {
          expect(l.href, `${lang} ${it.name}`).toMatch(/^\/[a-z0-9\-/]*$/);
          expect(l.label.trim().length).toBeGreaterThan(0);
        }
        for (const s of it.sections ?? []) expect(s.paragraphs.length).toBeGreaterThan(0);
        for (const st of it.steps ?? []) expect(st.duration.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('SEO: fr title (with brand suffix) <= 60 and meta description <= 155 chars', () => {
    for (const it of frItems) {
      expect(`${it.metaTitle} · Sèvalys`.length, it.name).toBeLessThanOrEqual(60);
      expect(it.metaDescription.length, it.name).toBeLessThanOrEqual(155);
    }
  });

  it('extended fr items: 7-8 FAQ entries', () => {
    for (const it of frItems) {
      if (!isExtended(it)) continue;
      expect(it.faq.length, it.name).toBeGreaterThanOrEqual(7);
      expect(it.faq.length, it.name).toBeLessThanOrEqual(8);
    }
  });
});
