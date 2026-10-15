import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineTool, runTool } from './registry';

const audit = vi.fn();
const ctx = { supabase: {} as never, user: { id: 'u1' } as never };
const principal = { tokenId: 't1', userId: 'u1' };

const safe = defineTool({
  name: 'ping', description: 'd', covers: [], input: z.object({}),
  run: async () => ({ pong: true }),
});
const danger = defineTool({
  name: 'erase', description: 'd', covers: [], destructive: true,
  input: z.object({ id: z.string() }),
  preview: async (_c, i) => ({ willErase: i.id }),
  run: async (_c, i) => ({ erased: i.id }),
});

describe('runTool', () => {
  it('runs safe tools directly', async () => {
    expect(await runTool(safe, {}, ctx, principal, audit)).toEqual({ ok: true, data: { pong: true } });
  });
  it('requires confirm on destructive tools and returns the preview', async () => {
    const r = await runTool(danger, { id: 'a' }, ctx, principal, audit);
    expect(r).toEqual({ ok: true, needsConfirmation: true, preview: { willErase: 'a' } });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ tool: 'erase', outcome: 'needs_confirmation' }));
  });
  it('executes destructive tools only with confirm=true', async () => {
    const r = await runTool(danger, { id: 'a', confirm: true }, ctx, principal, audit);
    expect(r).toEqual({ ok: true, data: { erased: 'a' } });
  });
  it('maps invalid input and thrown errors to ok:false without leaking details', async () => {
    expect((await runTool(danger, {}, ctx, principal, audit)).ok).toBe(false);
    const boom = defineTool({ name: 'b', description: 'd', covers: [], input: z.object({}), run: async () => { throw new Error('secret'); } });
    const r = await runTool(boom, {}, ctx, principal, audit);
    expect(r).toEqual({ ok: false, error: 'tool_failed' });
  });
});
