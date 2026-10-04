import { describe, expect, it } from 'vitest';
import {
  STRIPE_API_VERSION,
  assertStripeKey,
  getStripe,
  stripeModeForClient,
  webhookSecrets,
} from './client';

describe('assertStripeKey', () => {
  it('accepte les clés de test partout', () => {
    expect(assertStripeKey('sk_test_x', {})).toBe('test');
    expect(assertStripeKey('rk_test_x', {})).toBe('test');
  });
  it('refuse une clé live hors production', () => {
    expect(() => assertStripeKey('sk_live_x', { VERCEL_ENV: 'preview' })).toThrow(
      'clé live refusée hors production',
    );
    expect(() => assertStripeKey('sk_live_x', {})).toThrow('clé live refusée');
  });
  it('accepte une clé live en production', () => {
    expect(assertStripeKey('sk_live_x', { VERCEL_ENV: 'production' })).toBe('live');
  });
  it('refuse clé publique, inconnue ou absente', () => {
    expect(() => assertStripeKey('pk_test_x', {})).toThrow();
    expect(() => assertStripeKey('whatever', {})).toThrow();
    expect(() => assertStripeKey(undefined, {})).toThrow('variable manquante');
  });
  it("ne révèle pas la valeur de la clé", () => {
    try {
      assertStripeKey('pk_test_secretvalue', {});
    } catch (e) {
      expect(String((e as Error).message)).not.toContain('secretvalue');
    }
  });
});

describe('stripeModeForClient', () => {
  it('force test pour un client de test', () => {
    expect(stripeModeForClient(true, { VERCEL_ENV: 'production' })).toBe('test');
  });
  it('live seulement en production pour un vrai client', () => {
    expect(stripeModeForClient(false, { VERCEL_ENV: 'production' })).toBe('live');
    expect(stripeModeForClient(false, { VERCEL_ENV: 'preview' })).toBe('test');
    expect(stripeModeForClient(false, {})).toBe('test');
  });
});

describe('getStripe', () => {
  it('refuse une clé de test dans le slot live', () => {
    expect(() =>
      getStripe('live', { VERCEL_ENV: 'production', STRIPE_SECRET_KEY_LIVE: 'sk_test_x' }),
    ).toThrow('incohérent');
  });
  it('refuse une variable absente', () => {
    expect(() => getStripe('test', {})).toThrow('STRIPE_SECRET_KEY_TEST');
  });
  it('construit un client avec la version pinnée', () => {
    const s = getStripe('test', { STRIPE_SECRET_KEY_TEST: 'sk_test_abc' });
    expect(s).toBeTruthy();
    expect(STRIPE_API_VERSION).toBe('2026-09-30.endive');
  });
});

describe('webhookSecrets', () => {
  it('ne retourne que les secrets configurés', () => {
    expect(webhookSecrets({})).toEqual([]);
    expect(webhookSecrets({ STRIPE_WEBHOOK_SECRET_TEST: 'whsec_a' })).toEqual([
      { mode: 'test', secret: 'whsec_a' },
    ]);
    expect(
      webhookSecrets({ STRIPE_WEBHOOK_SECRET_TEST: 'whsec_a', STRIPE_WEBHOOK_SECRET_LIVE: 'whsec_b' }),
    ).toHaveLength(2);
  });
  it('refuse un secret mal formé', () => {
    expect(() => webhookSecrets({ STRIPE_WEBHOOK_SECRET_LIVE: 'abc' })).toThrow('STRIPE_WEBHOOK_SECRET_LIVE');
  });
});
