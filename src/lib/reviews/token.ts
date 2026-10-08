import 'server-only';
import { createHash, createHmac } from 'node:crypto';

// Jeton d'avis dérivé (D-09) : HMAC-SHA256(secret, 'review:v1:' + linkId), base64url, 256 bits.
// Déterministe : les relances J+7 et J+21 portent le même lien ; la base ne stocke que sha256(token).
// Aucun log ne contient de jeton ni de secret.

const MAX_TOKEN = 64;
const TOKEN_RE = /^[A-Za-z0-9_-]+$/;

export function reviewSecret(env: Record<string, string | undefined> = process.env): string | null {
  const v = env.REVIEW_TOKEN_SECRET;
  return typeof v === 'string' && v.length >= 32 ? v : null;
}

export function deriveReviewToken(linkId: string, secret: string): string {
  return createHmac('sha256', secret).update(`review:v1:${linkId}`).digest().toString('base64url');
}

export function hashReviewToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isWellFormedReviewToken(token: unknown): token is string {
  return typeof token === 'string' && token.length > 0 && token.length <= MAX_TOKEN && TOKEN_RE.test(token);
}
