import { describe, expect, it } from 'vitest';
import { generateToken, hashToken, isUsable } from './token';

describe('mcp token', () => {
  it('generates a prefixed high-entropy token and a stable sha256 hash', () => {
    const t = generateToken();
    expect(t).toMatch(/^svmcp_[A-Za-z0-9_-]{43}$/);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(generateToken()).not.toBe(t);
  });
  it('refuses revoked and expired tokens', () => {
    const now = new Date('2026-10-15T10:00:00Z');
    const ok = { revoked_at: null, expires_at: '2026-11-01T00:00:00Z' };
    expect(isUsable(ok, now)).toBe(true);
    expect(isUsable({ ...ok, revoked_at: '2026-10-01T00:00:00Z' }, now)).toBe(false);
    expect(isUsable({ ...ok, expires_at: '2026-10-15T09:59:59Z' }, now)).toBe(false);
  });
});
