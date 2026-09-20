// src/data/services.ts
// Locale-agnostic data spine for the 9 /services/[slug] pages (Phase 6).
//
// `index` is the join key into t.services.pages.items[index] (fr/en/th,
// src/lib/translations.ts). `caseStudyProjectIndex` is the join key into
// src/data/projects.ts, or null for a trust-signals-only page (D-05/D-06).
//
// Array order IS the /services index display order (flat numbered list,
// D-09 — no `category` field).
//
// Slug rationale: the 4 new slugs (`community-management`, `branding`,
// `meta-ads`, `google-ads`) are fixed by docs/strategie-seo-geo-llm-2026-09.md
// §9. Per D-04, exactly one existing offer is realigned to the SEO doc's
// keyword cluster: "Landing Page" becomes `site-vitrine` / "Site Vitrine"
// (§3b cluster "Site vitrine/landing page"); the other four keep their
// existing names because no better-matching cluster term exists
// (`agent-vocal-ia` already matches §3b exactly). No blanket rename.

export interface Service {
  /** Route param for /services/[slug]. Fixed — see the locked table above. */
  slug: string;
  /** Join key into t.services.pages.items[index] (all 3 locales). */
  index: number;
  /** Join key into src/data/projects.ts, or null for trust-signals-only (D-05/D-06). */
  caseStudyProjectIndex: number | null;
}

export const services: Service[] = [
  {
    slug: 'site-vitrine',
    index: 0,
    caseStudyProjectIndex: 1, // Gecko Cabane
  },
  {
    slug: 'rebranding-site-premium',
    index: 1,
    caseStudyProjectIndex: null,
  },
  {
    slug: 'branding',
    index: 2,
    caseStudyProjectIndex: null,
  },
  {
    slug: 'projet-sur-mesure',
    index: 3,
    caseStudyProjectIndex: 2, // Les Folies Temps Danse
  },
  {
    slug: 'agent-vocal-ia',
    index: 4,
    caseStudyProjectIndex: 0, // Feuillette
  },
  {
    slug: 'maintenance',
    index: 5,
    caseStudyProjectIndex: null,
  },
  {
    slug: 'community-management',
    index: 6,
    caseStudyProjectIndex: null,
  },
  {
    slug: 'meta-ads',
    index: 7,
    caseStudyProjectIndex: null,
  },
  {
    slug: 'google-ads',
    index: 8,
    caseStudyProjectIndex: null,
  },
];

// Don't Hand-Roll (RESEARCH.md): colocate the single lookup helper both the
// server layout and the client page will import.
export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}
