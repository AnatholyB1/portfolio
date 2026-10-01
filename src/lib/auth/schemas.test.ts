import { describe, expect, it } from 'vitest';
import { LOGIN_COPY, loginEmailSchema, otpCodeSchema } from './schemas';

describe('loginEmailSchema', () => {
  it('trims and lowercases', () => {
    const r = loginEmailSchema.safeParse({ email: ' Jean@Example.COM ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe('jean@example.com');
  });

  it('rejects invalid, empty and overlong addresses', () => {
    expect(loginEmailSchema.safeParse({ email: 'abc' }).success).toBe(false);
    expect(loginEmailSchema.safeParse({ email: '' }).success).toBe(false);
    const long = `${'a'.repeat(250)}@b.co`;
    expect(long.length).toBeGreaterThan(254);
    expect(loginEmailSchema.safeParse({ email: long }).success).toBe(false);
  });
});

describe('otpCodeSchema', () => {
  it('accepts 6 digits, with surrounding spaces', () => {
    expect(otpCodeSchema.safeParse({ email: 'a@b.co', code: '123456' }).success).toBe(true);
    const r = otpCodeSchema.safeParse({ email: 'a@b.co', code: ' 123456 ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.code).toBe('123456');
  });

  it('rejects wrong length or non-digits', () => {
    for (const code of ['12345', '1234567', '12a456']) {
      expect(otpCodeSchema.safeParse({ email: 'a@b.co', code }).success).toBe(false);
    }
  });
});

describe('LOGIN_COPY', () => {
  it('matches the UI-SPEC strings', () => {
    expect(LOGIN_COPY.identical).toBe("Si cette adresse est invitée, un code vient d'être envoyé.");
    expect(LOGIN_COPY.invalidEmail).toBe("Cette adresse e-mail n'est pas valide. Vérifiez-la et réessayez.");
    expect(LOGIN_COPY.wrongCode).toBe(
      'Ce code est incorrect ou a expiré. Vérifiez-le ou demandez un nouveau code.',
    );
    expect(LOGIN_COPY.rateLimited).toBe('Trop de tentatives. Patientez quelques minutes avant de réessayer.');
    expect(LOGIN_COPY.generic).toBe(
      'Une erreur est survenue. Réessayez dans un instant ou écrivez à contact@sevalys.com.',
    );
    expect(LOGIN_COPY.sessionExpired).toBe('Votre session a expiré. Reconnectez-vous pour continuer.');
  });
});
