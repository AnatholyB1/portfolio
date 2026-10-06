import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn();
vi.mock('@/lib/server/auth/dal', () => ({ requireAdmin: () => requireAdmin() }));

const callRpc = vi.fn();
vi.mock('@/lib/server/rpc', () => ({ callRpc: (...a: unknown[]) => callRpc(...a) }));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

const { liftSuppressionAction } = await import('./actions');

const idle = { ok: false, message: null };
function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
const base = { suppressionId: '12', reason: 'Adresse corrigée' };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } });
  callRpc.mockResolvedValue({ ok: true, data: { outcome: 'lifted' } });
});

describe('liftSuppressionAction', () => {
  it('never reaches the RPC for a non-admin', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(liftSuppressionAction(idle, form(base))).rejects.toThrow('NOT_FOUND');
    expect(callRpc).not.toHaveBeenCalled();
  });

  it('calls requireAdmin before callRpc', async () => {
    await liftSuppressionAction(idle, form(base));
    expect(requireAdmin.mock.invocationCallOrder[0]).toBeLessThan(
      callRpc.mock.invocationCallOrder[0],
    );
  });

  it.each(['ab', '   a  ', 'x'.repeat(301), ''])('rejects reason %j', async (reason) => {
    const res = await liftSuppressionAction(idle, form({ ...base, reason }));
    expect(res).toEqual({ ok: false, message: 'Indiquez un motif (3 à 300 caractères).' });
    expect(callRpc).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric id', async () => {
    const res = await liftSuppressionAction(idle, form({ ...base, suppressionId: 'abc' }));
    expect(res.ok).toBe(false);
    expect(callRpc).not.toHaveBeenCalled();
  });

  it('lifts with the actor id and revalidates', async () => {
    const res = await liftSuppressionAction(idle, form(base));
    expect(res).toEqual({ ok: true, message: 'Adresse réactivée.' });
    expect(callRpc).toHaveBeenCalledWith('admin/emails', 'sv_lift_suppression', {
      p_suppression_id: 12,
      p_reason: 'Adresse corrigée',
      p_actor_id: 'admin-1',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/emails');
  });

  it('handles already_lifted', async () => {
    callRpc.mockResolvedValue({ ok: true, data: { outcome: 'already_lifted' } });
    const res = await liftSuppressionAction(idle, form(base));
    expect(res).toEqual({ ok: true, message: 'Adresse déjà réactivée.' });
  });

  it('maps not_found and RPC failure to a generic error', async () => {
    callRpc.mockResolvedValue({ ok: true, data: { outcome: 'not_found' } });
    expect((await liftSuppressionAction(idle, form(base))).ok).toBe(false);
    callRpc.mockResolvedValue({ ok: false, code: 'unknown' });
    expect((await liftSuppressionAction(idle, form(base))).ok).toBe(false);
  });
});
