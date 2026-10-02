import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserById = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ auth: { admin: { getUserById } } }),
}));

import { getClientStatuses } from './status';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getClientStatuses', () => {
  it('returns Invité when never signed in and a dated label otherwise', async () => {
    getUserById.mockImplementation(async (id: string) => ({
      data: { user: { id, last_sign_in_at: id === 'u2' ? '2026-03-05T10:00:00Z' : null } },
      error: null,
    }));
    const m = await getClientStatuses(['u1', 'u2', 'u1', '']);
    expect(m.get('u1')).toBe('Invité');
    expect(m.get('u2')).toBe('Connecté le 05/03/2026');
    expect(getUserById).toHaveBeenCalledTimes(2);
  });

  it('omits users whose lookup fails', async () => {
    getUserById.mockResolvedValue({ data: { user: null }, error: { message: 'x' } });
    const m = await getClientStatuses(['u1']);
    expect(m.size).toBe(0);
  });

  it('does nothing for an empty list', async () => {
    expect((await getClientStatuses([])).size).toBe(0);
    expect(getUserById).not.toHaveBeenCalled();
  });
});
