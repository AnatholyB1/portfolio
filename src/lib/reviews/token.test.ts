import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  deriveReviewToken,
  hashReviewToken,
  isWellFormedReviewToken,
  reviewSecret,
} from './token';

const SECRET = 'a'.repeat(32);
const OTHER = 'b'.repeat(32);

describe('reviewSecret', () => {
  it('returns null when absent, empty or too short', () => {
    expect(reviewSecret({})).toBeNull();
    expect(reviewSecret({ REVIEW_TOKEN_SECRET: '' })).toBeNull();
    expect(reviewSecret({ REVIEW_TOKEN_SECRET: 'x'.repeat(31) })).toBeNull();
  });
  it('returns the value for 32+ chars', () => {
    expect(reviewSecret({ REVIEW_TOKEN_SECRET: 'x'.repeat(32) })).toBe('x'.repeat(32));
  });
});

describe('deriveReviewToken', () => {
  it('is deterministic and 43 base64url chars', () => {
    const a = deriveReviewToken('link-1', SECRET);
    expect(a).toBe(deriveReviewToken('link-1', SECRET));
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  it('differs for another id', () => {
    expect(deriveReviewToken('link-1', SECRET)).not.toBe(deriveReviewToken('link-2', SECRET));
  });
  it('differs for another secret', () => {
    expect(deriveReviewToken('link-1', SECRET)).not.toBe(deriveReviewToken('link-1', OTHER));
  });
});

describe('hashReviewToken', () => {
  it('is sha256 hex of the token', () => {
    const t = deriveReviewToken('link-1', SECRET);
    const h = hashReviewToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(createHash('sha256').update(t).digest('hex'));
  });
});

describe('isWellFormedReviewToken', () => {
  it('accepts a derived token', () => {
    expect(isWellFormedReviewToken(deriveReviewToken('link-1', SECRET))).toBe(true);
  });
  it('rejects empty, too long, bad characters and non-strings', () => {
    expect(isWellFormedReviewToken('')).toBe(false);
    expect(isWellFormedReviewToken('a'.repeat(65))).toBe(false);
    expect(isWellFormedReviewToken('abc<def')).toBe(false);
    expect(isWellFormedReviewToken('a b')).toBe(false);
    expect(isWellFormedReviewToken(undefined)).toBe(false);
    expect(isWellFormedReviewToken(42)).toBe(false);
    expect(isWellFormedReviewToken(null)).toBe(false);
  });
});
