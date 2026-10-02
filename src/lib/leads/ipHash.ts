import 'server-only';
import { createHmac } from 'node:crypto';

// D-04 : le format de colonne reste l'hexadécimal comme l'ip_hash existant ; la
// dérivation passe de sha256 simple à HMAC-SHA256 (clé SV_IP_HASH_SECRET) pour les
// nouvelles lignes, un sha256 d'IPv4 étant réversible par énumération.

let warned = false;

export function getClientIp(headers: Headers): string | null {
  const xff = headers.get('x-forwarded-for');
  if (!xff) return null;
  const first = xff.split(',')[0]?.trim();
  return first || null;
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const secret = process.env.SV_IP_HASH_SECRET;
  if (!secret) {
    if (!warned) {
      warned = true;
      console.error('[leads/ipHash] secret missing');
    }
    return null;
  }
  return createHmac('sha256', secret).update(ip).digest('hex');
}
