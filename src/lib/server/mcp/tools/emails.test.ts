import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runTool } from '../registry';

const rpc = vi.hoisted(() => ({ callRpc: vi.fn() }));
const supp = vi.hoisted(() => ({ loadSuppressions: vi.fn() }));
vi.mock('@/lib/server/rpc', () => rpc);
vi.mock('@/lib/server/mail/suppressionAdmin', () => supp);

import { emailTools } from './emails';

const principal = { tokenId: 't1', userId: 'admin-1' };
const audit = vi.fn();

function makeCtx(row: unknown = { email_norm: 'alice@dupont.fr', scope: 'all', cause: 'bounce_permanent' }) {
  const b: Record<string, ReturnType<typeof vi.fn>> = {};
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.maybeSingle = vi.fn(() => Promise.resolve({ data: row, error: null }));
  const from = vi.fn(() => b);
  return { ctx: { supabase: { from } as never, user: { id: 'admin-1' } as never }, from, b };
}
const tool = (name: string) => {
  const t = emailTools.find((x) => x.name === name);
  if (!t) throw new Error(`missing tool ${name}`);
  return t;
};

beforeEach(() => {
  audit.mockReset();
  rpc.callRpc.mockReset();
  supp.loadSuppressions.mockReset();
});

describe('emailTools metadata', () => {
  it('declares exact names, covers and destructive flags', () => {
    expect(Object.fromEntries(emailTools.map((t) => [t.name, t.covers]))).toEqual({
      list_email_suppressions: [],
      lift_email_suppression: ['liftSuppressionAction'],
    });
    expect(emailTools.filter((t) => t.destructive).map((t) => t.name)).toEqual(['lift_email_suppression']);
  });
});

describe('lift_email_suppression', () => {
  const args = { suppressionId: 12, reason: 'Adresse corrigée' };
  it('without confirm never lifts; previews the address class with a masked e-mail', async () => {
    const { ctx, from } = makeCtx();
    const r = await runTool(tool('lift_email_suppression'), args, ctx, principal, audit);
    expect(rpc.callRpc).not.toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith('sv_mail_suppressions');
    expect(r).toMatchObject({ ok: true, needsConfirmation: true });
    const json = JSON.stringify(r);
    expect(json).toContain('a***@d***.fr');
    expect(json).not.toContain('alice@dupont.fr');
    expect(json).toContain('bounce_permanent');
    expect(json).toMatch(/tous les e-mails/i);
  });
  it('previews information-only scope for marketing suppressions', async () => {
    const { ctx } = makeCtx({ email_norm: 'bob@x.fr', scope: 'marketing', cause: 'unsubscribe' });
    const r = await runTool(tool('lift_email_suppression'), args, ctx, principal, audit);
    expect(JSON.stringify(r)).toMatch(/information/i);
  });
  it('with confirm lifts with the actor', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'lifted' } });
    const { ctx } = makeCtx();
    const r = await runTool(tool('lift_email_suppression'), { ...args, confirm: true }, ctx, principal, audit);
    expect(rpc.callRpc).toHaveBeenCalledWith('admin/emails', 'sv_lift_suppression', {
      p_suppression_id: 12,
      p_reason: 'Adresse corrigée',
      p_actor_id: 'admin-1',
    });
    expect(r).toMatchObject({ ok: true, data: { ok: true } });
  });
  it('a core refusal is an audited error', async () => {
    rpc.callRpc.mockResolvedValue({ ok: true, data: { outcome: 'not_found' } });
    const { ctx } = makeCtx();
    const r = await runTool(tool('lift_email_suppression'), { ...args, confirm: true }, ctx, principal, audit);
    expect(r.ok).toBe(false);
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: 'error' }));
  });
});

describe('list_email_suppressions', () => {
  const row = (id: number, email = 'a@b.fr') => ({
    id,
    email,
    causeLabel: 'Plainte (spam)',
    flowsLabel: 'x',
    createdAt: 'd',
    active: true,
    liftReason: null,
    liftedAt: null,
  });
  it('reads through loadSuppressions with the RLS client and masks addresses', async () => {
    supp.loadSuppressions.mockResolvedValue([row(1, 'alice@dupont.fr')]);
    const { ctx } = makeCtx();
    const r = await runTool(tool('list_email_suppressions'), { page: 2, limit: 10 }, ctx, principal, audit);
    expect(supp.loadSuppressions).toHaveBeenCalledWith(ctx.supabase, { from: 10, to: 20 });
    const json = JSON.stringify(r);
    expect(json).toContain('a***@d***.fr');
    expect(json).not.toContain('alice@dupont.fr');
    expect(r).toMatchObject({ ok: true, data: { page: 2, hasNext: false } });
  });
  it('reports hasNext and trims the extra row', async () => {
    supp.loadSuppressions.mockResolvedValue([row(1), row(2), row(3)]);
    const { ctx } = makeCtx();
    const r = await runTool(tool('list_email_suppressions'), { limit: 2 }, ctx, principal, audit);
    expect(r).toMatchObject({ ok: true, data: { hasNext: true } });
    expect((r as { data: { suppressions: unknown[] } }).data.suppressions).toHaveLength(2);
  });
  it('fails when the read fails', async () => {
    supp.loadSuppressions.mockResolvedValue(null);
    const { ctx } = makeCtx();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await runTool(tool('list_email_suppressions'), {}, ctx, principal, audit)).toEqual({ ok: false, error: 'tool_failed' });
  });
});
