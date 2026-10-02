// Construction sûre d'un en-tête From : nom d'affichage entre guillemets (UTF-8 accepté),
// adresse nue. Refuse tout caractère de contrôle ou guillemet qui permettrait une injection
// d'en-tête ou une rupture de la chaîne citée.

export function buildFromHeader(displayName: string, address: string): string {
  if (/[\u0000-\u001f\u007f"\\<>]/.test(displayName)) {
    throw new Error('Invalid display name for From header');
  }
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(address)) {
    throw new Error('Invalid address for From header');
  }
  return `"${displayName}" <${address}>`;
}
