import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => ({ callRpc: vi.fn() }));
vi.mock('@/lib/server/rpc', () => rpc);

import { liftSuppressionCore } from './emails';

const ctx = { supabase: {} as never, user: { id: 'admin-1' } as never };
const REASON_MSG = 'Indiquez un motif (3 à 300 caractères).';
const GENERIC_MSG = 'La réactivation a échoué. Réessayez dans un instant.';
const base = { suppressionId: '12', reason: 'Adresse corrigée' };

beforeEach(() => {
  rpc.callRpc.mockReset();
  rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'lifted' } });
});

describe('liftSuppressionCore', () => {
  it.each(['ab', '   a  ', 'x'.repeat(301), ''])('rejects reason %j without calling the RPC', async (reason) => {
    expect(await liftSuppressionCore(ctx, { ...base, reason })).toEqual({ ok: false, message: REASON_MSG });
    expect(rpc.callRpc).not.toHaveBeenCalled();
  });
  it.each(['abc', '', '0', '1234567890123456', '-3', '1.5'])('rejects id %j', async (suppressionId) => {
    const r = await liftSuppressionCore(ctx, { ...base, suppressionId });
    expect(r.ok).toBe(false);
    expect(rpc.callRpc).not.toHaveBeenCalled();
  });
  it('accepts a numeric id (tool input) and lifts with the actor', async () => {
    expect(await liftSuppressionCore(ctx, { suppressionId: 12, reason: 'Adresse corrigée' })).toEqual({
      ok: true,
      message: 'Adresse réactivée.',
    });
    expect(rpc.callRpc).toHaveBeenCalledWith('admin/emails', 'sv_lift_suppression', {
      p_suppression_id: 12,
      p_reason: 'Adresse corrigée',
      p_actor_id: 'admin-1',
    });
  });
  it('trims the id and the reason', async () => {
    await liftSuppressionCore(ctx, { suppressionId: ' 12 ', reason: '  motif ok  ' });
    expect(rpc.callRpc.mock.calls[0][2]).toMatchObject({ p_suppression_id: 12, p_reason: 'motif ok' });
  });
  it('handles already_lifted as ok', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'already_lifted' } });
    expect(await liftSuppressionCore(ctx, base)).toEqual({ ok: true, message: 'Adresse déjà réactivée.' });
  });
  it('maps other outcomes and RPC failure to the generic error', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'not_found' } });
    expect(await liftSuppressionCore(ctx, base)).toEqual({ ok: false, message: GENERIC_MSG });
    rpc.callRpc.mockResolvedValue({ ok: false, code: 'unknown' });
    expect(await liftSuppressionCore(ctx, base)).toEqual({ ok: false, message: GENERIC_MSG });
  });
});
