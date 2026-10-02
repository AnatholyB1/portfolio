// Offres commerciales Sèvalys : module sûr côté client.
// L'ordre suit src/data/services.ts ; les libellés suivent les titres FR de translations.ts.
export const OFFER_SLUGS = [
  'site-vitrine',
  'rebranding-site-premium',
  'branding',
  'projet-sur-mesure',
  'agent-vocal-ia',
  'maintenance',
  'community-management',
  'meta-ads',
  'google-ads',
] as const;

export type OfferSlug = (typeof OFFER_SLUGS)[number];

export const OFFER_LABELS: Record<OfferSlug, string> = {
  'site-vitrine': 'Site Vitrine',
  'rebranding-site-premium': 'Rebranding + Site Premium',
  branding: 'Branding',
  'projet-sur-mesure': 'Projet Sur Mesure',
  'agent-vocal-ia': 'Agent Vocal IA',
  maintenance: 'Maintenance',
  'community-management': 'Community Management',
  'meta-ads': 'Meta Ads',
  'google-ads': 'Google Ads',
};
