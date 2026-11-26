import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { services } from '@/data/services';
import { translations } from '@/lib/translations';
import { buildFaqJsonLd } from '@/lib/serviceJsonLd';

// Missing files read as an empty string so collection never crashes; assertions fail as normal
// assertions instead of throwing on a missing file.
const readIfExists = (relative: string): string => {
  try {
    return readFileSync(new URL(relative, import.meta.url), 'utf8');
  } catch {
    return '';
  }
};

const pageSource = readIfExists('./page.tsx');

// Accueil SEO (brief du 26/11/2026) : Manifeste fusionne l'ancien Manifeste, les Problèmes et les Enjeux ;
// PhoneAgent devient une carte d'offre ; le défilé de partenaires est retiré (preuves = 4 sites réels).
const SECTION_MARKERS = [
  '<HeroSection',
  '<Manifeste',
  '<ServicesPreview',
  '<Realisations',
  '<FonctionnementSection',
  '<ZoneSection',
  '<WhySection',
  '<AvisExcerpt',
  '<FaqSection',
  '<ContactSection',
];

describe('landing composition (LANDING-01)', () => {
  it('src/app/page.tsx contains every required section marker', () => {
    for (const marker of SECTION_MARKERS) {
      expect(pageSource, `missing marker "${marker}"`).toContain(marker);
    }
  });

  it('the section markers appear in the exact LANDING-01 order', () => {
    const indices = SECTION_MARKERS.map((marker) => pageSource.indexOf(marker));
    for (let i = 0; i < indices.length - 1; i++) {
      expect(
        indices[i],
        `"${SECTION_MARKERS[i]}" must be present before "${SECTION_MARKERS[i + 1]}"`
      ).toBeGreaterThanOrEqual(0);
      expect(
        indices[i + 1],
        `"${SECTION_MARKERS[i]}" must appear before "${SECTION_MARKERS[i + 1]}"`
      ).toBeGreaterThan(indices[i]);
    }
  });
});

// CTA Destination Table (08-UI-SPEC.md), classes A/B/C — the authoritative
// encoding of D-11 (class B: /services/agent-vocal-ia, locked by D-02/D-08)
// and D-12 (class C: the 9 navigational service-preview card links mandated
// by LANDING-01's "cartes renvoyant vers chaque page dédiée" clause). Do NOT
// "correct" this to a literal simulateur/contact-only check — 08-CONTEXT.md
// D-11/D-12 lock these exceptions; a failure here means a real regression,
// not a too-permissive allowlist.
const ALLOWED_HREFS = [
  '/simulateur',
  '#contact',
  '/services',
  '/guides/prix-site-vitrine',
  '/guides/seo-local',
];
const ALLOWED_HREF_PREFIXES = ['tel:', 'mailto:'];
const SLUG_TEMPLATE_HREF = '`/services/${s.slug}`';

const DEAD_DESTINATIONS = [
  '/services#phone-agent',
  'href="/demo"',
  'href="/calculateur-roi"',
];

// Deliberately excluded from the CTA scan: src/components/layout/Navbar.tsx
// and Footer.tsx. 08-UI-SPEC.md's CTA Destination Table rows 12/14 classify
// these persistent-chrome links as non-CTA navigation (present on every
// page, not part of the landing's content flow) — do not "helpfully" add
// Navbar/Footer to this scan.
const CTA_COMPONENT_FILES = [
  'HeroSection.tsx',
  'Manifeste.tsx',
  'ServicesPreview.tsx',
  'FonctionnementSection.tsx',
  'Realisations.tsx',
  'ZoneSection.tsx',
  'WhySection.tsx',
  'FaqSection.tsx',
  'ContactSection.tsx',
];

const HREF_PATTERN = /href=(?:"([^"]*)"|\{`([^`]*)`\})/g;

