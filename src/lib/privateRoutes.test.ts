import { describe, expect, it } from 'vitest';
import { PRIVATE_PREFIXES, PROTECTED_PREFIXES, isPrivatePath } from './privateRoutes';

describe('privateRoutes', () => {
  it('PRIVATE_PREFIXES est la source unique attendue', () => {
    expect([...PRIVATE_PREFIXES]).toEqual([
      '/espace-client',
      '/admin',
      '/connexion',
      '/auth',
      '/desinscription',
    ]);
  });

  it('/desinscription est privée mais non protégée', () => {
    expect(isPrivatePath('/desinscription')).toBe(true);
    expect((PROTECTED_PREFIXES as readonly string[]).includes('/desinscription')).toBe(false);
  });

  it('PROTECTED_PREFIXES est un sous-ensemble de PRIVATE_PREFIXES', () => {
    for (const p of PROTECTED_PREFIXES) {
      expect((PRIVATE_PREFIXES as readonly string[]).includes(p)).toBe(true);
    }
  });

  it.each([
    ['/admin', true],
    ['/admin/x', true],
    ['/administration', false],
    ['/espace-client', true],
    ['/connexion', true],
    ['/auth/confirm', true],
    ['/', false],
    ['/services', false],
    [null, false],
    [undefined, false],
  ])('isPrivatePath(%s) -> %s', (path, expected) => {
    expect(isPrivatePath(path as string | null | undefined)).toBe(expected);
  });
});
