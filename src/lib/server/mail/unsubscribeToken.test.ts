import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  maskEmail,
  normalizeEmail,
  signUnsubscribeToken,
  unsubscribeSecret,
  verifyUnsubscribeToken,
} from './unsubscribeToken';

const SECRET = 'a'.repeat(32);
const OTHER = 'b'.repeat(32);

afterEach(() => vi.restoreAllMocks());

describe('unsubscribeSecret', () => {
  it('returns null when absent, empty or too short', () => {
    expect(unsubscribeSecret({})).toBeNull();
    expect(unsubscribeSecret({ UNSUBSCRIBE_SECRET: '' })).toBeNull();
    expect(unsubscribeSecret({ UNSUBSCRIBE_SECRET: 'x'.repeat(31) })).toBeNull();
  });
  it('returns the value for 32+ chars', () => {
    expect(unsubscribeSecret({ UNSUBSCRIBE_SECRET: SECRET })).toBe(SECRET);
  });
});

describe('sign / verify', () => {
  it('round-trips to the normalised address', () => {
    const t = signUnsubscribeToken('user@example.com', SECRET);
    expect(verifyUnsubscribeToken(t, SECRET)).toBe('user@example.com');
  });
  it('normalises before signing', () => {
    expect(signUnsubscribeToken(' User@Example.COM ', SECRET)).toBe(
      signUnsubscribeToken('user@example.com', SECRET),
    );
    expect(normalizeEmail(' User@Example.COM ')).toBe('user@example.com');
  });
  it('rejects a tampered token in either part', () => {
    const t = signUnsubscribeToken('user@example.com', SECRET);
    const [a, b] = t.split('.');
    const flip = (s: string) => (s[0] === 'A' ? 'B' : 'A') + s.slice(1);
    expect(verifyUnsubscribeToken(`${flip(a)}.${b}`, SECRET)).toBeNull();
    expect(verifyUnsubscribeToken(`${a}.${flip(b)}`, SECRET)).toBeNull();
  });
  it('rejects a token signed with another secret', () => {
    const t = signUnsubscribeToken('user@example.com', OTHER);
    expect(verifyUnsubscribeToken(t, SECRET)).toBeNull();
  });
  it('rejects malformed input without throwing', () => {
    for (const bad of ['', 'abc', 'a.b.c', 'x'.repeat(601), '!!!.???', '.']) {
      expect(verifyUnsubscribeToken(bad, SECRET)).toBeNull();
    }
  });
  it('rejects a decoded address without @', () => {
    const local = Buffer.from('noat').toString('base64url');
    expect(verifyUnsubscribeToken(`${local}.AAAA`, SECRET)).toBeNull();
  });
  it('does not log the address or token', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const t = signUnsubscribeToken('user@example.com', SECRET);
    verifyUnsubscribeToken(`${t}x`, SECRET);
    verifyUnsubscribeToken(t, OTHER);
    for (const call of spy.mock.calls) {
      const s = JSON.stringify(call);
      expect(s).not.toContain('user@example.com');
      expect(s).not.toContain(t);
    }
  });
});

describe('maskEmail', () => {
  it('masks the local part', () => {
    expect(maskEmail('jeanne.dupont@exemple.fr')).toBe('j***@exemple.fr');
  });
});
