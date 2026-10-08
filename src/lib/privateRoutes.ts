// Source unique des préfixes de routes privées (D-15). Consommée par
// ClientProviders, PostHogProvider, robots.ts, next.config (headers) et le
// test du matcher du proxy. Module pur, sûr côté client : aucun import.

export const PRIVATE_PREFIXES = [
  '/espace-client',
  '/admin',
  '/connexion',
  '/auth',
  '/desinscription',
] as const;

// Sous-chemins stricts privés (jeton d'avis à usage unique, 18-04). '/avis' et
// '/politique-des-avis' restent publics et indexables : seul '/avis/<jeton>' est privé.
export const PRIVATE_SUBPATH_PREFIXES = ['/avis/'] as const;

// Sous-ensemble qui exige une session (le proxy redirige vers /connexion).
export const PROTECTED_PREFIXES = ['/espace-client', '/admin'] as const;

export function isPrivatePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return PRIVATE_SUBPATH_PREFIXES.some((p) => pathname.startsWith(p) && pathname.length > p.length);
}
