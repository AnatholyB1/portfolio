// Pure builder for the global OfferCatalog JSON-LD node.
// Must stay free of next/*, React and Supabase imports so it is unit-testable
// under vitest's node environment. Per D-03, no price fields are emitted.
import { services } from '@/data/services';
import { translations } from '@/lib/translations';

export function buildServiceCatalogJsonLd(siteUrl: string) {
  const items = translations.fr.services.pages.items;
  return {
    '@type': 'OfferCatalog',
    '@id': `${siteUrl}/#catalog`,
    name: 'Services Sèvalys',
    itemListElement: services.map((s) => ({
      '@type': 'Service',
      '@id': `${siteUrl}/services/${s.slug}#service`,
      name: items[s.index].name,
      description: items[s.index].tagline,
      url: `${siteUrl}/services/${s.slug}`,
      provider: { '@id': `${siteUrl}/#organization` },
      areaServed: 'FR',
    })),
  };
}
