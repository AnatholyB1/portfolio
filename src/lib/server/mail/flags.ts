// Drapeaux d'envoi (D-04). Phase 18 livree : REVIEW_REQUESTS_ENABLED est l'interrupteur
// d'arret, active a la fin de la phase (18-17). Configuration invalide = aucune demande (D-10).
import 'server-only';
import { reviewGoogleUrl } from '@/lib/reviews/googleUrl';
import { reviewSecret } from '@/lib/reviews/token';

export function reviewRequestsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.REVIEW_REQUESTS_ENABLED === 'true';
}

/** Secret de jeton valide ET URL Google https valide ; sinon on n'envoie rien (fail closed). */
export function reviewConfigReady(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return reviewSecret(env) !== null && reviewGoogleUrl(env) !== null;
}
