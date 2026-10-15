// Zones privées dont le layout rend son propre lien d'évitement (cible #contenu / #admin-contenu).
export const OWN_SKIP_LINK_PREFIXES = ['/admin', '/espace-client', '/connexion', '/auth'] as const;

export function hasOwnSkipLink(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return OWN_SKIP_LINK_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
