import { describe, expect, it } from 'vitest';
import { reviewRequestsEnabled } from './flags';

describe('reviewRequestsEnabled', () => {
  it('is true only for the exact string true', () => {
    expect(reviewRequestsEnabled({})).toBe(false);
    expect(reviewRequestsEnabled({ REVIEW_REQUESTS_ENABLED: 'TRUE' })).toBe(false);
    expect(reviewRequestsEnabled({ REVIEW_REQUESTS_ENABLED: '1' })).toBe(false);
    expect(reviewRequestsEnabled({ REVIEW_REQUESTS_ENABLED: 'true' })).toBe(true);
  });
});
