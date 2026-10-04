import 'server-only';
import Stripe from 'stripe';

// Client Stripe gardé par le mode de clé (D-01, T-15-02). Les messages d'erreur
// nomment la variable fautive, jamais sa valeur.

type Env = Record<string, string | undefined>;

export const STRIPE_API_VERSION = '2026-09-30.endive' as const;

export type StripeMode = 'test' | 'live';

function isProduction(env: Env): boolean {
  return env.VERCEL_ENV === 'production';
}

/** Déduit le mode d'une clé secrète ; refuse live hors production et tout format inconnu. */
export function assertStripeKey(key: string | undefined, env: Env = process.env): StripeMode {
  if (!key) throw new Error('[stripe/env] variable manquante : clé secrète Stripe');
  if (/^(sk|rk)_test_/.test(key)) return 'test';
  if (/^(sk|rk)_live_/.test(key)) {
    if (!isProduction(env)) {
      throw new Error('[stripe/env] clé live refusée hors production (VERCEL_ENV)');
    }
    return 'live';
  }
  throw new Error('[stripe/env] format de clé secrète Stripe inconnu ou clé publique refusée');
}

/** Mode du client : un client de test est toujours en test ; live seulement en production. */
export function stripeModeForClient(isTest: boolean, env: Env = process.env): StripeMode {
  if (isTest) return 'test';
  return isProduction(env) ? 'live' : 'test';
}

const cache = new Map<StripeMode, Stripe>();

export function getStripe(mode: StripeMode, env: Env = process.env): Stripe {
  const name = mode === 'live' ? 'STRIPE_SECRET_KEY_LIVE' : 'STRIPE_SECRET_KEY_TEST';
  const key = env[name];
  if (!key) throw new Error(`[stripe/env] variable manquante : ${name}`);
  const actual = assertStripeKey(key, env);
  if (actual !== mode) {
    throw new Error(`[stripe/env] mode de clé incohérent pour ${name}`);
  }
  const hit = cache.get(mode);
  if (hit && env === process.env) return hit;
  const client = new Stripe(key, { apiVersion: STRIPE_API_VERSION, maxNetworkRetries: 2 });
  if (env === process.env) cache.set(mode, client);
  return client;
}

export function webhookSecrets(env: Env = process.env): { mode: StripeMode; secret: string }[] {
  const out: { mode: StripeMode; secret: string }[] = [];
  const entries: [StripeMode, string][] = [
    ['test', 'STRIPE_WEBHOOK_SECRET_TEST'],
    ['live', 'STRIPE_WEBHOOK_SECRET_LIVE'],
  ];
  for (const [mode, name] of entries) {
    const secret = env[name];
    if (!secret) continue;
    if (!secret.startsWith('whsec_')) {
      throw new Error(`[stripe/env] format de secret de webhook invalide : ${name}`);
    }
    out.push({ mode, secret });
  }
  return out;
}
