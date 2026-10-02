import { createHash, createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getClientIp, hashIp } from './ipHash';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('hashIp', () => {
  it('is HMAC-SHA256 hex keyed by the secret', () => {
    vi.stubEnv('SV_IP_HASH_SECRET', 's');
    const h = hashIp('1.2.3.4');
    expect(h).toBe(createHmac('sha256', 's').update('1.2.3.4').digest('hex'));
    expect(h).not.toBe(createHash('sha256').update('1.2.3.4').digest('hex'));
  });
  it('returns null for null ip', () => {
    vi.stubEnv('SV_IP_HASH_SECRET', 's');
    expect(hashIp(null)).toBeNull();
  });
  it('returns null when secret missing', () => {
    vi.stubEnv('SV_IP_HASH_SECRET', '');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(hashIp('1.2.3.4')).toBeNull();
    err.mockRestore();
  });
});

describe('getClientIp', () => {
  it('takes the first x-forwarded-for entry', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': ' 1.2.3.4 , 5.6.7.8' }))).toBe('1.2.3.4');
  });
  it('returns null when absent', () => {
    expect(getClientIp(new Headers())).toBeNull();
  });
});
