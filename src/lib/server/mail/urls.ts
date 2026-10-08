import 'server-only';
import { getSiteUrl } from '@/lib/supabase/env';

/** Lien de connexion avec l'e-mail prérempli. */
export function buildLoginUrl(email: string): string {
  return `${getSiteUrl()}/connexion?email=${encodeURIComponent(email)}`;
}

export function buildPortalUrl(): string {
  return `${getSiteUrl()}/espace-client`;
}

export function buildPortalDocumentsUrl(): string {
  return `${getSiteUrl()}/espace-client/documents`;
}

export function buildPortalPaymentsUrl(): string {
  return `${getSiteUrl()}/espace-client/paiements`;
}

export function buildAdminProjectUrl(projectId: string): string {
  return `${getSiteUrl()}/admin/projets/${projectId}`;
}

/** Page publique de confirmation de désinscription (le jeton est signé, jamais l'adresse en clair). */
export function buildUnsubscribePageUrl(token: string): string {
  return `${getSiteUrl()}/desinscription?t=${encodeURIComponent(token)}`;
}

/** Cible RFC 8058 (POST one-click) pour l'en-tête List-Unsubscribe. */
export function buildUnsubscribeOneClickUrl(token: string): string {
  return `${getSiteUrl()}/api/unsubscribe?t=${encodeURIComponent(token)}`;
}

export function buildAdminMailUrl(): string {
  return `${getSiteUrl()}/admin/emails`;
}

/** Lien public de dépôt d'avis (le jeton est dérivé au rendu, jamais stocké en clair). */
export function buildReviewUrl(token: string): string {
  return `${getSiteUrl()}/avis/${encodeURIComponent(token)}`;
}

export function buildAdminReviewsUrl(): string {
  return `${getSiteUrl()}/admin/avis`;
}