function extractHrefs(source: string): string[] {
  const hrefs: string[] = [];
  let match: RegExpExecArray | null;
  HREF_PATTERN.lastIndex = 0;
  while ((match = HREF_PATTERN.exec(source)) !== null) {
    if (match[1] !== undefined) {
      hrefs.push(match[1]);
    } else if (match[2] !== undefined) {
      // Re-wrap the template capture in backticks for comparison against
      // SLUG_TEMPLATE_HREF's literal template source text.
      hrefs.push(`\`${match[2]}\``);
    }
  }
  return hrefs;
}

describe('landing CTA destinations (LANDING-02)', () => {
  for (const file of CTA_COMPONENT_FILES) {
    it(`${file}: every href resolves to an allowed Class A/B/C destination`, () => {
      const source = readIfExists(`../components/sections/${file}`);
      const hrefs = extractHrefs(source);
      for (const href of hrefs) {
        const isAllowedLiteral = ALLOWED_HREFS.includes(href);
        const isAllowedPrefix = ALLOWED_HREF_PREFIXES.some((prefix) => href.startsWith(prefix));
        const isSlugTemplate = href === SLUG_TEMPLATE_HREF;
        expect(
          isAllowedLiteral || isAllowedPrefix || isSlugTemplate,
          `${file}: disallowed href "${href}"`
        ).toBe(true);
      }
    });
  }

  for (const file of CTA_COMPONENT_FILES) {
    it(`${file}: contains none of the dead/superseded destinations`, () => {
      const source = readIfExists(`../components/sections/${file}`);
      for (const dead of DEAD_DESTINATIONS) {
        expect(source, `${file}: found dead destination "${dead}"`).not.toContain(dead);
      }
    });
  }

  it('LANDING-03 non-regression: Realisations.tsx still renders the case-study list', () => {
    const source = readIfExists('../components/sections/Realisations.tsx');
    expect(source).toContain('projects.map(');
    expect(source).toContain('rz-list');
  });
});

