import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { reviewConfigReady, reviewRequestsEnabled } from './flags';

describe('reviewRequestsEnabled', () => {
  it('is true only for the exact string true', () => {
    expect(reviewRequestsEnabled({})).toBe(false);
    expect(reviewRequestsEnabled({ REVIEW_REQUESTS_ENABLED: 'TRUE' })).toBe(false);
    expect(reviewRequestsEnabled({ REVIEW_REQUESTS_ENABLED: '1' })).toBe(false);
    expect(reviewRequestsEnabled({ REVIEW_REQUESTS_ENABLED: 'true' })).toBe(true);
  });
});

describe('reviewConfigReady', () => {
  const secret = 's'.repeat(32);
  const url = 'https://g.page/r/abc/review';
  it('needs a 32+ char secret and an https Google URL', () => {
    expect(reviewConfigReady({})).toBe(false);
    expect(reviewConfigReady({ REVIEW_TOKEN_SECRET: 'short', REVIEW_GOOGLE_URL: url })).toBe(false);
    expect(reviewConfigReady({ REVIEW_TOKEN_SECRET: secret })).toBe(false);
    expect(reviewConfigReady({ REVIEW_TOKEN_SECRET: secret, REVIEW_GOOGLE_URL: 'http://g.page/x' })).toBe(false);
    expect(reviewConfigReady({ REVIEW_TOKEN_SECRET: secret, REVIEW_GOOGLE_URL: url })).toBe(true);
  });
});
