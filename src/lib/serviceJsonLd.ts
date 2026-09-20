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
 *
 * `inLanguage` (optional, e.g. `"fr-FR"`/`"en-US"`/`"th-TH"`) should be set
 * to the resolved locale of the copy passed in `faq`, so the JSON-LD
 * declares which language its Q&A pairs are actually written in (CR-01,
 * 06-REVIEW.md). Omitted when not provided to keep the payload minimal.
 */
export function buildFaqJsonLd(faq: FaqItem[], pageUrl: string, inLanguage?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    ...(inLanguage ? { inLanguage } : {}),
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
