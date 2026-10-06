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

// Sous-ensemble qui exige une session (le proxy redirige vers /connexion).
export const PROTECTED_PREFIXES = ['/espace-client', '/admin'] as const;

export function isPrivatePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
