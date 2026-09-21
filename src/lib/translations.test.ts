import { describe, expect, it } from 'vitest';
import { translations } from './translations';
import { services, getServiceBySlug } from '@/data/services';
import { QUESTIONS } from '@/lib/simulateur/questions';

const LANGS = ['fr', 'en', 'th'] as const;

// SVC-02 no-price guard — must never match anywhere in t.services.pages,
// for any locale, at any stage of the phase (covers items[] automatically
// as later plans append entries).
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

describe('translations.landing + translations.services — Phase 8 pricing policy (PRIX-01)', () => {
  // The four new landing keys below (problems, servicesPreview, method, enjeux)
  // and the work.bridge_* fields do not exist on the Translations interface
  // yet — plans 03/05 add them. A direct `translations[lang].landing.problems`
  // access would fail `tsc` today even though Vitest would transpile it
  // (repo runs eslint-config-next/typescript, so `any` is also off the table).
  // This local structural type + `landingOf` cast lets every assertion below
  // compile now and keep compiling once the real fields land.
  type Phase8Landing = {
    problems: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      items: { n: string; title: string; desc: string }[];
      good_news: string;
      cta: string;
    };
    servicesPreview: { num: string; title_l1: string; title_l2_it: string; intro: string };
    method: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      steps: { n: string; t: string; d: string }[];
    };
    enjeux: {
      num: string;
      title_l1: string;
      title_l2_it: string;
      intro: string;
      points: { t: string; d: string }[];
    };
    work: { num: string; bridge_title_l1: string; bridge_title_it: string; bridge_body: string };
    manifeste: { num: string };
    contact: { num: string };
    phone: Record<string, unknown>;
  };

  const landingOf = (lang: (typeof LANGS)[number]) =>
    translations[lang].landing as unknown as Partial<Phase8Landing>;

  for (const lang of LANGS) {
    it(`${lang}: t.landing contains no pricing language (PRIX-01, forward regression guard — green today, must stay green)`, () => {
      const serialized = JSON.stringify(translations[lang].landing);
      expect(serialized).not.toMatch(PRICE_PATTERN);
    });
  }

  for (const lang of LANGS) {
    it(`${lang}: t.services contains no pricing language (PRIX-01, RED until plan 03 removes hero/offers/maintenance)`, () => {
      const serialized = JSON.stringify(translations[lang].services);
      expect(serialized).not.toMatch(PRICE_PATTERN);
    });
  }

  for (const lang of LANGS) {
    it(`${lang}: t.landing.problems exists with the full Phase 8 shape, 3-4 items (RED until plan 03)`, () => {
      const problems = landingOf(lang).problems;
      expect(problems, `${lang}: t.landing.problems`).toBeDefined();
      expect(problems?.num?.length ?? 0, `${lang}: problems.num`).toBeGreaterThan(0);
      expect(problems?.title_l1?.length ?? 0, `${lang}: problems.title_l1`).toBeGreaterThan(0);
      expect(problems?.title_l2_it?.length ?? 0, `${lang}: problems.title_l2_it`).toBeGreaterThan(0);
      expect(problems?.intro?.length ?? 0, `${lang}: problems.intro`).toBeGreaterThan(0);
      expect(problems?.good_news?.length ?? 0, `${lang}: problems.good_news`).toBeGreaterThan(0);
      expect(problems?.cta?.length ?? 0, `${lang}: problems.cta`).toBeGreaterThan(0);
      const items = problems?.items ?? [];
      expect(items.length, `${lang}: problems.items.length`).toBeGreaterThanOrEqual(3);
      expect(items.length, `${lang}: problems.items.length`).toBeLessThanOrEqual(4);
      for (const [i, item] of items.entries()) {
        expect(item.n?.length ?? 0, `${lang}: problems.items[${i}].n`).toBeGreaterThan(0);
        expect(item.title?.length ?? 0, `${lang}: problems.items[${i}].title`).toBeGreaterThan(0);
        expect(item.desc?.length ?? 0, `${lang}: problems.items[${i}].desc`).toBeGreaterThan(0);
      }
    });
  }

  for (const lang of LANGS) {
    it(`${lang}: t.landing.servicesPreview exists with num/title_l1/title_l2_it/intro (RED until plan 03)`, () => {
      const sp = landingOf(lang).servicesPreview;
      expect(sp, `${lang}: t.landing.servicesPreview`).toBeDefined();
      expect(sp?.num?.length ?? 0, `${lang}: servicesPreview.num`).toBeGreaterThan(0);
      expect(sp?.title_l1?.length ?? 0, `${lang}: servicesPreview.title_l1`).toBeGreaterThan(0);
      expect(sp?.title_l2_it?.length ?? 0, `${lang}: servicesPreview.title_l2_it`).toBeGreaterThan(0);
      expect(sp?.intro?.length ?? 0, `${lang}: servicesPreview.intro`).toBeGreaterThan(0);
    });
  }

  for (const lang of LANGS) {
    it(`${lang}: t.landing.method exists with 3-4 steps (RED until plan 03)`, () => {
      const method = landingOf(lang).method;
      expect(method, `${lang}: t.landing.method`).toBeDefined();
      const steps = method?.steps ?? [];
      expect(steps.length, `${lang}: method.steps.length`).toBeGreaterThanOrEqual(3);
      expect(steps.length, `${lang}: method.steps.length`).toBeLessThanOrEqual(4);
      for (const [i, step] of steps.entries()) {
        expect(step.n?.length ?? 0, `${lang}: method.steps[${i}].n`).toBeGreaterThan(0);
        expect(step.t?.length ?? 0, `${lang}: method.steps[${i}].t`).toBeGreaterThan(0);
        expect(step.d?.length ?? 0, `${lang}: method.steps[${i}].d`).toBeGreaterThan(0);
      }
    });
  }

  for (const lang of LANGS) {
    it(`${lang}: t.landing.enjeux exists with 3-4 points (RED until plan 03)`, () => {
      const enjeux = landingOf(lang).enjeux;
      expect(enjeux, `${lang}: t.landing.enjeux`).toBeDefined();
      const points = enjeux?.points ?? [];
      expect(points.length, `${lang}: enjeux.points.length`).toBeGreaterThanOrEqual(3);
      expect(points.length, `${lang}: enjeux.points.length`).toBeLessThanOrEqual(4);
      for (const [i, point] of points.entries()) {
        expect(point.t?.length ?? 0, `${lang}: enjeux.points[${i}].t`).toBeGreaterThan(0);
        expect(point.d?.length ?? 0, `${lang}: enjeux.points[${i}].d`).toBeGreaterThan(0);
      }
    });
  }

  for (const lang of LANGS) {
    it(`${lang}: t.landing.work gains bridge_title_l1/bridge_title_it/bridge_body (RED until plan 03)`, () => {
      const work = landingOf(lang).work;
      expect(work?.bridge_title_l1?.length ?? 0, `${lang}: work.bridge_title_l1`).toBeGreaterThan(0);
      expect(work?.bridge_title_it?.length ?? 0, `${lang}: work.bridge_title_it`).toBeGreaterThan(0);
      expect(work?.bridge_body?.length ?? 0, `${lang}: work.bridge_body`).toBeGreaterThan(0);
    });
  }

  it('locale parity: problems.items.length, method.steps.length and enjeux.points.length are identical across fr/en/th (RED until plan 03)', () => {
    const problemsLengths = LANGS.map((lang) => landingOf(lang).problems?.items?.length ?? -1);
    const methodLengths = LANGS.map((lang) => landingOf(lang).method?.steps?.length ?? -1);
    const enjeuxLengths = LANGS.map((lang) => landingOf(lang).enjeux?.points?.length ?? -1);
    expect(new Set(problemsLengths).size, 'problems.items.length parity').toBe(1);
    expect(new Set(methodLengths).size, 'method.steps.length parity').toBe(1);
    expect(new Set(enjeuxLengths).size, 'enjeux.points.length parity').toBe(1);
  });

  for (const lang of LANGS) {
    it(`${lang}: t.landing.phone no longer declares the removed teaser keys (RED until plan 05)`, () => {
      const phoneKeys = Object.keys(
        translations[lang].landing.phone as unknown as Record<string, unknown>
      );
      const removed = ['num', 'features', 'cta_demo', 'cta_more', 'flow_label', 'flow_rec', 'flow_steps'];
      for (const key of removed) {
        expect(phoneKeys, `${lang}: t.landing.phone should not declare "${key}"`).not.toContain(key);
      }
    });

    it(`${lang}: t.landing.phone still declares the surviving teaser keys, non-empty`, () => {
      const phone = translations[lang].landing.phone as unknown as Record<string, unknown>;
      for (const key of ['badge', 'title_l1', 'title_l2', 'title_l3_it', 'sub', 'cta_roi']) {
        const value = phone[key];
        expect(typeof value === 'string' && value.length > 0, `${lang}: t.landing.phone.${key}`).toBe(true);
      }
    });
  }

  it('section counter integrity: manifeste/problems/servicesPreview/method/enjeux/work/contact are 01/07..07/07 in order, in every locale (RED until plans 03/05)', () => {
    const expectedPairs: [string, string][] = [
      ['manifeste', '01 / 07'],
      ['problems', '02 / 07'],
      ['servicesPreview', '03 / 07'],
      ['method', '04 / 07'],
      ['enjeux', '05 / 07'],
      ['work', '06 / 07'],
      ['contact', '07 / 07'],
    ];
    for (const lang of LANGS) {
      const landingRecord = translations[lang].landing as unknown as Record<
        string,
        { num?: string } | undefined
      >;
      for (const [key, expectedNum] of expectedPairs) {
        const actualNum = landingRecord[key]?.num;
        expect(actualNum, `${lang}: t.landing.${key}.num`).toBe(expectedNum);
      }
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
