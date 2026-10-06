import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ rpc: { ok: true, data: 'none' } as unknown, args: null as unknown }));
vi.mock('@/lib/server/rpc', () => ({
  callRpc: async (_s: string, _f: string, args: unknown) => {
    state.args = args;
    return state.rpc;
  },
}));

import { blockScope, decideSend } from './suppression';

const base = {
  mailClass: 'marketing' as const,
  recipientKind: 'client' as const,
  template: 'step_changed' as const,
  scope: 'none' as const,
  reviewEnabled: true,
};

describe('decideSend', () => {
  it('flag_off first for review_request', () => {
    expect(
      decideSend({ ...base, template: 'review_request', reviewEnabled: false, scope: 'all' }),
    ).toBe('flag_off');
  });
  it('admin bypasses', () => {
    expect(decideSend({ ...base, recipientKind: 'admin', scope: 'all' })).toBe('ok');
  });
  it('marketing matrix', () => {
    expect(decideSend({ ...base, scope: 'marketing' })).toBe('suppressed');
    expect(decideSend({ ...base, scope: 'all' })).toBe('suppressed');
    expect(decideSend({ ...base, scope: 'none' })).toBe('ok');
    expect(decideSend({ ...base, scope: 'error' })).toBe('suppression_unavailable');
  });
  it('transactional matrix', () => {
    const t = { ...base, mailClass: 'transactional' as const };
    expect(decideSend({ ...t, scope: 'all' })).toBe('suppressed');
    expect(decideSend({ ...t, scope: 'marketing' })).toBe('ok');
    expect(decideSend({ ...t, scope: 'error' })).toBe('ok');
  });
});

describe('blockScope', () => {
  it('normalises the address and returns the scope', async () => {
    state.rpc = { ok: true, data: 'marketing' };
    expect(await blockScope('  User@Example.com ')).toBe('marketing');
    expect(state.args).toEqual({ p_email: 'user@example.com' });
  });
  it('returns error on rpc failure or unexpected value, logging a fixed code', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    state.rpc = { ok: false, code: 'unknown' };
    expect(await blockScope('a@b.co')).toBe('error');
    state.rpc = { ok: true, data: 'weird' };
    expect(await blockScope('a@b.co')).toBe('error');
    expect(spy).toHaveBeenCalledWith('[mail/suppression] lookup_failed');
    spy.mockRestore();
  });
});
