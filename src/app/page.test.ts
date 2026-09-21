import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { services } from '@/data/services';

// ServicesPreview.tsx, FonctionnementSection.tsx and EnjeuxSection.tsx are
// created by plan 04 and do not exist yet — read as an empty string so
// collection never crashes; their assertions fail as normal assertions
// instead of throwing on a missing file.
const readIfExists = (relative: string): string => {
  try {
    return readFileSync(new URL(relative, import.meta.url), 'utf8');
  } catch {
    return '';
  }
};

const pageSource = readIfExists('./page.tsx');

const SECTION_MARKERS = [
  '<HeroSection',
  '<Manifeste',
  '<ProblemSection',
  '<ServicesPreview',
  '<FonctionnementSection',
  '<EnjeuxSection',
  '<Realisations',
  '<PhoneAgent',
  '<Partners',
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
const ALLOWED_HREFS = ['/simulateur', '#contact', '/services/agent-vocal-ia'];
const ALLOWED_HREF_PREFIXES = ['tel:', 'mailto:'];
const SLUG_TEMPLATE_HREF = '`/services/${s.slug}`';

const DEAD_DESTINATIONS = [
  '/services#phone-agent',
  'href="/demo"',
  'href="/calculateur-roi"',
  'href="/services"',
];

// Deliberately excluded from the CTA scan: src/components/layout/Navbar.tsx
// and Footer.tsx. 08-UI-SPEC.md's CTA Destination Table rows 12/14 classify
// these persistent-chrome links as non-CTA navigation (present on every
// page, not part of the landing's content flow) — do not "helpfully" add
// Navbar/Footer to this scan.
const CTA_COMPONENT_FILES = [
  'HeroSection.tsx',
  'ProblemSection.tsx',
  'ServicesPreview.tsx',
  'FonctionnementSection.tsx',
  'EnjeuxSection.tsx',
  'Realisations.tsx',
  'PhoneAgent.tsx',
  'Partners.tsx',
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
    expect(source).toContain('work-item');
  });
});

describe('ServicesPreview cards (LANDING-01)', () => {
  const servicesPreviewSource = readIfExists('../components/sections/ServicesPreview.tsx');

  it('imports services from @/data/services', () => {
    expect(servicesPreviewSource).toMatch(
      /import\s*\{\s*services\s*\}\s*from\s*['"]@\/data\/services['"]/
    );
  });

  it('is data-driven via a services.map( call', () => {
    expect(servicesPreviewSource).toContain('services.map(');
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
