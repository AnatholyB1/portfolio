import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineTool, runTool } from './registry';

const audit = vi.fn();
beforeEach(() => {
  audit.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
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

describe('runTool hardening', () => {
  it('records a digest of the validated input without confirm, never raw args', async () => {
    await runTool(danger, { id: 'a', confirm: true }, ctx, principal, audit);
    const expected = createHash('sha256').update('{"id":"a"}').digest('hex');
    const calls = audit.mock.calls.map((c) => c[0]);
    expect(calls.map((e) => e.outcome)).toEqual(['attempt', 'ok']);
    for (const e of calls) {
      expect(e.argsDigest).toBe(expected);
      expect(JSON.stringify(e)).not.toContain('"a"');
    }
  });
  it('digest is independent of key order', async () => {
    const two = defineTool({ name: 't', description: 'd', covers: [], input: z.object({ a: z.string(), b: z.string() }), run: async () => 1 });
    await runTool(two, { a: '1', b: '2' }, ctx, principal, audit);
    await runTool(two, { b: '2', a: '1' }, ctx, principal, audit);
    expect(audit.mock.calls[0][0].argsDigest).toBe(audit.mock.calls[1][0].argsDigest);
  });
  it('returns the real data when the audit write fails after a run', async () => {
    audit.mockRejectedValue(new Error('db down'));
    expect(await runTool(safe, {}, ctx, principal, audit)).toEqual({ ok: true, data: { pong: true } });
  });
  it('refuses to run a destructive tool when the attempt cannot be audited', async () => {
    audit.mockRejectedValue(new Error('db down'));
    const run = vi.fn(async () => 1);
    const t = defineTool({ name: 'x', description: 'd', covers: [], destructive: true, input: z.object({}), run });
    expect(await runTool(t, { confirm: true }, ctx, principal, audit)).toEqual({ ok: false, error: 'audit_unavailable' });
    expect(run).not.toHaveBeenCalled();
  });
  it('does not reject when auditing a rejected input fails', async () => {
    audit.mockRejectedValue(new Error('db down'));
    expect(await runTool(danger, {}, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
  });
  it('logs the error message server-side without returning it', async () => {
    const boom = defineTool({ name: 'b', description: 'd', covers: [], input: z.object({}), run: async () => { throw new Error('secret'); } });
    const r = await runTool(boom, {}, ctx, principal, audit);
    expect(JSON.stringify(r)).not.toContain('secret');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('b'), expect.stringContaining('secret'));
  });
  it('rejects a destructive tool whose schema already has confirm', () => {
    expect(() =>
      defineTool({ name: 'c', description: 'd', covers: [], destructive: true, input: z.object({ confirm: z.string() }), run: async () => 1 }),
    ).toThrow(/confirm/);
  });
});


describe('runTool core refusals', () => {
  it('maps a run() result shaped {ok:false,message} to ok:false and audits error', async () => {
    const t = defineTool({
      name: 'refuse', description: 'd', covers: [], input: z.object({}),
      run: async () => ({ ok: false, message: 'Refusé.' }),
    });
    expect(await runTool(t, {}, ctx, principal, audit)).toEqual({ ok: false, error: 'Refusé.' });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ tool: 'refuse', outcome: 'error' }));
  });
  it('keeps {ok:true,message} results as successes', async () => {
    const t = defineTool({
      name: 'fine', description: 'd', covers: [], input: z.object({}),
      run: async () => ({ ok: true, message: 'Fait.' }),
    });
    expect(await runTool(t, {}, ctx, principal, audit)).toEqual({ ok: true, data: { ok: true, message: 'Fait.' } });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: 'ok' }));
  });
});
