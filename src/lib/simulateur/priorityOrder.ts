// src/lib/simulateur/priorityOrder.ts
//
// D-07 — this is the agency's fixed lead-with order, used ONLY as a
// deterministic tiebreak inside computeRecommendedServices when two
// services have an identical summed weight, and as the padding source
// when fewer than 2 services score above zero. It expresses no display
// order anywhere else in the app.

import type { ServiceSlug } from './questions';

export const PRIORITY_ORDER: ServiceSlug[] = [
  'site-vitrine',
  'agent-vocal-ia',
  'rebranding-site-premium',
  'maintenance',
  'projet-sur-mesure',
  'branding',
  'meta-ads',
  'google-ads',
  'community-management',
];
