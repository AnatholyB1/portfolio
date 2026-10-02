import 'server-only';

// Le noyau vit dans src/lib/throttle.ts (importable par le code public).
// Ce fichier est conservé pour les imports et vi.mock existants (admin, connexion).
export { hashKey, hitThrottle } from '@/lib/throttle';
export type { ThrottleKind } from '@/lib/throttle';
