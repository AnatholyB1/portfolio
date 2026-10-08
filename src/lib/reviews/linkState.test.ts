import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: h.rpc }) }));

import { getReviewLinkState } from './linkState';
import { hashReviewToken } from './token';

beforeEach(() => vi.clearAllMocks());

describe('getReviewLinkState', () => {
  it('malformed token -> invalid, no rpc', async () => {
    expect(await getReviewLinkState('bad<token')).toEqual({ state: 'invalid' });
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it('valid payload is mapped and hash is sent', async () => {
    h.rpc.mockResolvedValue({
      data: { state: 'valid', project_title: 'Site vitrine', company_name: 'Acme' },
      error: null,
    });
    expect(await getReviewLinkState('abc_DEF-123')).toEqual({
      state: 'valid',
      projectTitle: 'Site vitrine',
      companyName: 'Acme',
    });
    expect(h.rpc).toHaveBeenCalledWith('sv_review_link_state', { p_token_hash: hashReviewToken('abc_DEF-123') });
  });

  it('other states, errors and throws -> invalid', async () => {
    h.rpc.mockResolvedValue({ data: { state: 'used' }, error: null });
    expect(await getReviewLinkState('abc')).toEqual({ state: 'invalid' });
    h.rpc.mockResolvedValue({ data: null, error: { message: 'x' } });
    expect(await getReviewLinkState('abc')).toEqual({ state: 'invalid' });
    h.rpc.mockRejectedValue(new Error('x'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await getReviewLinkState('abc')).toEqual({ state: 'invalid' });
  });
});
