/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { deriveReviewToken, hashReviewToken } from '@/lib/reviews/token';
import { ensureReviewLink } from './links';

const SECRET = 'x'.repeat(40);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const adminWith = (rpc: any) => ({ rpc }) as any;

describe('ensureReviewLink', () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('calls the rpc with a uuid and the hash of the derived token', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { outcome: 'created', link_id: 'L1' }, error: null });
    expect(await ensureReviewLink(adminWith(rpc), 'p1', SECRET)).toBe('L1');
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe('sv_ensure_review_link');
    expect(args.p_project_id).toBe('p1');
    expect(args.p_link_id).toMatch(UUID_RE);
    expect(args.p_token_hash).toBe(hashReviewToken(deriveReviewToken(args.p_link_id, SECRET)));
  });

  it('returns the existing link id', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { outcome: 'existing', link_id: 'L0' }, error: null });
    expect(await ensureReviewLink(adminWith(rpc), 'p1', SECRET)).toBe('L0');
  });

  it.each(['reviewed', 'not_signed', 'expired'])('returns null for %s', async (outcome) => {
    const rpc = vi.fn().mockResolvedValue({ data: { outcome, link_id: null }, error: null });
    expect(await ensureReviewLink(adminWith(rpc), 'p1', SECRET)).toBeNull();
  });

  it('returns null on rpc error or throw, with a fixed log', async () => {
    const e = vi.fn().mockResolvedValue({ data: null, error: { message: 'secret-token' } });
    expect(await ensureReviewLink(adminWith(e), 'p1', SECRET)).toBeNull();
    const t = vi.fn().mockRejectedValue(new Error('boom'));
    expect(await ensureReviewLink(adminWith(t), 'p1', SECRET)).toBeNull();
    expect(errSpy).toHaveBeenCalledWith('[reviews/links] ensure_failed');
    expect(JSON.stringify(errSpy.mock.calls)).not.toContain('secret-token');
  });
});
