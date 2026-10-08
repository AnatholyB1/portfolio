import { describe, it, expect } from 'vitest';
import { parseGoogleReviewUrl, reviewGoogleUrl } from './googleUrl';

describe('parseGoogleReviewUrl', () => {
  it('accepts a well-formed https URL', () => {
    expect(parseGoogleReviewUrl('https://g.page/r/abc/review')).toBe(
      'https://g.page/r/abc/review',
    );
  });
  it('rejects http', () => {
    expect(parseGoogleReviewUrl('http://g.page/x')).toBeNull();
  });
  it('rejects javascript: scheme', () => {
    expect(parseGoogleReviewUrl('javascript:alert(1)')).toBeNull();
  });
  it('rejects empty and non-string values', () => {
    expect(parseGoogleReviewUrl('')).toBeNull();
    expect(parseGoogleReviewUrl(undefined)).toBeNull();
    expect(parseGoogleReviewUrl(42)).toBeNull();
  });
  it('rejects credentials', () => {
    expect(parseGoogleReviewUrl('https://user:pw@g.page/x')).toBeNull();
  });
  it('rejects over-length URLs', () => {
    const long = 'https://g.page/' + 'a'.repeat(2049 - 'https://g.page/'.length);
    expect(long).toHaveLength(2049);
    expect(parseGoogleReviewUrl(long)).toBeNull();
  });
});

describe('reviewGoogleUrl', () => {
  it('reads REVIEW_GOOGLE_URL', () => {
    expect(
      reviewGoogleUrl({ REVIEW_GOOGLE_URL: 'https://g.page/r/abc/review' } as unknown as NodeJS.ProcessEnv),
    ).toBe('https://g.page/r/abc/review');
  });
  it('returns null when unset', () => {
    expect(reviewGoogleUrl({} as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
});
