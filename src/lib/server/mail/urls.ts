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

export function buildAdminProjectUrl(projectId: string): string {
  return `${getSiteUrl()}/admin/projets/${projectId}`;
}
