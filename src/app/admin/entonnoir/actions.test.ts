import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn();
vi.mock('@/lib/server/auth/dal', () => ({ requireAdmin: () => requireAdmin() }));

const upsertAcquisitionCost = vi.fn();
vi.mock('@/lib/server/leads/admin', () => ({
  upsertAcquisitionCost: (...a: unknown[]) => upsertAcquisitionCost(...a),
}));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

const { saveCostAction } = await import('./actions');

const idle = { status: 'idle' as const };
function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
const base = { source: 'google', campaign: 'brand', month: '2026-10', amount: '12,5' };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } });
  upsertAcquisitionCost.mockResolvedValue({ ok: true, data: null });
});

describe('saveCostAction', () => {
  it('propagates requireAdmin rejection without calling the wrapper', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(saveCostAction(idle, form(base))).rejects.toThrow('NOT_FOUND');
    expect(upsertAcquisitionCost).not.toHaveBeenCalled();
  });

  it('calls requireAdmin before the wrapper', async () => {
    await saveCostAction(idle, form(base));
    expect(requireAdmin.mock.invocationCallOrder[0]).toBeLessThan(
      upsertAcquisitionCost.mock.invocationCallOrder[0],
    );
  });

  it('rejects 0', async () => {
    const res = await saveCostAction(idle, form({ ...base, amount: '0' }));
    expect(res).toEqual({
      status: 'error',
      message: 'Saisissez un montant supérieur à 0, avec 2 décimales au plus.',
    });
    expect(upsertAcquisitionCost).not.toHaveBeenCalled();
  });

  it('stores 12,5 as 1250 cents on the first of the month and revalidates', async () => {
    const res = await saveCostAction(idle, form(base));
    expect(res.status).toBe('success');
    expect(upsertAcquisitionCost).toHaveBeenCalledWith(
      'google',
      'brand',
      '2026-10-01',
      1250,
      'admin-1',
    );
    expect(revalidatePath).toHaveBeenCalledWith('/admin/entonnoir');
  });

  it('maps a wrapper error to the generic message', async () => {
    upsertAcquisitionCost.mockResolvedValue({ ok: false, code: 'unknown' });
    const res = await saveCostAction(idle, form(base));
    expect(res).toEqual({
      status: 'error',
      message: 'Une erreur est survenue. Réessayez ou consultez les journaux.',
    });
  });
});