describe('ServicesPreview cards (LANDING-01)', () => {
  const servicesPreviewSource = readIfExists('../components/sections/ServicesPreview.tsx');

  it('imports services from @/data/services', () => {
    expect(servicesPreviewSource).toMatch(
      /import\s*\{\s*services\s*\}\s*from\s*['"]@\/data\/services['"]/
    );
  });

  it('is data-driven: featured offers and the other services both come from the services data', () => {
    expect(servicesPreviewSource).toContain('FEATURED_SLUGS.map(');
    expect(servicesPreviewSource).toContain('services.filter(');
    expect(servicesPreviewSource).toContain('others.map(');
  });

  it('builds hrefs from the /services/ template prefix plus the slug expression', () => {
    expect(servicesPreviewSource).toContain(SLUG_TEMPLATE_HREF);
  });

  it('contains no hardcoded /services/<literal-slug> string for any of the 9 slugs', () => {
    for (const s of services) {
      expect(servicesPreviewSource).not.toContain(`"/services/${s.slug}"`);
      expect(servicesPreviewSource).not.toContain(`'/services/${s.slug}'`);
    }
  });
});

// ─── Accueil SEO (brief docs/seo/briefs/accueil.md, 26/11/2026) ───
describe('home SEO (agence digitale à Tours)', () => {
  const read = (relative: string) => readIfExists(relative);
  const hero = read('../components/sections/HeroSection.tsx');
  const faqSection = read('../components/sections/FaqSection.tsx');
  const layoutSource = read('./layout.tsx');
  const langs = ['fr', 'en', 'th'] as const;

  it('title is absolute (<= 60 chars) and meta description <= 155 chars', () => {
    const title = /const TITLE = '([^']+)'/.exec(pageSource)?.[1] ?? '';
    const description = /const DESCRIPTION =\s*'([^']+)'/.exec(pageSource)?.[1] ?? '';
    expect(pageSource).toContain('title: { absolute: TITLE }');
    expect(title).toContain('Agence digitale à Tours');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description.length).toBeGreaterThan(100);
    expect(description.length).toBeLessThanOrEqual(155);
    expect(description).toContain('500 €');
    expect(description).toContain('300 €/mois');
  });

  it('H1 reads « Agence digitale à Tours » and the promise stays in the subtitle', () => {
    const { hero: h } = translations.fr.landing;
    expect(`${h.title_l1} ${h.title_l2}${h.title_l2_it}`).toBe('Agence digitale à Tours');
    expect(h.sub).toContain('Des outils qui travaillent pour vos clients.');
    expect(h.pill).not.toMatch(/20\d\d|MAI/i);
  });

  it('no opacity reveal on the H1 or the subtitle (mobile LCP)', () => {
    const h1 = hero.slice(hero.indexOf('<h1'), hero.indexOf('</h1>'));
    expect(h1).not.toContain('data-reveal');
    expect(hero).toMatch(/<p className="hero-sub">/);
  });

  it('FAQPage JSON-LD lives on the home page only, identical to the visible FAQ', () => {
    expect(layoutSource).not.toContain('FAQPage');
    expect(pageSource).toContain('buildFaqJsonLd(translations.fr.landing.faq.items');
    expect(faqSection).toContain('f.items.map(');
    expect(faqSection).not.toContain('<details');
    const items = translations.fr.landing.faq.items;
    expect(items.length).toBeGreaterThanOrEqual(6);
    expect(items.length).toBeLessThanOrEqual(8);
    const jsonLd = buildFaqJsonLd(items, 'https://sevalys.com/');
    expect(jsonLd.mainEntity.map((e) => e.name)).toEqual(items.map((i) => i.q));
    expect(jsonLd.mainEntity.map((e) => e.acceptedAnswer.text)).toEqual(items.map((i) => i.a));
  });

  it('no aggregateRating anywhere on the home or the layout', () => {
    expect(pageSource).not.toContain('aggregateRating');
    expect(layoutSource).not.toContain('aggregateRating');
  });

  for (const lang of langs) {
    it(`${lang}: prices come with the VAT mention, the 4 real projects and the service area (no street address)`, () => {
      const l = translations[lang].landing;
      expect(l.servicesPreview.vat).toContain('293 B');
      const cards = JSON.stringify(l.servicesPreview.cards);
      expect(cards).toContain('500');
      expect(cards).toContain('300');
      expect(l.servicesPreview.cards).toHaveLength(5);
      expect(l.work.items.map((i) => i.name)).toEqual([
        'Grand Ouest Habitat',
        'Sellerie Duchet',
        'Gecko Cabane',
        'Ghjulianu Codani',
      ]);
      expect(l.zone.towns).toEqual([
        'Tours',
        'Saint-Avertin',
        'Joué-lès-Tours',
        'Saint-Cyr-sur-Loire',
        'La Riche',
        'Chambray-lès-Tours',
      ]);
      const zone = JSON.stringify(l.zone) + JSON.stringify(l.contact.info);
      expect(zone).not.toMatch(/\b\d{5}\b|\brue\b|\bavenue\b|\bboulevard\b|\bstreet\b/i);
      expect(l.faq.items.length).toBe(translations.fr.landing.faq.items.length);
    });
  }

  it('claims: single contact only as « vous parlez directement à Anatholy Bricon », no subcontracting promise', () => {
    const fr = JSON.stringify(translations.fr.landing);
    expect(fr).toContain('Vous parlez directement à Anatholy Bricon');
    expect(fr).not.toMatch(/sous-traitance|interlocuteur unique/i);
    expect(fr).not.toMatch(/aggregateRating|4[,.]9|avis Google/i);
  });

  it('links to every service, the two guides and the free diagnostic', () => {
    const preview = read('../components/sections/ServicesPreview.tsx');
    expect(preview).toContain('/guides/prix-site-vitrine');
    expect(preview).toContain('/guides/seo-local');
    expect(preview).toContain('href="/services"');
    expect(preview).toContain('href={`/services/${s.slug}`}');
    for (const slug of ['site-vitrine', 'seo-referencement', 'rebranding-site-premium', 'google-ads', 'agent-vocal-ia']) {
      expect(preview).toContain(`'${slug}'`);
    }
    expect(read('../components/sections/Manifeste.tsx')).toContain('href="/simulateur"');
    expect(hero).toContain('href="/simulateur"');
  });
});
