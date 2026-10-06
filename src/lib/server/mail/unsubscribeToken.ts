import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Jeton de désinscription sans état (D-11) : base64url(adresse) + '.' + HMAC.
// Sans expiration (décision A5) : le lien d'un ancien e-mail doit rester valide.
// Aucun log ne contient d'adresse ni de jeton.

const MAX_TOKEN = 600;
const MAX_EMAIL = 254;

export function unsubscribeSecret(env: Record<string, string | undefined> = process.env): string | null {
  const v = env.UNSUBSCRIBE_SECRET;
  return typeof v === 'string' && v.length >= 32 ? v : null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mac(address: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(`unsub:v1:${address}`).digest();
}

export function signUnsubscribeToken(email: string, secret: string): string {
  const address = normalizeEmail(email);
  return `${Buffer.from(address, 'utf8').toString('base64url')}.${mac(address, secret).toString('base64url')}`;
}

export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  try {
    if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encAddr, encMac] = parts;
    if (!encAddr || !encMac) return null;
    const address = Buffer.from(encAddr, 'base64url').toString('utf8');
    if (!address.includes('@') || address.length > MAX_EMAIL) return null;
    const expected = mac(address, secret);
    const given = Buffer.from(encMac, 'base64url');
    if (given.length !== expected.length) return null;
    if (!timingSafeEqual(given, expected)) return null;
    // L'adresse signée est déjà normalisée ; on refuse toute autre forme.
    return address === normalizeEmail(address) ? address : null;
  } catch {
    return null;
  }
}

export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '***';
  return `${email.slice(0, 1)}***@${email.slice(at + 1)}`;
}
