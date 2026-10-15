import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { defineTool, runTool } from './registry';

const audit = vi.fn();
beforeEach(() => {
  process.env.MCP_AUDIT_SECRET = 'test-audit-secret';
  audit.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
const ctx = { supabase: {} as never, user: { id: 'u1' } as never };
const principal = { tokenId: 't1', userId: 'u1' };

describe('runTool robustness (review)', () => {
  const run = vi.fn(async () => ({ done: true }));
  const withPreview = (preview: () => Promise<unknown>) =>
    defineTool({ name: 'rb', description: 'd', covers: [], destructive: true, input: z.object({ id: z.string() }), preview, run });
  beforeEach(() => run.mockClear());

  it('confirm:false behaves like an omitted confirm and returns the preview', async () => {
    const t = withPreview(async () => ({ ok: 1 }));
    expect(await runTool(t, { id: 'a', confirm: false }, ctx, principal, audit)).toMatchObject({ ok: true, needsConfirmation: true, preview: { ok: 1 } });
    expect(run).not.toHaveBeenCalled();
  });
  it('confirm:false with a token still does not run', async () => {
    const t = withPreview(async () => ({ ok: 1 }));
    const first = (await runTool(t, { id: 'a' }, ctx, principal, audit)) as { previewToken: string };
    const r = await runTool(t, { id: 'a', confirm: false, previewToken: first.previewToken }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, needsConfirmation: true });
    expect(run).not.toHaveBeenCalled();
  });
  it('non-boolean confirm is still invalid_input', async () => {
    const t = withPreview(async () => ({}));
    expect(await runTool(t, { id: 'a', confirm: 'yes' }, ctx, principal, audit)).toEqual({ ok: false, error: 'invalid_input' });
  });
  it('a preview with a Date, Map, Set or class instance is refused (no token), not silently digested', async () => {
    class Box { x = 1; }
    for (const bad of [new Date(), new Map(), new Set(), new Box()]) {
      const r = await runTool(withPreview(async () => ({ v: bad })), { id: 'a' }, ctx, principal, audit);
      expect(r).toEqual({ ok: false, error: 'tool_failed' });
    }
  });
  it('a preview with undefined array items is refused while null items are fine', async () => {
    expect(await runTool(withPreview(async () => ({ v: [undefined] })), { id: 'a' }, ctx, principal, audit)).toEqual({ ok: false, error: 'tool_failed' });
    expect(await runTool(withPreview(async () => ({ v: [null] })), { id: 'a' }, ctx, principal, audit)).toMatchObject({ ok: true, needsConfirmation: true });
  });
  it('plain objects without prototype and undefined object properties are accepted', async () => {
    const bare = Object.create(null) as Record<string, unknown>;
    bare.k = 1;
    expect(await runTool(withPreview(async () => ({ v: bare, w: undefined })), { id: 'a' }, ctx, principal, audit)).toMatchObject({ ok: true, needsConfirmation: true });
  });
  it('logs only the tool name and the error name, plus a short code, never the message', async () => {
    const boom = defineTool({
      name: 'pii', description: 'd', covers: [], input: z.object({}),
      run: async () => { throw Object.assign(new Error('Key (email)=(jean@exemple.fr) already exists'), { code: '23505' }); },
    });
    await runTool(boom, {}, ctx, principal, audit);
    const logged = JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls);
    expect(logged).toContain('pii');
    expect(logged).toContain('Error');
    expect(logged).toContain('23505');
    expect(logged).not.toContain('jean@exemple.fr');
    expect(logged).not.toContain('already exists');
  });
  it('drops a code that is not short and PII-free', async () => {
    const boom = defineTool({
      name: 'pii2', description: 'd', covers: [], input: z.object({}),
      run: async () => { throw Object.assign(new Error('x'), { code: 'jean@exemple.fr dupe' }); },
    });
    await runTool(boom, {}, ctx, principal, audit);
    expect(JSON.stringify((console.error as unknown as { mock: { calls: unknown[] } }).mock.calls)).not.toContain('jean@exemple.fr');
  });
});
