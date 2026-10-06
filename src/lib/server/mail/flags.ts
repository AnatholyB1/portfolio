// Drapeaux d'envoi (D-04) : les demandes d'avis restent coupees tant que la phase 18 n'est pas livree.
import 'server-only';

export function reviewRequestsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.REVIEW_REQUESTS_ENABLED === 'true';
}
