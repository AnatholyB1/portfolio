// Constructeurs JSON-LD des guides (/guides/[slug]). Aucun import next/* ni React :
// utilisables depuis un Server Component comme depuis un test.
import type { Guide } from "@/data/guides";
import { guideWordCount } from "@/data/guides";
import { buildFaqJsonLd } from "@/lib/serviceJsonLd";

export const GUIDES_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com";

export function guideUrl(slug: string): string {
  return `${GUIDES_SITE_URL}/guides/${slug}`;
}

export function buildArticleJsonLd(g: Guide) {
  const url = guideUrl(g.slug);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: g.h1,
    description: g.metaDescription,
    inLanguage: "fr-FR",
    datePublished: g.datePublished,
    dateModified: g.dateModified,
    wordCount: guideWordCount(g),
    image: [`${GUIDES_SITE_URL}/og-image.png`],
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: {
      "@type": "Person",
      name: g.authorName,
      jobTitle: "Entrepreneur individuel, fondateur de Sèvalys",
      url: `${GUIDES_SITE_URL}/`,
    },
    publisher: { "@id": `${GUIDES_SITE_URL}/#organization` },
  };
}

export function buildGuideFaqJsonLd(g: Guide) {
  return buildFaqJsonLd(g.faq, guideUrl(g.slug));
}

export function buildBreadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${GUIDES_SITE_URL}${it.path}`,
    })),
  };
}

export function buildGuideBreadcrumbJsonLd(g: Guide) {
  return buildBreadcrumbJsonLd([
    { name: "Accueil", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: g.crumb, path: `/guides/${g.slug}` },
  ]);
}
