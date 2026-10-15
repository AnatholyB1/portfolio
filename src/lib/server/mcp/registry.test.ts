import { createHash, createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineTool, describeTool, inputSchemaFor, runTool } from './registry';
import { confirmTwoStep } from './testing';

const audit = vi.fn();
beforeEach(() => {
  process.env.MCP_AUDIT_SECRET = 'test-audit-secret';
  audit.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.useRealTimers());
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
  it('requires confirmation on destructive tools and returns the preview with a token', async () => {
    const r = await runTool(danger, { id: 'a' }, ctx, principal, audit);
    expect(r).toEqual({ ok: true, needsConfirmation: true, preview: { willErase: 'a' }, previewToken: expect.any(String) });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ tool: 'erase', outcome: 'needs_confirmation' }));
  });
  it('executes destructive tools only with confirm=true and the preview token', async () => {
    const r = await confirmTwoStep(danger, { id: 'a' }, ctx, principal, audit);
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
  it('records a digest of the validated input without confirm or token, never raw args', async () => {
    await confirmTwoStep(danger, { id: 'a' }, ctx, principal, audit);
    const expected = createHmac('sha256', 'test-audit-secret').update('{"id":"a"}').digest('hex');
    const calls = audit.mock.calls.map((c) => c[0]);
    expect(calls.map((e) => e.outcome)).toEqual(['needs_confirmation', 'attempt', 'ok']);
    for (const e of calls) {
      expect(e.argsDigest).toBe(expected);
      expect(JSON.stringify(e)).not.toContain('"a"');
    }
  });
  it('derives the HMAC key from the service key when MCP_AUDIT_SECRET is unset', async () => {
    delete process.env.MCP_AUDIT_SECRET;
    const prev = process.env.SUPABASE_SECRET_KEY;
    process.env.SUPABASE_SECRET_KEY = 'service-key';
    try {
      await confirmTwoStep(danger, { id: 'a' }, ctx, principal, audit);
      const key = createHash('sha256').update('mcp-audit:service-key').digest();
      expect(audit.mock.calls[1][0].argsDigest).toBe(createHmac('sha256', key).update('{"id":"a"}').digest('hex'));
    } finally {
      if (prev === undefined) delete process.env.SUPABASE_SECRET_KEY;
      else process.env.SUPABASE_SECRET_KEY = prev;
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
    const run = vi.fn(async () => 1);
    const t = defineTool({ name: 'x', description: 'd', covers: [], destructive: true, input: z.object({}), preview: async () => ({}), run });
    const first = await runTool(t, {}, ctx, principal, audit);
    audit.mockRejectedValue(new Error('db down'));
    expect(await runTool(t, { confirm: true, previewToken: (first as { previewToken: string }).previewToken }, ctx, principal, audit)).toEqual({ ok: false, error: 'audit_unavailable' });
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
      defineTool({ name: 'c', description: 'd', covers: [], destructive: true, input: z.object({ confirm: z.string() }), preview: async () => ({}), run: async () => 1 }),
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

describe('preview token contract', () => {
  const run = vi.fn(async (_c: unknown, i: { id: string }) => ({ erased: i.id }));
  let state = 'v1';
  const guarded = defineTool({
    name: 'guarded', description: 'd', covers: [], destructive: true,
    input: z.object({ id: z.string() }),
    preview: async (_c, i) => ({ willErase: i.id, state, volatileAt: Math.random() }),
    pin: (p) => ({ willErase: (p as { willErase: string }).willErase, state: (p as { state: string }).state }),
    run,
  });
  const other = defineTool({
    name: 'other', description: 'd', covers: [], destructive: true,
    input: z.object({ id: z.string() }),
    preview: async (_c, i) => ({ willErase: i.id, state }),
    run: async () => ({ other: true }),
  });
  const token = async (tool: typeof guarded, input: object = { id: 'a' }) => {
    const r = await runTool(tool, input, ctx, principal, audit);
    return (r as { previewToken: string }).previewToken;
  };
  beforeEach(() => {
    state = 'v1';
    run.mockClear();
  });

  it('returns a previewToken with the preview and never runs on the first call', async () => {
    const r = await runTool(guarded, { id: 'a' }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true, preview: { willErase: 'a' } });
    expect(typeof (r as { previewToken: string }).previewToken).toBe('string');
    expect(run).not.toHaveBeenCalled();
  });
  it('refuses confirm:true on a first call (no token) as invalid_input, without running', async () => {
    expect(await runTool(guarded, { id: 'a', confirm: true }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
    expect(run).not.toHaveBeenCalled();
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: 'error' }));
  });
  it('executes with confirm and the unchanged token, even if volatile preview fields differ (pin)', async () => {
    const t = await token(guarded);
    expect(await runTool(guarded, { id: 'a', confirm: true, previewToken: t }, ctx, principal, audit)).toEqual({ ok: true, data: { erased: 'a' } });
    expect(run).toHaveBeenCalledTimes(1);
  });
  it('without pin the whole preview is digested: a volatile field makes the token stale', async () => {
    const volatile = defineTool({
      name: 'volatile', description: 'd', covers: [], destructive: true,
      input: z.object({ id: z.string() }),
      preview: async () => ({ at: Math.random() }),
      run: async () => 1,
    });
    const r = await runTool(volatile, { id: 'a' }, ctx, principal, audit);
    const tk = (r as { previewToken: string }).previewToken;
    expect(await runTool(volatile, { id: 'a', confirm: true, previewToken: tk }, ctx, principal, audit)).toMatchObject({ ok: false, error: 'preview_stale' });
  });
  it('rejects a forged or altered token as preview_stale without running', async () => {
    const t = await token(guarded);
    const [payload, mac] = t.split('.');
    const flipped = mac.slice(0, -1) + (mac.endsWith('0') ? '1' : '0');
    expect(await runTool(guarded, { id: 'a', confirm: true, previewToken: payload + '.' + flipped }, ctx, principal, audit)).toMatchObject({ ok: false, error: 'preview_stale' });
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const altered = Buffer.from(JSON.stringify({ ...claims, exp: 9999999999999 })).toString('base64url');
    expect(await runTool(guarded, { id: 'a', confirm: true, previewToken: altered + '.' + mac }, ctx, principal, audit)).toMatchObject({ ok: false, error: 'preview_stale' });
    for (const junk of ['x', 'a.b', '.', '']) {
      expect((await runTool(guarded, { id: 'a', confirm: true, previewToken: junk }, ctx, principal, audit)).ok).toBe(false);
    }
    expect(run).not.toHaveBeenCalled();
  });
  it('a token for another input or another tool is stale', async () => {
    const t = await token(guarded, { id: 'a' });
    expect(await runTool(guarded, { id: 'b', confirm: true, previewToken: t }, ctx, principal, audit)).toMatchObject({ ok: false, error: 'preview_stale' });
    expect(await runTool(other, { id: 'a', confirm: true, previewToken: t }, ctx, principal, audit)).toMatchObject({ ok: false, error: 'preview_stale' });
    expect(run).not.toHaveBeenCalled();
  });
  it('an expired token (10 minutes) is stale', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T10:00:00Z'));
    const t = await token(guarded);
    vi.setSystemTime(new Date('2026-10-15T10:09:59Z'));
    expect((await runTool(guarded, { id: 'a', confirm: true, previewToken: t }, ctx, principal, audit)).ok).toBe(true);
    vi.setSystemTime(new Date('2026-10-15T10:10:01Z'));
    expect(await runTool(guarded, { id: 'a', confirm: true, previewToken: t }, ctx, principal, audit)).toMatchObject({ ok: false, error: 'preview_stale' });
  });
  it('state changed between preview and confirm: stale, audited error, run not called, message says to preview again', async () => {
    const t = await token(guarded);
    state = 'v2';
    const r = await runTool(guarded, { id: 'a', confirm: true, previewToken: t }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: false, error: 'preview_stale', message: expect.stringMatching(/aperçu/i) });
    expect(run).not.toHaveBeenCalled();
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ tool: 'guarded', outcome: 'error' }));
    expect(audit.mock.calls.map((c) => c[0].outcome)).not.toContain('attempt');
  });
  it('the token reveals neither raw arguments nor the secret', async () => {
    const t = await token(guarded);
    const payload = Buffer.from(t.split('.')[0], 'base64url').toString();
    expect(payload).not.toContain('"a"');
    expect(payload).not.toContain('test-audit-secret');
    expect(JSON.parse(payload)).toMatchObject({ tool: 'guarded' });
  });
  it('a destructive tool without a preview is refused by defineTool', () => {
    expect(() => defineTool({ name: 'np', description: 'd', covers: [], destructive: true, input: z.object({}), run: async () => 1 })).toThrow(/preview/);
  });
  it('previewToken is reserved on destructive tools', () => {
    expect(() =>
      defineTool({ name: 'pt', description: 'd', covers: [], destructive: true, input: z.object({ previewToken: z.string() }), preview: async () => ({}), run: async () => 1 }),
    ).toThrow(/previewToken/);
  });
  it('exposes confirm and previewToken only on destructive tools, and the description teaches the flow', () => {
    expect(Object.keys(inputSchemaFor(guarded).shape)).toEqual(expect.arrayContaining(['id', 'confirm', 'previewToken']));
    expect(Object.keys(inputSchemaFor(safe).shape)).toEqual([]);
    expect(describeTool(guarded)).toMatch(/previewToken/);
    expect(describeTool(guarded)).toMatch(/inchang/);
    expect(describeTool(safe)).toBe('d');
  });
});
