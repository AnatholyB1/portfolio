// Shared JSON-LD builders for the 9 /services/[slug] pages (Phase 6).
// Must stay free of next/*, React, and Supabase imports so both the Server
// Component layout and any future client caller can import it safely
// (same constraint documented at the top of src/lib/prospects-schema.ts).

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * Builds a schema.org FAQPage object for a single service page (SVC-05).
 */
export function buildFaqJsonLd(faq: FaqItem[], pageUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/**
 * Serializes arbitrary JSON-LD data for a `dangerouslySetInnerHTML`
 * `<script type="application/ld+json">` tag. This is the ONLY place in the
 * phase where JSON-LD is serialized this way (mitigates T-6-01; the
 * existing src/app/layout.tsx `JSON.stringify(jsonLd)` gap must not be
 * propagated). The `<` escape prevents a `</script>` payload from breaking
 * out of the tag (XSS via unescaped `<` in `dangerouslySetInnerHTML`, per
 * the official Next.js JSON-LD guide).
 */
export function buildJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export interface ServiceJsonLdInput {
  name: string;
  description: string;
  /** Communes d'intervention ; absent => areaServed pays FR. */
  areas?: string[];
  /** Présent uniquement si la page affiche un bloc tarifs. */
  pricing?: { price: number; fromLabel?: string } | null;
}

/**
 * Builds the page-level schema.org Service node. `offers` is emitted ONLY when
 * the page shows a visible `pricing` block (price shown = price declared).
 * Shares the `#service` @id with the global OfferCatalog entry so both nodes
 * describe the same entity.
 */
export function buildServiceJsonLd(
  input: ServiceJsonLdInput,
  slug: string,
  siteUrl: string
) {
  const url = `${siteUrl}/services/${slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name: input.name,
    description: input.description,
    url,
    provider: { '@id': `${siteUrl}/#organization` },
    areaServed:
      input.areas && input.areas.length > 0
        ? input.areas.map((name) => ({ '@type': 'City', name }))
        : { '@type': 'Country', name: 'FR' },
    ...(input.pricing
      ? {
          offers: {
            '@type': 'Offer',
            price: String(input.pricing.price),
            priceCurrency: 'EUR',
            url,
          },
        }
      : {}),
  };
}

/** BreadcrumbList Accueil > Services > page. */
export function buildBreadcrumbJsonLd(
  items: { name: string; path: string }[],
  siteUrl: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${siteUrl}${it.path}`,
    })),
  };
}
