import 'server-only';
import { isIP } from 'node:net';
import { getClientIp } from '@/lib/leads/ipHash';

/** IP du client depuis x-forwarded-for (premier élément), validée. Jamais depuis le formulaire. */
export function requestIp(headers: Headers): string | null {
  const ip = getClientIp(headers);
  if (!ip || ip.length > 45) return null;
  return isIP(ip) === 0 ? null : ip;
}
