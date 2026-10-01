// Redirection post-connexion sûre (anti open-redirect). Module pur, sûr côté client.

export type Destination = '/admin' | '/espace-client';

export function safeNext(next: string | null | undefined, destination: Destination): string {
  if (!next) return destination;
  if (next.includes('//') || next.includes('\\')) return destination;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(next)) return destination;
  if (!next.startsWith(destination)) return destination;
  const rest = next.slice(destination.length);
  if (rest === '' || rest[0] === '/' || rest[0] === '?' || rest[0] === '#') return next;
  return destination;
}
