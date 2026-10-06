import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { currentHold, heldProjectIds, loadReminderHold } = await import('./holds');

describe('currentHold', () => {
  it('is active with no rows', () => {
    expect(currentHold([])).toEqual({ suspended: false, since: null });
  });
  it('latest suspend wins', () => {
    expect(
      currentHold([
        { id: 1, action: 'suspend', created_at: 'a' },
        { id: 2, action: 'resume', created_at: 'b' },
        { id: 3, action: 'suspend', created_at: 'c' },
      ]),
    ).toEqual({ suspended: true, since: 'c' });
  });
  it('latest resume wins', () => {
    expect(
      currentHold([
        { id: 2, action: 'resume', created_at: 'b' },
        { id: 1, action: 'suspend', created_at: 'a' },
      ]),
    ).toEqual({ suspended: false, since: null });
  });
});

describe('heldProjectIds', () => {
  it('keeps only projects whose latest row is suspend', () => {
    const held = heldProjectIds([
      { id: 1, project_id: 'p1', action: 'suspend', created_at: 'a' },
      { id: 2, project_id: 'p1', action: 'resume', created_at: 'b' },
      { id: 3, project_id: 'p2', action: 'suspend', created_at: 'c' },
    ]);
    expect([...held]).toEqual(['p2']);
  });
});

describe('loadReminderHold', () => {
  it('returns null on error', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => Promise.resolve({ data: null, error: { message: 'x' } }),
    };
    const supabase = { from: () => chain } as never;
    expect(await loadReminderHold(supabase, 'p1')).toBeNull();
    err.mockRestore();
  });
  it('derives state from the latest row', async () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () =>
        Promise.resolve({ data: [{ id: 5, action: 'suspend', created_at: 't' }], error: null }),
    };
    const supabase = { from: () => chain } as never;
    expect(await loadReminderHold(supabase, 'p1')).toEqual({ suspended: true, since: 't' });
  });
});
