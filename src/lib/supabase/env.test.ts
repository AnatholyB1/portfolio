import { describe, expect, it } from 'vitest';
import {
  assertSupabaseKeyMode,
  getOtpExpiryMinutes,
  getSiteUrl,
  isLoginEnabled,
} from './env';

function jwt(role: string): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ role })}.signature`;
}

const URL_ = 'https://example.supabase.co';

function env(vars: Record<string, string | undefined>): Record<string, string | undefined> {
  return { NEXT_PUBLIC_SUPABASE_URL: URL_, ...vars };
}

describe('assertSupabaseKeyMode', () => {
  it('retourne modern pour publishable + secret', () => {
    expect(
      assertSupabaseKeyMode(
        env({
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
          SUPABASE_SECRET_KEY: 'sb_secret_abc',
        }),
      ),
    ).toBe('modern');
  });

  it('retourne legacy pour anon JWT + service_role JWT', () => {
    expect(
      assertSupabaseKeyMode(
        env({
          NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('anon'),
          SUPABASE_SERVICE_ROLE_KEY: jwt('service_role'),
        }),
      ),
    ).toBe('legacy');
  });

  it('refuse publishable + secret JWT (modes mixtes)', () => {
    expect(() =>
      assertSupabaseKeyMode(
        env({
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
          SUPABASE_SERVICE_ROLE_KEY: jwt('service_role'),
        }),
      ),
    ).toThrow(/mixtes/);
  });

  it('refuse JWT public + sb_secret_ (modes mixtes)', () => {
    expect(() =>
      assertSupabaseKeyMode(
        env({
          NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('anon'),
          SUPABASE_SECRET_KEY: 'sb_secret_abc',
        }),
      ),
    ).toThrow(/mixtes/);
  });

  it('refuse une cle sb_secret_ dans le slot public', () => {
    expect(() =>
      assertSupabaseKeyMode(
        env({
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc',
          SUPABASE_SECRET_KEY: 'sb_secret_abc',
        }),
      ),
    ).toThrow(/slot public/);
  });

  it('refuse un JWT service_role dans le slot public', () => {
    expect(() =>
      assertSupabaseKeyMode(
        env({
          NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt('service_role'),
          SUPABASE_SERVICE_ROLE_KEY: jwt('service_role'),
        }),
      ),
    ).toThrow(/slot public/);
  });

  it('nomme la variable manquante (URL) sans fuiter de valeur', () => {
    expect(() =>
      assertSupabaseKeyMode({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
        SUPABASE_SECRET_KEY: 'sb_secret_abc',
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('nomme la variable manquante (cle secrete) sans fuiter la cle publique', () => {
    let message = '';
    try {
      assertSupabaseKeyMode(
        env({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_SECRETVALUE' }),
      );
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/SUPABASE_SECRET_KEY/);
    expect(message).not.toContain('SECRETVALUE');
  });
});

describe('isLoginEnabled', () => {
  it('true uniquement pour la chaine exacte "true"', () => {
    expect(isLoginEnabled({ SV_LOGIN_ENABLED: 'true' })).toBe(true);
    expect(isLoginEnabled({ SV_LOGIN_ENABLED: 'TRUE' })).toBe(false);
    expect(isLoginEnabled({ SV_LOGIN_ENABLED: '1' })).toBe(false);
    expect(isLoginEnabled({})).toBe(false);
  });
});

describe('getOtpExpiryMinutes', () => {
  it('parse un entier positif, sinon null', () => {
    const e = (v?: string) => ({ SV_OTP_EXPIRY_MINUTES: v });
    expect(getOtpExpiryMinutes(e('60'))).toBe(60);
    expect(getOtpExpiryMinutes(e(''))).toBeNull();
    expect(getOtpExpiryMinutes(e('abc'))).toBeNull();
    expect(getOtpExpiryMinutes(e('0'))).toBeNull();
    expect(getOtpExpiryMinutes(e(undefined))).toBeNull();
  });
});

describe('getSiteUrl', () => {
  it('retire le slash final et a un defaut', () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: 'https://x.test/' })).toBe(
      'https://x.test',
    );
    expect(getSiteUrl({})).toBe('https://sevalys.com');
  });
});
