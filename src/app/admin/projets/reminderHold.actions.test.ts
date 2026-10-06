import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn();
vi.mock('@/lib/server/auth/dal', () => ({ requireAdmin: () => requireAdmin() }));

const callRpc = vi.fn();
vi.mock('@/lib/server/rpc', () => ({ callRpc: (...a: unknown[]) => callRpc(...a) }));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

const { setReminderHoldAction } = await import('./reminderHold.actions');

const idle = { ok: false, message: null };
const PID = '3f2b8a52-1c4e-4b7a-9d3e-5a6b7c8d9e0f';
function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
const base = { projectId: PID, action: 'suspend' };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } });
  callRpc.mockResolvedValue({ ok: true, data: { outcome: 'suspended', skipped: 2 } });
});

describe('setReminderHoldAction', () => {
  it('never reaches the RPC for a non-admin', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(setReminderHoldAction(idle, form(base))).rejects.toThrow('NOT_FOUND');
    expect(callRpc).not.toHaveBeenCalled();
  });

  it('calls requireAdmin before callRpc', async () => {
    await setReminderHoldAction(idle, form(base));
    expect(requireAdmin.mock.invocationCallOrder[0]).toBeLessThan(
      callRpc.mock.invocationCallOrder[0],
    );
  });

  it('rejects invalid uuid or action without RPC', async () => {
    expect((await setReminderHoldAction(idle, form({ ...base, projectId: 'nope' }))).ok).toBe(false);
    expect((await setReminderHoldAction(idle, form({ ...base, action: 'delete' }))).ok).toBe(false);
    expect(callRpc).not.toHaveBeenCalled();
  });

  it('suspends with the actor id and revalidates', async () => {
    const res = await setReminderHoldAction(idle, form(base));
    expect(res).toEqual({ ok: true, message: 'Relances suspendues.' });
    expect(callRpc).toHaveBeenCalledWith('admin/projets', 'sv_set_reminder_hold', {
      p_project_id: PID,
      p_action: 'suspend',
      p_actor_id: 'admin-1',
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/projets/${PID}`);
  });

  it('maps resumed and unchanged', async () => {
    callRpc.mockResolvedValue({ ok: true, data: { outcome: 'resumed' } });
    expect((await setReminderHoldAction(idle, form({ ...base, action: 'resume' }))).message).toBe(
      'Relances reprises.',
    );
    callRpc.mockResolvedValue({ ok: true, data: { outcome: 'unchanged' } });
    expect((await setReminderHoldAction(idle, form(base))).message).toBe('Aucun changement.');
  });

  it('returns a generic error on RPC failure', async () => {
    callRpc.mockResolvedValue({ ok: false, code: 'unknown' });
    const res = await setReminderHoldAction(idle, form(base));
    expect(res.ok).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
