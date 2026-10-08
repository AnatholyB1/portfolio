import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn();
vi.mock('@/lib/server/auth/dal', () => ({ requireAdmin: () => requireAdmin() }));

const callRpc = vi.fn();
vi.mock('@/lib/server/rpc', () => ({ callRpc: (...a: unknown[]) => callRpc(...a) }));

const sendOutboxRow = vi.fn();
vi.mock('@/lib/server/mail/outbox', () => ({ sendOutboxRow: (id: string) => sendOutboxRow(id) }));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

const { hideReviewAction, unhideReviewAction } = await import('./avis.actions');

const idle = { ok: false, message: null };
const RID = '3f2b8a52-1c4e-4b7a-9d3e-5a6b7c8d9e0f';
const ERR = 'Action impossible. Vérifiez le motif et le détail puis réessayez.';
function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
const hideBase = {
  reviewId: RID,
  reason: 'illegal_content',
  detail: 'Propos injurieux visant un tiers',
};
const unhideBase = { reviewId: RID, detail: 'Erreur de modération corrigée' };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } });
  callRpc.mockResolvedValue({
    ok: true,
    data: { outcome: 'hidden', moderation_id: 1, outbox_ids: ['o1', 'o2'] },
  });
  sendOutboxRow.mockResolvedValue(undefined);
});

describe('hideReviewAction', () => {
  it('never reaches the RPC for a non-admin', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(hideReviewAction(idle, form(hideBase))).rejects.toThrow('NOT_FOUND');
    expect(callRpc).not.toHaveBeenCalled();
  });

  it('hides, sends each outbox row and revalidates', async () => {
    const res = await hideReviewAction(idle, form(hideBase));
    expect(res).toEqual({ ok: true, message: 'Avis masqué. Son auteur est prévenu par e-mail.' });
    expect(callRpc).toHaveBeenCalledWith('admin/avis', 'sv_moderate_review', {
      p_review_id: RID,
      p_action: 'hide',
      p_reason: 'illegal_content',
      p_detail: 'Propos injurieux visant un tiers',
      p_actor_id: 'admin-1',
    });
    expect(sendOutboxRow).toHaveBeenCalledTimes(2);
    expect(sendOutboxRow).toHaveBeenCalledWith('o1');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/avis');
  });

  it('rejects reasons outside the closed legal list without RPC', async () => {
    for (const reason of ['negative', 'low_rating', '']) {
      const res = await hideReviewAction(idle, form({ ...hideBase, reason }));
      expect(res).toEqual({ ok: false, message: ERR });
    }
    expect(callRpc).not.toHaveBeenCalled();
  });

  it('rejects details of 2 or 501 characters without RPC', async () => {
    expect((await hideReviewAction(idle, form({ ...hideBase, detail: 'ab' }))).ok).toBe(false);
    expect(
      (await hideReviewAction(idle, form({ ...hideBase, detail: 'x'.repeat(501) }))).message,
    ).toBe(ERR);
    expect(callRpc).not.toHaveBeenCalled();
  });

  it('still succeeds when sending the notice throws', async () => {
    sendOutboxRow.mockRejectedValue(new Error('smtp'));
    const res = await hideReviewAction(idle, form(hideBase));
    expect(res.ok).toBe(true);
  });

  it('maps unchanged and rpc failure', async () => {
    callRpc.mockResolvedValue({ ok: true, data: { outcome: 'unchanged' } });
    expect(await hideReviewAction(idle, form(hideBase))).toEqual({
      ok: false,
      message: "Aucun changement : l'avis est déjà dans cet état.",
    });
    callRpc.mockResolvedValue({ ok: false, code: 'unknown' });
    expect(await hideReviewAction(idle, form(hideBase))).toEqual({ ok: false, message: ERR });
    expect(sendOutboxRow).not.toHaveBeenCalled();
  });
});

describe('unhideReviewAction', () => {
  beforeEach(() => {
    callRpc.mockResolvedValue({ ok: true, data: { outcome: 'unhidden', outbox_ids: [] } });
  });

  it('calls requireAdmin before callRpc', async () => {
    await unhideReviewAction(idle, form(unhideBase));
    expect(requireAdmin.mock.invocationCallOrder[0]).toBeLessThan(
      callRpc.mock.invocationCallOrder[0],
    );
  });

  it('unhides with a null reason', async () => {
    const res = await unhideReviewAction(idle, form(unhideBase));
    expect(res).toEqual({ ok: true, message: 'Masquage levé.' });
    expect(callRpc).toHaveBeenCalledWith('admin/avis', 'sv_moderate_review', {
      p_review_id: RID,
      p_action: 'unhide',
      p_reason: null,
      p_detail: 'Erreur de modération corrigée',
      p_actor_id: 'admin-1',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/avis');
  });

  it('rejects a short detail and handles unchanged', async () => {
    expect((await unhideReviewAction(idle, form({ ...unhideBase, detail: 'a' }))).ok).toBe(false);
    expect(callRpc).not.toHaveBeenCalled();
    callRpc.mockResolvedValue({ ok: true, data: { outcome: 'unchanged' } });
    const res = await unhideReviewAction(idle, form(unhideBase));
    expect(res.ok).toBe(false);
    expect(res.message).toContain('Aucun changement');
  });
});
